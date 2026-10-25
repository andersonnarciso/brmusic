'use strict';

/**
 * BR Music — processo principal do Electron (desktop).
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

/** Caminho real do backend — dentro do asar ele não pode ser executado. */
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
 * A navegação acontece por executeJavaScript — nunca via loadURL, que
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
/* Menu nativo (PT-BR)                                                 */
/* ------------------------------------------------------------------ */

function buildMenu() {
  /** @type {import('electron').MenuItemConstructorOptions[]} */
  const template = [
    {
      label: 'Faixa',
      submenu: [
        { label: 'Nova Faixa', accelerator: 'CmdOrCtrl+N', click: () => navigateTo('/create') },
        { label: 'Faixa Atual', click: () => navigateTo('/studio') },
        { type: 'separator' },
        { label: 'Descobrir', click: () => navigateTo('/discover') },
        { label: 'Explorar', click: () => navigateTo('/explore') },
        { type: 'separator' },
        { role: 'quit', label: 'Sair do BR Music' },
      ],
    },
    {
      label: 'Criar',
      submenu: [
        { label: 'Criar Faixa', accelerator: 'CmdOrCtrl+Shift+N', click: () => navigateTo('/create') },
        { label: 'Notificações', click: () => navigateTo('/notifications') },
        { label: 'Labs', click: () => navigateTo('/labs') },
      ],
    },
    {
      label: 'Biblioteca',
      submenu: [
        { label: 'Minhas Faixas', accelerator: 'CmdOrCtrl+L', click: () => navigateTo('/me') },
        { label: 'Playlists', click: () => navigateTo('/me') },
        { label: 'Baixar o App', click: () => navigateTo('/downloads') },
      ],
    },
    {
      label: 'Studio',
      submenu: [
        { label: 'Studio', accelerator: 'CmdOrCtrl+Shift+S', click: () => navigateTo('/studio') },
        { label: 'Descobrir', click: () => navigateTo('/discover') },
        { label: 'Explorar', click: () => navigateTo('/explore') },
      ],
    },
    {
      label: 'Configurações',
      submenu: [
        { label: 'Configurações', accelerator: 'CmdOrCtrl+,', click: () => navigateTo('/more') },
        { label: 'Conectar uma API', click: () => navigateTo('/admin') },
      ],
    },
    {
      label: 'Ajuda',
      submenu: [
        {
          label: 'Sobre o BR Music',
          click: () => {
            void dialog.showMessageBox({
              type: 'info',
              title: 'Sobre o BR Music',
              message: 'BR Music',
              detail: `Gerador de músicas com IA — versão ${app.getVersion()}.\nElectron ${process.versions.electron}.`,
              buttons: ['Fechar'],
            });
          },
        },
        {
          label: 'Abrir Pasta de Dados',
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
        { role: 'about', label: `Sobre o ${APP_NAME}` },
        { type: 'separator' },
        { role: 'hide', label: 'Ocultar BR Music' },
        { role: 'hideOthers', label: 'Ocultar Outros' },
        { role: 'unhide', label: 'Mostrar Todos' },
        { type: 'separator' },
        { role: 'quit', label: 'Sair do BR Music' },
      ],
    });
  }

  return Menu.buildFromTemplate(template);
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
  }));

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
