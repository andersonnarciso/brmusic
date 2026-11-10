'use strict';

/**
 * BR Music: processo principal do Electron (desktop).
 *
 * Responsabilidades:
 *   1. Subir o backend local (server/index.mjs) em uma porta livre do loopback.
 *   2. Criar a janela principal (1440x900, min 1024x680, fundo escuro #08090a).
 *   3. Carregar o build estático do Vite via file:// em produção e o dev server
 *      (http://127.0.0.1:4321) em desenvolvimento.
 *   4. Expor um menu nativo em PT-BR que navega no renderer por hash.
 *   5. Oferecer via IPC um punhado de ações de sistema (salvar áudio, escolher
 *      pasta, abrir no explorador de arquivos, escrever arquivo, informações).
 *
 * O app é 100% local: nenhuma requisição sai do computador, a não ser as que
 * o usuário configura (APIs de LLM) em Configurações.
 */

const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const net = require('node:net');
const { fork } = require('node:child_process');

const APP_NAME = 'BR Music';
const IS_DEV = !app.isPackaged;
const DEV_URL = process.env.BRMUSIC_DEV_URL || 'http://127.0.0.1:4321';
const DEV_BACKEND_PORT = Number(process.env.BRMUSIC_BACKEND_PORT || 4399);
const INDEX_HTML = path.join(__dirname, '..', 'dist', 'index.html');
const PRELOAD = path.join(__dirname, 'preload.cjs');
const BACKGROUND = '#08090a';

let mainWindow = null;
let backendProcess = null;
let apiUrl = null;

/* ------------------------------------------------------------------ */
/* Backend local                                                       */
/* ------------------------------------------------------------------ */

/** Caminho real do backend, dentro do asar ele não pode ser executado. */
function backendEntryPath() {
  const appPath = app.getAppPath();
  if (appPath.includes('app.asar')) {
    return path.join(appPath, '..', 'app.asar.unpacked', 'server', 'index.mjs');
  }
  return path.join(appPath, 'server', 'index.mjs');
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

async function waitForBackend(url, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${url}/api/health`);
      if (response.ok) return true;
    } catch {
      /* ainda subindo */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

/**
 * Sobe o backend local do BR Music (API de configuração + proxy de geração).
 * Sem ele, o app desktop funciona, mas o painel de configuração não consegue
 * falar com as APIs de LLM do usuário.
 */
async function startBackend() {
  const entry = backendEntryPath();
  if (!fsSync.existsSync(entry)) {
    console.warn('[BR Music] backend não encontrado em', entry);
    return null;
  }

  const port = IS_DEV ? DEV_BACKEND_PORT : await findFreePort();
  const dataDir = path.join(app.getPath('userData'), 'data');

  try {
    backendProcess = fork(entry, [], {
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        PORT: String(port),
        BRMUSIC_DATA_DIR: dataDir,
      },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
  } catch (error) {
    console.error('[BR Music] falha ao iniciar o backend:', error);
    return null;
  }

  backendProcess.stdout?.on('data', (chunk) => process.stdout.write(`[api] ${chunk}`));
  backendProcess.stderr?.on('data', (chunk) => process.stderr.write(`[api] ${chunk}`));
  backendProcess.on('exit', (code) => {
    console.warn('[BR Music] backend encerrado (code', code, ')');
    backendProcess = null;
  });

  const url = `http://127.0.0.1:${port}`;
  const ready = await waitForBackend(url);
  if (!ready) {
    console.error('[BR Music] backend não respondeu a tempo');
    return null;
  }
  console.log('[BR Music] backend em', url, '· dados em', dataDir);
  return url;
}

function stopBackend() {
  if (backendProcess) {
    try {
      backendProcess.kill();
    } catch {
      /* ignore */
    }
    backendProcess = null;
  }
}

/* ------------------------------------------------------------------ */
/* Janela                                                              */
/* ------------------------------------------------------------------ */

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    backgroundColor: BACKGROUND,
    title: APP_NAME,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    autoHideMenuBar: false,
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      sandbox: true,
      spellcheck: false,
      webSecurity: true,
      additionalArguments: apiUrl ? [`--brmusic-api-url=${apiUrl}`] : [],
    },
  });

  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
  });

  if (IS_DEV) {
    mainWindow.loadURL(DEV_URL);
  } else {
    mainWindow.loadFile(INDEX_HTML);
  }

  // Links externos abrem no navegador padrão, nunca dentro da janela do app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const current = mainWindow.webContents.getURL();
    if (url !== current && /^https?:\/\//i.test(url) && !IS_DEV) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

/* ------------------------------------------------------------------ */
/* Navegação a partir do menu nativo                                   */
/* ------------------------------------------------------------------ */

/**
 * Navega no renderer trocando o hash (a app usa hash router).
 * A navegação acontece por executeJavaScript, nunca via loadURL, que
 * recarregaria a página inteira e perderia o estado do app.
 */
function navigateTo(route) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const contents = mainWindow.webContents;
  const hash = `#${route}`;
  try {
    const result = contents.executeJavaScript(
      `window.location.hash = ${JSON.stringify(hash)};`,
      true,
    );
    if (result && typeof result.catch === 'function') {
      result.catch((error) => console.error('[BR Music] falha ao navegar:', error));
    }
  } catch (error) {
    console.error('[BR Music] falha ao navegar:', error);
  }
  try {
    contents.send('navigate', route);
  } catch (error) {
    console.error('[BR Music] falha ao emitir navigate:', error);
  }
}

