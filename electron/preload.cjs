'use strict';

/**
 * BR Music — preload (ponte segura entre o renderer e o processo principal).
 *
 * Expõe apenas `window.desktop` com um punhado de ações explícitas.
 * Nenhuma API do Node é exposta diretamente na página: contextIsolation
 * está ligado e nodeIntegration está desligado.
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * URL do backend local (injetada pelo processo principal via
 * --brmusic-api-url=...). Sob file:// não há servidor, então a API de
 * configuração precisa de uma origem http:// absoluta.
 */
function readApiUrl() {
  const arg = process.argv.find((value) => value.startsWith('--brmusic-api-url='));
  return arg ? arg.slice('--brmusic-api-url='.length) : '';
}

function assertString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`desktop.${label}: esperado string não vazia.`);
  }
  return value;
}

const desktop = {
  /** Origem da API local (vazia na versão web). */
  apiUrl: readApiUrl(),

  /**
   * Abre o diálogo "salvar como" e devolve o caminho escolhido (ou null).
   * @param {{ defaultName?: string }} [options]
   * @returns {Promise<string | null>}
   */
  saveAudio: (options) =>
    ipcRenderer.invoke('dialog:saveAudio', {
      defaultName:
        options && typeof options.defaultName === 'string' && options.defaultName.trim()
          ? options.defaultName.trim()
          : undefined,
    }),

  /**
   * Abre o seletor de pastas e devolve a pasta escolhida (ou null).
   * @returns {Promise<string | null>}
   */
  chooseFolder: () => ipcRenderer.invoke('dialog:chooseFolder'),

  /**
   * Abre um arquivo ou pasta no explorador de arquivos do sistema.
   * @param {string} targetPath
   * @returns {Promise<{ ok: boolean, path?: string, error?: string }>}
   */
  openPath: (targetPath) =>
    ipcRenderer.invoke('shell:openPath', assertString(targetPath, 'openPath')),

  /**
   * Grava um arquivo em disco. O conteúdo vai como base64 (Buffer do Node).
   * @param {{ path: string, dataBase64: string }} payload
   * @returns {Promise<{ ok: boolean, path?: string, error?: string }>}
   */
  writeFile: (payload) => {
    if (!payload || typeof payload !== 'object') {
      throw new TypeError('desktop.writeFile: esperado um objeto { path, dataBase64 }.');
    }
    return ipcRenderer.invoke('files:write', {
      path: assertString(payload.path, 'writeFile.path'),
      dataBase64: assertString(payload.dataBase64, 'writeFile.dataBase64'),
    });
  },

  /**
   * Informações do app em execução.
   * @returns {Promise<{ version: string, platform: string, arch: string, electron: string, node: string, isPackaged: boolean }>}
   */
  getInfo: () => ipcRenderer.invoke('app:info'),

  /**
   * Assina as navegações disparadas pelo menu nativo.
   * @param {(route: string) => void} callback
   * @returns {() => void} função para cancelar a assinatura
   */
  onNavigate: (callback) => {
    if (typeof callback !== 'function') {
      throw new TypeError('desktop.onNavigate: esperado uma função.');
    }
    const listener = (_event, route) => {
      try {
        callback(typeof route === 'string' ? route : '');
      } catch (error) {
        console.error('[BR Music] erro no handler de navegação:', error);
      }
    };
    ipcRenderer.on('navigate', listener);
    return () => ipcRenderer.removeListener('navigate', listener);
  },
};

contextBridge.exposeInMainWorld('desktop', desktop);
