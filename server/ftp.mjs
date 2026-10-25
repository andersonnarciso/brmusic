/**
 * Cliente FTP para hospedagem tradicional (cPanel, Hostinger, Locaweb e
 * hospedagem compartilhada em geral). Usado para guardar as músicas geradas
 * dentro da conta de hospedagem do usuário.
 *
 * A biblioteca basic-ftp não tem dependências runtime, então roda dentro do
 * app desktop empacotado sem instalar nada.
 */

import { Client } from 'basic-ftp';
import { Readable } from 'node:stream';

/**
 * @typedef {Object} FtpConfig
 * @property {boolean} enabled
 * @property {string} host
 * @property {number} port
 * @property {string} user
 * @property {string} password
 * @property {string} remotePath
 * @property {boolean} secure  usa FTPS (TLS)
 * @property {boolean} passive
 * @property {number} timeoutMs
 */

/** @type {FtpConfig} */
export const DEFAULT_FTP = {
  enabled: false,
  host: '',
  port: 21,
  user: '',
  password: '',
  remotePath: '/public_html/musicas',
  secure: false,
  passive: true,
  timeoutMs: 20000,
};

/**
 * @param {Partial<FtpConfig>} raw
 * @returns {FtpConfig}
 */
function normalize(raw) {
  return {
    host: String(raw?.host ?? '').trim(),
    port: Number(raw?.port ?? 21) || 21,
    user: String(raw?.user ?? '').trim(),
    password: String(raw?.password ?? ''),
    remotePath: String(raw?.remotePath ?? '/').trim() || '/',
    secure: Boolean(raw?.secure),
    passive: raw?.passive !== false,
    timeoutMs: Number(raw?.timeoutMs ?? 20000) || 20000,
  };
}

/**
 * @param {FtpConfig} config
 * @param {(client: import('basic-ftp').Client) => Promise<any>} fn
 */
async function withClient(config, fn) {
  if (!config.host || !config.user) {
    throw new Error('Informe o host e o usuário do FTP.');
  }

  const client = new Client();
  client.ftp.verbose = false;
  client.ftp.timeout = config.timeoutMs;

  try {
    await client.access({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      secure: config.secure,
    });
    if (!config.passive) client.usePassive(false);
    return await fn(client);
  } finally {
    client.close();
  }
}

/**
 * Testa a conexão e devolve o que existe no caminho remoto.
 * @param {Partial<FtpConfig>} rawConfig
 */
export async function testFtp(rawConfig) {
  const config = normalize(rawConfig);
  const started = Date.now();
  return withClient(config, async (client) => {
    const entries = await client.list(config.remotePath);
    return {
      ok: true,
      latencyMs: Date.now() - started,
      path: config.remotePath,
      entries: entries.length,
      sample: entries.slice(0, 8).map((entry) => entry.name),
    };
  });
}

/**
 * Envia um arquivo para o FTP.
 * @param {Partial<FtpConfig>} rawConfig
 * @param {string} filename nome do arquivo no servidor
 * @param {Buffer|Uint8Array} content conteúdo binário
 * @param {string} [subdir] subpasta dentro de remotePath
 */
export async function uploadToFtp(rawConfig, filename, content, subdir = '') {
  const config = normalize(rawConfig);
  const started = Date.now();
  return withClient(config, async (client) => {
    const base = config.remotePath.replace(/\/+$/, '');
    const target = subdir ? `${base}/${subdir.replace(/^\/+/, '')}` : base;
    if (target && target !== '/') await client.ensureDir(target);
    const remotePath = `${target.replace(/\/+$/, '')}/${filename}`;
    await client.uploadFrom(Readable.from([Buffer.from(content)]), remotePath);
    return {
      ok: true,
      latencyMs: Date.now() - started,
      path: remotePath,
      size: content.length,
    };
  });
}