/* ------------------------------------------------------------------ */
/* Menu nativo (bilingue)                                             */
/* ------------------------------------------------------------------ */

/**
 * Rotulos do menu nativo em ingles (principal) e portugues (secundario).
 * O renderer avisa o processo principal quando o idioma muda e o menu e
 * reconstruido na hora.
 */
const MENU_LABELS = {
  en: {
    track: 'Track',
    newTrack: 'New track',
    currentTrack: 'Current track',
    discover: 'Discover',
    explore: 'Explore',
    quit: 'Quit BR Music',
    create: 'Create',
    createTrack: 'Create track',
    notifications: 'Notifications',
    labs: 'Labs',
    library: 'Library',
    myTracks: 'My tracks',
    playlists: 'Playlists',
    downloadApp: 'Download the app',
    studio: 'Studio',
    settings: 'Settings',
    connectApi: 'Connect an API',
    help: 'Help',
    about: 'About BR Music',
    aboutDetail: 'AI music generator, version {version}.',
    close: 'Close',
    openDataFolder: 'Open data folder',
  },
  pt: {
    track: 'Faixa',
    newTrack: 'Nova Faixa',
    currentTrack: 'Faixa Atual',
    discover: 'Descobrir',
    explore: 'Explorar',
    quit: 'Sair do BR Music',
    create: 'Criar',
    createTrack: 'Criar Faixa',
    notifications: 'Notificações',
    labs: 'Labs',
    library: 'Biblioteca',
    myTracks: 'Minhas Faixas',
    playlists: 'Playlists',
    downloadApp: 'Baixar o App',
    studio: 'Studio',
    settings: 'Configurações',
    connectApi: 'Conectar uma API',
    help: 'Ajuda',
    about: 'Sobre o BR Music',
    aboutDetail: 'Gerador de músicas com IA, versão {version}.',
    close: 'Fechar',
    openDataFolder: 'Abrir Pasta de Dados',
  },
};

let currentLanguage = 'en';

function labels() {
  return MENU_LABELS[currentLanguage] || MENU_LABELS.en;
}

function buildMenu() {
  const l = labels();
  /** @type {import('electron').MenuItemConstructorOptions[]} */
  const template = [
    {
      label: l.track,
      submenu: [
        { label: l.newTrack, accelerator: 'CmdOrCtrl+N', click: () => navigateTo('/create') },
        { label: l.currentTrack, click: () => navigateTo('/studio') },
        { type: 'separator' },
        { label: l.discover, click: () => navigateTo('/discover') },
        { label: l.explore, click: () => navigateTo('/explore') },
        { type: 'separator' },
        { role: 'quit', label: l.quit },
      ],
    },
    {
      label: l.create,
      submenu: [
        { label: l.createTrack, accelerator: 'CmdOrCtrl+Shift+N', click: () => navigateTo('/create') },
        { label: l.notifications, click: () => navigateTo('/notifications') },
        { label: l.labs, click: () => navigateTo('/labs') },
      ],
    },
    {
      label: l.library,
      submenu: [
        { label: l.myTracks, accelerator: 'CmdOrCtrl+L', click: () => navigateTo('/me') },
        { label: l.playlists, click: () => navigateTo('/me') },
        { label: l.downloadApp, click: () => navigateTo('/downloads') },
      ],
    },
    {
      label: l.studio,
      submenu: [
        { label: l.studio, accelerator: 'CmdOrCtrl+Shift+S', click: () => navigateTo('/studio') },
        { label: l.discover, click: () => navigateTo('/discover') },
        { label: l.explore, click: () => navigateTo('/explore') },
      ],
    },
    {
      label: l.settings,
      submenu: [
        { label: l.settings, accelerator: 'CmdOrCtrl+,', click: () => navigateTo('/more') },
        { label: l.connectApi, click: () => navigateTo('/admin') },
      ],
    },
    {
      label: l.help,
      submenu: [
        {
          label: l.about,
          click: () => {
            void dialog.showMessageBox({
              type: 'info',
              title: l.about,
              message: 'BR Music',
              detail: `${l.aboutDetail.replace('{version}', app.getVersion())}\nElectron ${process.versions.electron}.`,
              buttons: [l.close],
            });
          },
        },
        {
          label: l.openDataFolder,
          click: () => {
            void shell.openPath(app.getPath('userData'));
          },
        },
      ],
    },
  ];

  // No macOS o primeiro menu é o menu do app (padrão do HIG).
  if (process.platform === 'darwin') {
    template.unshift({
      label: APP_NAME,
      submenu: [
        { role: 'about', label: l.about },
        { type: 'separator' },
        { role: 'hide', label: currentLanguage === 'en' ? 'Hide BR Music' : 'Ocultar BR Music' },
        { role: 'hideOthers', label: currentLanguage === 'en' ? 'Hide Others' : 'Ocultar Outros' },
        { role: 'unhide', label: currentLanguage === 'en' ? 'Show All' : 'Mostrar Todos' },
        { type: 'separator' },
        { role: 'quit', label: l.quit },
      ],
    });
  }

  return Menu.buildFromTemplate(template);
}

