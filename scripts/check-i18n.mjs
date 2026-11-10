#!/usr/bin/env node
/**
 * Verificador de cobertura do dicionário de traduções.
 *
 *   node scripts/check-i18n.mjs [--verbose]
 *
 * Compara todas as strings passadas para t(...) no código com as chaves
 * existentes no dicionário EN (src/lib/i18n.ts) e lista as que faltam.
 * Sai com código 1 quando há chaves faltando, o que permite usar em CI.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const I18N = path.join(SRC, 'lib', 'i18n.ts');
const verbose = process.argv.includes('--verbose');

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith('.d.ts')) out.push(full);
  }
  return out;
}

/** Extrai as chaves de uma seção "chave": 'valor' do dicionário. */
function dictionaryKeys(source) {
  const keys = new Set();
  const re = /^\s*'((?:[^'\\]|\\.)*)'\s*:/gm;
  let match;
  while ((match = re.exec(source))) keys.add(match[1].replace(/\\'/g, "'"));
  return keys;
}

/** Extrai as strings literais passadas para t('...'). */
function usedKeys(source) {
  const keys = new Set();
  const re = /\bt\(\s*'((?:[^'\\]|\\.)*)'/g;
  let match;
  while ((match = re.exec(source))) keys.add(match[1].replace(/\\'/g, "'"));
  return keys;
}

const dictionary = readFileSync(I18N, 'utf8');
const start = dictionary.indexOf('const EN');
const end = dictionary.indexOf('const EN', start + 1);
const block = dictionary.slice(start, end > 0 ? end : dictionary.length);
const known = dictionaryKeys(block);

const used = new Map();
for (const file of walk(SRC)) {
  if (file === I18N) continue;
  const source = readFileSync(file, 'utf8');
  for (const key of usedKeys(source)) {
    if (!used.has(key)) used.set(key, new Set());
    used.get(key).add(path.relative(ROOT, file));
  }
}

const missing = [...used.keys()].filter((key) => !known.has(key)).sort();

if (verbose) {
  console.log(`strings no código: ${used.size}`);
  console.log(`chaves no dicionário: ${known.size}`);
}

if (missing.length === 0) {
  console.log(`✓ i18n completo: ${used.size} strings traduzidas.`);
  process.exit(0);
}

console.log(`✗ ${missing.length} de ${used.size} strings sem tradução:`);
for (const key of missing) {
  console.log(`  - ${JSON.stringify(key)}  [${[...used.get(key)].join(', ')}]`);
}
process.exit(1);
