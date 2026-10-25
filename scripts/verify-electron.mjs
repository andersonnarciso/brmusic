#!/usr/bin/env node
/**
 * Verificação estática do empacotamento desktop do BR Music.
 *
 *   node scripts/verify-electron.mjs
 *
 * Não usa nenhuma dependência externa: o YAML é lido por um parser simples
 * escrito aqui mesmo. Sai com código 1 se qualquer verificação falhar.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const results = [];

function record(ok, name, detail = '') {
  results.push({ ok, name, detail });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
}

function warn(name, detail = '') {
  console.log(`! ${name}${detail ? ` — ${detail}` : ''}`);
}

function check(ok, name, detail = '') {
  record(Boolean(ok), name, detail);
}

/* ------------------------------------------------------------------ */
/* Parser YAML minimalista (maps, listas, escalares)                   */
/* ------------------------------------------------------------------ */

function stripComment(text) {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === '#' && !inSingle && !inDouble && (i === 0 || /\s/.test(text[i - 1]))) {
      return text.slice(0, i).trim();
    }
  }
  return text;
}

function parseScalar(raw) {
  const value = raw.trim();
  if (value === '') return null;
  if ((value.startsWith("'") && value.endsWith("'") && value.length > 1) ||
      (value.startsWith('"') && value.endsWith('"') && value.length > 1)) {
    return value.slice(1, -1);
  }
  if (value === 'true' || value === 'yes') return true;
  if (value === 'false' || value === 'no') return false;
  if (value === 'null' || value === '~') return null;
  if (/^-?\d+$/.test(value)) return Number(value);
  if (/^-?\d+\.\d+$/.test(value)) return Number(value);
  return value;
}

function splitKeyValue(text) {
  const index = text.indexOf(':');
  if (index === -1) return { key: text.trim(), value: '' };
  return { key: text.slice(0, index).trim(), value: text.slice(index + 1).trim() };
}

function parseYaml(text) {
  const lines = [];
  for (const raw of text.split(/\r?\n/)) {
    if (raw.includes('\t')) {
      throw new Error(`Tabulador (\\t) encontrado em YAML: "${raw.trim()}"`);
    }
    const withoutComment = stripComment(raw.trim());
    if (withoutComment === '') continue;
    const indent = raw.length - raw.trimStart().length;
    lines.push({ indent, text: withoutComment });
  }

  let index = 0;

  function readBlockScalar(indent) {
    const parts = [];
    while (index < lines.length && lines[index].indent > indent) {
      parts.push(lines[index].text);
      index += 1;
    }
    return parts.join('\n');
  }

  function parseMap(indent) {
    const map = {};
    while (index < lines.length && lines[index].indent === indent) {
      const { key, value } = splitKeyValue(lines[index].text);
      index += 1;
      if (value === '|' || value === '>' || value === '|-' || value === '>-') {
        map[key] = readBlockScalar(indent);
      } else if (value === '') {
        if (index < lines.length && lines[index].indent > indent) {
          map[key] = parseValue(lines[index].indent);
        } else if (index < lines.length && lines[index].indent === indent && lines[index].text.startsWith('-')) {
          map[key] = parseList(indent);
        } else {
          map[key] = null;
        }
      } else {
        map[key] = parseScalar(value);
      }
    }
    return map;
  }

  function parseList(indent) {
    const list = [];
    while (index < lines.length && lines[index].indent === indent && lines[index].text.startsWith('-')) {
      const item = lines[index].text.slice(1).trim();
      index += 1;
      if (item === '') {
        list.push(index < lines.length && lines[index].indent > indent ? parseValue(lines[index].indent) : null);
        continue;
      }
      if (splitKeyValue(item).value !== '' || item.endsWith(':')) {
        const { key, value } = splitKeyValue(item);
        const map = {};
        const childIndent = indent + 2;
        if (value === '|' || value === '>' || value === '|-' || value === '>-') {
          map[key] = readBlockScalar(indent);
        } else if (value === '') {
          map[key] = index < lines.length && lines[index].indent > childIndent ? parseValue(lines[index].indent) : null;
        } else {
          map[key] = parseScalar(value);
        }
        // demais chaves do mesmo item, no mesmo nível do item
        while (index < lines.length && lines[index].indent === childIndent && !lines[index].text.startsWith('-')) {
          const child = splitKeyValue(lines[index].text);
          index += 1;
          if (child.value === '|' || child.value === '>' || child.value === '|-' || child.value === '>-') {
            map[child.key] = readBlockScalar(childIndent);
          } else if (child.value === '') {
            map[child.key] = index < lines.length && lines[index].indent > childIndent ? parseValue(lines[index].indent) : null;
          } else {
            map[child.key] = parseScalar(child.value);
          }
        }
        list.push(map);
      } else {
        list.push(parseScalar(item));
      }
    }
    return list;
  }

  function parseValue(indent) {
    if (index < lines.length && lines[index].text.startsWith('-')) return parseList(indent);
    return parseMap(indent);
  }

  if (index >= lines.length) return {};
  return parseValue(lines[0].indent);
}

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

