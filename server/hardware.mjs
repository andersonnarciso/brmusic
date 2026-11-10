/**
 * Detecção de hardware para a central de modelos locais.
 *
 * A ideia é simples: o painel precisa saber que GPU, quanta VRAM, quanta RAM
 * e quanto disco livre a máquina tem, para dizer quais modelos rodam aqui e
 * quais não rodam.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';
import fs from 'node:fs';
import pathModule from 'node:path';

const run = promisify(execFile);

/** Executa um comando e devolve a saida, sem quebrar quando o comando falha. */
async function tryExec(command, args, timeout = 8000) {
  try {
    const { stdout } = await run(command, args, { timeout, maxBuffer: 8 * 1024 * 1024 });
    return stdout.trim();
  } catch {
    return '';
  }
}

/** Lista as GPUs NVIDIA com nome, VRAM em MB e versão do driver. */
async function detectNvidiaGpus() {
  const out = await tryExec('nvidia-smi', [
    '--query-gpu=index,name,memory.total,driver_version',
    '--format=csv,noheader,nounits',
  ]);
  if (!out) return [];
  return out
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [index, name, memory, driver] = line.split(',').map((part) => part.trim());
      return {
        index: Number(index),
        name: name || 'GPU NVIDIA',
        vramMb: Number(memory) || 0,
        driver: driver || '',
        cuda: true,
      };
    })
    .filter((gpu) => Number.isFinite(gpu.index));
}

/** Apple Silicon: nome da GPU e VRAM unificada. */
async function detectAppleGpu() {
  const out = await tryExec('system_profiler', ['SPDisplaysDataType', '-json'], 15000);
  if (!out) return [];
  try {
    const parsed = JSON.parse(out);
    const cards = parsed.SPDisplaysDataType ?? [];
    return cards.map((card, index) => ({
      index,
      name: card.sppci_model ?? 'Apple GPU',
      vramMb: 0, // VRAM unificada, o sistema decide
      driver: card.spdisplays_drivers_version ?? '',
      cuda: false,
      unified: true,
    }));
  } catch {
    return [];
  }
}

/** Windows: nome da GPU e a VRAM declarada no WMI. */
async function detectWindowsGpus() {
  const out = await tryExec(
    'wmic',
    ['path', 'win32_VideoController', 'get', 'name,AdapterRAM', '/format:csv'],
    12000,
  );
  if (!out) return [];
  const lines = out.split('\n').map((line) => line.trim()).filter(Boolean);
  const gpus = [];
  for (const line of lines) {
    const match = line.match(/^(.*?),([^,]*),([^,]*)$/);
    if (!match) continue;
    const [, , name, ram] = match;
    if (!name || name === 'Name') continue;
    gpus.push({
      index: gpus.length,
      name,
      vramMb: Number(ram) ? Math.round(Number(ram) / 1024 / 1024) : 0,
      driver: '',
      cuda: false,
    });
  }
  return gpus;
}

/** Quanto de disco livre tem no caminho, em MB. */
export function diskFreeMb(path) {
  let target = path;
  // o caminho pode ainda nao existir: sobe ate um diretorio que exista
  try {
    while (target && !fs.existsSync(target)) {
      const parent = pathModule.dirname(target);
      if (parent === target) break;
      target = parent;
    }
    const stats = fs.statfsSync(target);
    return Math.round((stats.bavail * stats.bsize) / 1024 / 1024);
  } catch {
    return 0;
  }
}

/**
 * Monta o retrato da maquina.
 * @param {string} dataPath caminho onde os modelos serao instalados
 */
export async function detectHardware(dataPath = os.homedir()) {
  const platform = process.platform;
  let gpus = [];

  if (platform === 'linux') gpus = await detectNvidiaGpus();
  else if (platform === 'darwin') gpus = await detectAppleGpu();
  else if (platform === 'win32') gpus = await detectWindowsGpus();

  const cpus = os.cpus();
  return {
    platform,
    gpus,
    cuda: gpus.some((gpu) => gpu.cuda),
    gpu: gpus[0] ?? null,
    cpu: {
      cores: cpus.length,
      model: cpus[0]?.model?.replace(/\s+/g, ' ').trim() ?? 'desconhecido',
    },
    ramMb: Math.round(os.totalmem() / 1024 / 1024),
    diskFreeMb: diskFreeMb(dataPath),
    dataPath,
    // o setup automatico so existe no Linux: precisa de CUDA e systemd
    canAutoInstall: platform === 'linux' && gpus.some((gpu) => gpu.cuda),
  };
}

/**
 * Decide se o modelo cabe nesta maquina.
 * @param {{vramMb?:number, ramMb?:number, diskGb?:number, cuda?:boolean}} requires
 * @param {Awaited<ReturnType<typeof detectHardware>>} hardware
 */
export function judgeFit(requires = {}, hardware) {
  if (requires.cuda && !hardware.cuda) {
    return {
      verdict: 'unsupported',
      reason: hardware.platform === 'darwin'
        ? 'Requer CUDA. No macOS nao ha GPU NVIDIA.'
        : 'Requer GPU NVIDIA com CUDA.',
    };
  }

  const totalVram = hardware.gpus.reduce((sum, gpu) => sum + gpu.vramMb, 0);
  const biggestVram = hardware.gpus.reduce((max, gpu) => Math.max(max, gpu.vramMb), 0);
  // modelo que ocupa mais de uma GPU compara com a soma; os outros, com a maior
  const needVram = requires.vramMb ?? 0;
  const availableVram = requires.multiGpu ? totalVram : biggestVram;

  if (needVram && availableVram && needVram > availableVram) {
    return {
      verdict: 'no',
      reason: requires.multiGpu
        ? `Precisa de ${needVram} MB de VRAM somando as GPUs e a maquina tem ${availableVram} MB.`
        : `Precisa de ${needVram} MB de VRAM em uma GPU e a maior daqui tem ${availableVram} MB.`,
    };
  }
  if (requires.ramMb && requires.ramMb > hardware.ramMb) {
    return {
      verdict: 'no',
      reason: `Precisa de ${requires.ramMb} MB de RAM e a maquina tem ${hardware.ramMb} MB.`,
    };
  }
  if (requires.diskGb && hardware.diskFreeMb && requires.diskGb * 1024 > hardware.diskFreeMb) {
    return {
      verdict: 'no',
      reason: `Precisa de ${requires.diskGb} GB de disco e ha ${Math.round(
        hardware.diskFreeMb / 1024,
      )} GB livres.`,
    };
  }
  if (needVram && availableVram && needVram > availableVram * 0.8) {
    return {
      verdict: 'tight',
      reason: `Cabe, mas apertado: ${needVram} MB de VRAM com ${availableVram} MB disponiveis.`,
    };
  }
  return { verdict: 'fits', reason: 'Cabe com folga nesta maquina.' };
}
