#!/usr/bin/env node
/**
 * Build do app desktop (Electron) do BR Music.
 *
 *   node scripts/build-desktop.mjs [--dir] [--publish never|always] [--skip-build] [--linux dir]
 *
 *   --dir            gera apenas a pasta descompactada (build rápido, sem instalador)
 *   --publish        never (padrão) | always | onTagOrDraft
 *   --skip-build     não roda o `vite build` antes (usa o dist/ atual)
 *   --linux <target> alvo específico do electron-builder (ex.: dir, AppImage, deb)
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG = 'electron-builder.yml';
const OUTPUT_DIR = path.join(ROOT, 'release');

const argv = process.argv.slice(2);
const hasFlag = (flag) => argv.includes(flag);
const valueOf = (flag) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : undefined;
};

const unpacked = hasFlag('--dir');
const skipBuild = hasFlag('--skip-build');
let publish = valueOf('--publish') ?? 'never';
const linuxTarget = valueOf('--linux');
const publishModes = ['never', 'always', 'onTagOrDraft'];
if (!publishModes.includes(publish)) {
  console.error(`✗ --publish inválido: "${publish}" (use: ${publishModes.join(', ')})`);
  process.exit(1);
}
if (unpacked && publish === 'always') {
  console.warn('! --dir não publica artefatos; --publish foi ajustado para "never".');
  publish = 'never';
}

function run(command, args, label) {
  console.log(`\n▸ ${label}\n  $ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { cwd: ROOT, stdio: 'inherit', shell: false });
  if (result.error) {
    console.error(`✗ ${label}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`✗ ${label}: saiu com código ${result.status}`);
    process.exit(result.status ?? 1);
  }
}

function localBin(name) {
  const bin = path.join(ROOT, 'node_modules', '.bin', name);
  if (!existsSync(bin)) {
    console.error(`✗ binário "${name}" não encontrado em node_modules/.bin — rode npm install primeiro.`);
    process.exit(1);
  }
  return bin;
}

if (!skipBuild) {
  run(localBin('vite'), ['build'], 'Build do front (vite build)');
} else {
  console.log('▸ --skip-build: usando o dist/ existente.');
}

const builderArgs = ['--config', CONFIG, '--publish', publish];
if (unpacked) builderArgs.push('--dir');
if (linuxTarget) builderArgs.push('--linux', linuxTarget);
run(localBin('electron-builder'), builderArgs, 'Build do desktop (electron-builder)');

console.log('\n▸ Artefatos gerados:');
if (!existsSync(OUTPUT_DIR)) {
  console.log('  (nenhum — a pasta release/ não foi criada)');
} else {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else files.push(full);
    }
  };
  walk(OUTPUT_DIR);
  if (files.length === 0) {
    console.log('  (nenhum arquivo encontrado em release/)');
  } else {
    for (const file of files.sort()) {
      const { size } = statSync(file);
      console.log(`  ${path.relative(ROOT, file)} (${(size / 1024 / 1024).toFixed(2)} MB)`);
    }
  }
}