function readText(relative) {
  const full = path.join(ROOT, relative);
  return existsSync(full) ? readFileSync(full, 'utf8') : null;
}

function asArray(value) {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function matchesGlob(pattern, target) {
  const regex = new RegExp(
    `^${pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*\/\*/g, '\u0000')
      .replace(/\*\*/g, '\u0001')
      .replace(/\*/g, '[^/]*')
      .replace(/\u0000/g, '(?:.*/)?')
      .replace(/\u0001/g, '.*')}$`,
  );
  return regex.test(target);
}

/* ------------------------------------------------------------------ */
/* Verificações                                                        */
/* ------------------------------------------------------------------ */

console.log('BR Music — verificação do empacotamento desktop\n');

// 1. Arquivos obrigatórios
const requiredFiles = [
  'electron/main.cjs',
  'electron/preload.cjs',
  'electron-builder.yml',
  'build/entitlements.mac.plist',
  'build/entitlements.mac.inherit.plist',
  'build/icon.png',
  'build/icon.ico',
  'scripts/build-desktop.mjs',
  'scripts/generate-icons.mjs',
  'scripts/verify-electron.mjs',
  '.github/workflows/release.yml',
];
for (const file of requiredFiles) {
  check(existsSync(path.join(ROOT, file)), `arquivo existe: ${file}`);
}

// 2. Sintaxe dos scripts CommonJS do Electron
for (const file of ['electron/main.cjs', 'electron/preload.cjs']) {
  const result = spawnSync(process.execPath, ['--check', path.join(ROOT, file)], { encoding: 'utf8' });
  check(result.status === 0, `node --check ${file}`, result.status === 0 ? '' : (result.stderr || '').trim().split('\n')[0]);
}

// 3. electron-builder.yml
const builderRaw = readText('electron-builder.yml');
let builder = null;
if (builderRaw === null) {
  check(false, 'electron-builder.yml pode ser lido');
} else {
  try {
    builder = parseYaml(builderRaw);
    check(true, 'electron-builder.yml é um YAML válido');
  } catch (error) {
    check(false, 'electron-builder.yml é um YAML válido', error.message);
  }
}

if (builder) {
  check(builder.appId === 'com.brmusic.app', 'appId: com.brmusic.app', String(builder.appId));
  check(builder.productName === 'BR Music', 'productName: BR Music', String(builder.productName));
  check(builder.copyright === 'MIT', 'copyright: MIT', String(builder.copyright));
  check(builder.asar === true, 'asar: true', String(builder.asar));
  check(builder.directories?.output === 'release', 'directories.output: release', String(builder.directories?.output));
  check(builder.directories?.buildResources === 'build', 'directories.buildResources: build', String(builder.directories?.buildResources));

  const files = asArray(builder.files).map((f) => String(f));
  check(files.some((f) => f.startsWith('dist')), 'files inclui dist/**', files.join(', '));
  check(files.some((f) => f.startsWith('electron')), 'files inclui electron/**', files.join(', '));
  check(files.includes('package.json'), 'files inclui package.json', files.join(', '));
  // server/ entra de propósito: é o backend local que o app desktop executa.
  // Ele sai do asar (asarUnpack) porque precisa ser interpretável pelo Node.
  const forbidden = ['src', 'docs', 'rea-analysis'];
  const leaked = files.filter((f) => forbidden.some((dir) => f === dir || f.startsWith(`${dir}/`)));
  check(leaked.length === 0, 'files não inclui src/docs/rea-analysis', leaked.join(', '));
  check(
    files.some((f) => f.startsWith('server')),
    'files inclui server/** (backend local do app desktop)',
    files.join(', '),
  );
  const unpack = asArray(builder.asarUnpack).map(String);
  check(
    unpack.some((f) => f.startsWith('server')),
    'asarUnpack inclui server/** (executável fora do asar)',
    unpack.join(', '),
  );

  const linux = builder.linux ?? {};
  const linuxTargets = asArray(linux.target).map(String);
  check(linuxTargets.includes('AppImage'), 'linux.target inclui AppImage', linuxTargets.join(', '));
  check(linuxTargets.includes('deb'), 'linux.target inclui deb', linuxTargets.join(', '));
  check(linux.category === 'AudioVideo', 'linux.category: AudioVideo', String(linux.category));
  check(linux.executableName === 'brmusic', 'linux.executableName: brmusic', String(linux.executableName));
  check(linux.artifactName === 'BRMusic-${version}-${arch}.${ext}', 'linux.artifactName padrão', String(linux.artifactName));

  const buildResources = path.join(ROOT, String(builder.directories?.buildResources ?? 'build'));
  const iconPath = path.resolve(buildResources, String(linux.icon ?? 'icon.png'));
  check(existsSync(iconPath), `linux.icon existe (${path.relative(ROOT, iconPath)})`);

  const entry = linux.desktop?.entry ?? {};
  for (const key of ['Name', 'Comment', 'Icon', 'Categories']) {
    check(Boolean(entry[key]), `linux.desktop.entry.${key} definido`, String(entry[key]));
  }
  check(entry.Terminal === false, 'linux.desktop.entry.Terminal: false', String(entry.Terminal));
  // O electron-builder 26 recusa linux.desktop.entry.Exec — o Exec é gerado
  // a partir de linux.executableName.
  check(!('Exec' in entry), 'linux.desktop.entry.Exec não é informado (gerado automaticamente)');

  const win = builder.win ?? {};
  const winTargets = asArray(win.target).map(String);
  check(winTargets.includes('nsis'), 'win.target inclui nsis', winTargets.join(', '));
  check(winTargets.includes('portable'), 'win.target inclui portable', winTargets.join(', '));
  const nsis = builder.nsis ?? {};
  // Instalador assistido: oneClick: false é obrigatório para permitir
  // escolher a pasta de instalação (allowToChangeInstallationDirectory).
  check(nsis.oneClick === false, 'nsis.oneClick: false (instalador assistido)', String(nsis.oneClick));
  check(
    nsis.allowToChangeInstallationDirectory === true,
    'nsis.allowToChangeInstallationDirectory: true',
    String(nsis.allowToChangeInstallationDirectory),
  );
  check(nsis.perMachine === false, 'nsis.perMachine: false', String(nsis.perMachine));
  check(nsis.shortcutName === 'BR Music', 'nsis.shortcutName: BR Music', String(nsis.shortcutName));  check(win.artifactName === 'BRMusic-${version}-${arch}.${ext}', 'win.artifactName padrão', String(win.artifactName));
  const winIcon = path.resolve(buildResources, String(win.icon ?? 'icon.ico'));
  check(existsSync(winIcon), `win.icon existe (${path.relative(ROOT, winIcon)})`);

  const mac = builder.mac ?? {};
  const macTargets = asArray(mac.target).map(String);
  check(macTargets.includes('dmg'), 'mac.target inclui dmg', macTargets.join(', '));
  check(macTargets.includes('zip'), 'mac.target inclui zip', macTargets.join(', '));
  check(mac.category === 'public.app-category.music', 'mac.category: public.app-category.music', String(mac.category));
  check(mac.hardenedRuntime === true, 'mac.hardenedRuntime: true', String(mac.hardenedRuntime));
  for (const key of ['entitlements', 'entitlementsInherit']) {
    const rel = String(mac[key] ?? '');
    const candidates = [path.resolve(ROOT, rel), path.resolve(buildResources, path.basename(rel))];
    check(
      rel !== '' && candidates.some((c) => existsSync(c)),
      `mac.${key} existe (${rel})`,
    );
  }

  const publish = builder.publish ?? {};
  check(publish.provider === 'github', 'publish.provider: github', String(publish.provider));
  check(publish.owner === 'andersonnarciso', 'publish.owner: andersonnarciso', String(publish.owner));
  check(publish.repo === 'brmusic', 'publish.repo: brmusic', String(publish.repo));
}

// 4. Ícones válidos
const pngBytes = (() => {
  const full = path.join(ROOT, 'build/icon.png');
  return existsSync(full) ? readFileSync(full) : null;
})();
if (pngBytes) {
  const isPng = pngBytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
  const width = pngBytes.readUInt32BE(16);
  const height = pngBytes.readUInt32BE(20);
  check(isPng, 'build/icon.png é um PNG válido');
  check(width === 512 && height === 512, 'build/icon.png tem 512x512', `${width}x${height}`);
} else {
  check(false, 'build/icon.png existe');
}

const icoBytes = (() => {
  const full = path.join(ROOT, 'build/icon.ico');
  return existsSync(full) ? readFileSync(full) : null;
})();
if (icoBytes) {
  const isIco = icoBytes.readUInt16LE(0) === 0 && icoBytes.readUInt16LE(2) === 1;
  check(isIco, 'build/icon.ico é um ICO válido');
} else {
  check(false, 'build/icon.ico existe');
}

// 5. O build do Vite precisa abrir via file:// (base relativa)
const distIndex = path.join(ROOT, 'dist', 'index.html');
if (!existsSync(distIndex)) {
  warn('dist/index.html ainda não existe (rode `npm run build` antes)');
} else {
  const html = readFileSync(distIndex, 'utf8');
  const urls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
  const local = urls.filter((u) => !/^(https?:)?\/\//.test(u) && !u.startsWith('data:'));
  const absolute = local.filter((u) => u.startsWith('/'));
  check(absolute.length === 0, 'dist/index.html não usa caminhos absolutos (file://)', absolute.join(', '));
  const missing = local.filter((u) => !existsSync(path.resolve(ROOT, 'dist', u.replace(/^\.\//, ''))));
  check(missing.length === 0, 'assets referenciados existem em dist/', missing.join(', '));
  if (urls.some((u) => u.startsWith('https://fonts.'))) {
    warn('dist/index.html usa Google Fonts (http) — offline o app usa fontes de fallback');
  }
}

// 6. Workflow de release
const workflowRaw = readText('.github/workflows/release.yml');
if (workflowRaw === null) {
  check(false, '.github/workflows/release.yml existe');
} else {
  check(!workflowRaw.includes('\t'), 'workflow sem tabuladores');
  let workflow = null;
  try {
    workflow = parseYaml(workflowRaw);
    check(true, 'workflow é um YAML válido');
  } catch (error) {
    check(false, 'workflow é um YAML válido', error.message);
  }
  if (workflow) {
    const on = workflow.on ?? {};
    const tags = asArray(on.push?.tags).map(String);
    check(tags.includes('v*'), 'gatilho de tags v*', tags.join(', '));
    check(Boolean(on.workflow_dispatch), 'gatilho workflow_dispatch');
    const jobs = workflow.jobs ?? {};
    check(Boolean(jobs.build), 'job "build" definido');
    check(Boolean(jobs.release), 'job "release" definido');
    const allSteps = Object.values(jobs)
      .flatMap((job) => asArray(job.steps))
      .map((step) => (typeof step === 'object' && step !== null ? step : {}));
    const uses = allSteps.map((s) => String(s.uses ?? ''));
    check(uses.some((u) => u.startsWith('actions/checkout@v4')), 'usa actions/checkout@v4');
    check(uses.some((u) => u.startsWith('actions/setup-node@v4')), 'usa actions/setup-node@v4');
    check(uses.some((u) => u.startsWith('actions/upload-artifact@v4')), 'usa actions/upload-artifact@v4');
    check(uses.some((u) => u.startsWith('softprops/action-gh-release@v2')), 'usa softprops/action-gh-release@v2');
    const runs = allSteps.map((s) => String(s.run ?? ''));
    check(runs.some((r) => r.includes('npm install')), 'instala dependências com npm install');
    check(runs.some((r) => r.includes('npm run build')), 'gera o build web com npm run build');
    check(runs.some((r) => r.includes('electron-builder')), 'chama electron-builder');
    const nodeVersion = Object.values(jobs)
      .flatMap((job) => asArray(job.steps))
      .map((s) => s?.with?.['node-version'])
      .find((v) => v !== undefined);
    check(String(nodeVersion) === '22', 'Node 22 no setup-node', String(nodeVersion));
    const matrix = Object.values(jobs).map((job) => job.strategy?.matrix?.include).find(Boolean);
    check(Array.isArray(matrix) && matrix.length === 3, 'matrix com 3 plataformas', String(Array.isArray(matrix) ? matrix.length : 0));
  }
}

// 7. package.json: campo "main" (o dono do package.json precisa aplicar)
const pkgRaw = readText('package.json');
if (pkgRaw) {
  const pkg = JSON.parse(pkgRaw);
  if (!pkg.main) {
    warn('package.json sem "main" — o dono do package.json precisa adicionar "main": "electron/main.cjs"');
  } else {
    check(existsSync(path.join(ROOT, pkg.main)), `package.json.main existe (${pkg.main})`);
  }
}

/* ------------------------------------------------------------------ */
/* Resumo                                                              */
/* ------------------------------------------------------------------ */

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} verificações OK`);
if (failed.length > 0) {
  console.log('\nFALHAS:');
  for (const item of failed) console.log(`  ✗ ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
  process.exit(1);
}
console.log('PASS — empacotamento desktop consistente.');