/** Troca o idioma do menu nativo e o reconstrói na hora. */
function setMenuLanguage(language) {
  if (language !== 'en' && language !== 'pt') return;
  if (language === currentLanguage) return;
  currentLanguage = language;
  Menu.setApplicationMenu(buildMenu());
}

/* ------------------------------------------------------------------ */
/* IPC                                                                 */
/* ------------------------------------------------------------------ */

function timestampSlug() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function registerIpcHandlers() {
  ipcMain.handle('app:info', () => ({
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    electron: process.versions.electron,
    node: process.versions.node,
    isPackaged: app.isPackaged,
    language: currentLanguage,
  }));

  ipcMain.handle('menu:language', (_event, language) => {
    setMenuLanguage(language);
    return currentLanguage;
  });

  ipcMain.handle('dialog:saveAudio', async (event, options) => {
    const opts = options && typeof options === 'object' ? options : {};
    const defaultName =
      typeof opts.defaultName === 'string' && opts.defaultName.trim()
        ? opts.defaultName.trim()
        : `br-music-${timestampSlug()}.wav`;

    const dialogOptions = {
      title: 'Salvar áudio',
      defaultPath: defaultName,
      filters: [
        { name: 'Áudio WAV', extensions: ['wav'] },
        { name: 'Todos os arquivos', extensions: ['*'] },
      ],
    };

    const win = BrowserWindow.fromWebContents(event.sender);
    const result = win
      ? await dialog.showSaveDialog(win, dialogOptions)
      : await dialog.showSaveDialog(dialogOptions);

    return result.canceled ? null : result.filePath;
  });

  ipcMain.handle('dialog:chooseFolder', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const options = {
      title: 'Escolher pasta',
      properties: ['openDirectory', 'createDirectory'],
    };
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options);

    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('shell:openPath', async (_event, targetPath) => {
    if (typeof targetPath !== 'string' || targetPath.trim() === '') {
      return { ok: false, error: 'Caminho inválido.' };
    }
    try {
      const error = await shell.openPath(targetPath);
      if (error) return { ok: false, error };
      return { ok: true, path: targetPath };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('files:write', async (_event, payload) => {
    try {
      const body = payload && typeof payload === 'object' ? payload : {};
      const targetPath = body.path;
      const dataBase64 = body.dataBase64;

      if (typeof targetPath !== 'string' || targetPath.trim() === '') {
        throw new Error('Caminho de destino é obrigatório.');
      }
      if (!path.isAbsolute(targetPath)) {
        throw new Error('O caminho de destino deve ser absoluto.');
      }
      if (typeof dataBase64 !== 'string' || dataBase64 === '') {
        throw new Error('Conteúdo em base64 é obrigatório.');
      }

      const buffer = Buffer.from(dataBase64, 'base64');
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.writeFile(targetPath, buffer);
      return { ok: true, path: targetPath };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
}

/* ------------------------------------------------------------------ */
/* Ciclo de vida                                                       */
/* ------------------------------------------------------------------ */

app.setName(APP_NAME);

app.whenReady().then(async () => {
  registerIpcHandlers();
  Menu.setApplicationMenu(buildMenu());
  apiUrl = await startBackend();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  stopBackend();
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', stopBackend);
