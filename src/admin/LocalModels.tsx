import { useCallback, useEffect, useRef, useState } from 'react';
import {
  applyLocalModel,
  cancelLocalModelInstall,
  installLocalModel,
  loadAdminConfig,
  loadLocalModel,
  loadLocalModels,
  loadLocalModelsState,
  saveAdminConfig,
  unloadLocalModel,
  type LocalHardware,
  type LocalModelItem,
  type LocalModelsSnapshot,
  type LocalModelsState,
} from '../lib/adminClient';
import { showToast } from '../lib/store';
import { useT } from '../lib/useT';
import { Badge, Button, Card, Stat } from './ui';

/** Veredito do modelo para a maquina atual. */
const VERDICTS = {
  fits: { label: 'Cabe na sua máquina', tone: 'ok' },
  tight: { label: 'Cabe, mas apertado', tone: 'warn' },
  no: { label: 'Não cabe nesta máquina', tone: 'bad' },
  unsupported: { label: 'Não suportado nesta máquina', tone: 'bad' },
} as const;

/** Situacao do modelo no catalogo. */
const STATUSES = {
  validated: { label: 'Validado', tone: 'ok' },
  unvalidated: { label: 'Não validado', tone: 'neutral' },
  legacy: { label: 'Legado', tone: 'warn' },
  available: { label: 'Disponível', tone: 'neutral' },
} as const;

/**
 * O motivo do veredito vem pronto do servidor, em portugues. Os formatos
 * sao poucos e fixos, entao cada um vira uma chave de traducao. Quando o
 * servidor muda o texto, o motivo original continua aparecendo.
 */
const REASON_RULES: Array<{ pattern: RegExp; key: string; names?: string[] }> = [
  {
    pattern: /^Precisa de (\d+) MB de VRAM somando as GPUs e a maquina tem (\d+) MB\.$/,
    key: 'Precisa de {vram} MB de VRAM somando as GPUs e a maquina tem {livre} MB.',
    names: ['vram', 'livre'],
  },
  {
    pattern: /^Precisa de (\d+) MB de VRAM em uma GPU e a maior daqui tem (\d+) MB\.$/,
    key: 'Precisa de {vram} MB de VRAM em uma GPU e a maior daqui tem {livre} MB.',
    names: ['vram', 'livre'],
  },
  {
    pattern: /^Precisa de (\d+) MB de RAM e a maquina tem (\d+) MB\.$/,
    key: 'Precisa de {ram} MB de RAM e a maquina tem {livre} MB.',
    names: ['ram', 'livre'],
  },
  {
    pattern: /^Precisa de (\d+) GB de disco e ha (\d+) GB livres\.$/,
    key: 'Precisa de {disco} GB de disco e ha {livre} GB livres.',
    names: ['disco', 'livre'],
  },
  {
    pattern: /^Cabe, mas apertado: (\d+) MB de VRAM com (\d+) MB disponiveis\.$/,
    key: 'Cabe, mas apertado: {vram} MB de VRAM com {livre} MB disponiveis.',
    names: ['vram', 'livre'],
  },
  { pattern: /^Cabe com folga nesta maquina\.$/, key: 'Cabe com folga nesta maquina.' },
  { pattern: /^Requer CUDA\. No macOS nao ha GPU NVIDIA\.$/, key: 'Requer CUDA. No macOS nao ha GPU NVIDIA.' },
  { pattern: /^Requer GPU NVIDIA com CUDA\.$/, key: 'Requer GPU NVIDIA com CUDA.' },
  { pattern: /^Roda pela API, sem instalar nada\.$/, key: 'Roda pela API, sem instalar nada.' },
];

/** Traduz o motivo do veredito quando ele segue um formato conhecido. */
function translateReason(reason: string, t: (text: string) => string): string {
  for (const rule of REASON_RULES) {
    const match = reason.match(rule.pattern);
    if (!match) continue;
    let text = t(rule.key);
    (rule.names ?? []).forEach((name, index) => {
      text = text.replace(`{${name}}`, match[index + 1] ?? '');
    });
    return text;
  }
  return reason;
}

/** Converte MB em GB, sem casas decimais em valores redondos. */
function formatGb(mb: number): string {
  if (!Number.isFinite(mb) || mb <= 0) return '0 GB';
  const gb = mb / 1024;
  return `${gb >= 10 ? Math.round(gb) : gb.toFixed(1)} GB`;
}

/** Escolhe o modelo do auto setup: o que cabe, de preferencia o validado. */
function pickAutoModel(items: LocalModelItem[]): LocalModelItem | null {
  const score = (item: LocalModelItem) => {
    const fit = item.fit.verdict === 'fits' ? 0 : item.fit.verdict === 'tight' ? 1 : 2;
    const status = item.status === 'validated' ? 0 : 1;
    return fit * 10 + status;
  };
  const usable = items
    .filter((item) => item.kind === 'local')
    .filter((item) => item.fit.verdict === 'fits' || item.fit.verdict === 'tight')
    .sort((a, b) => score(a) - score(b));
  return usable[0] ?? null;
}

export function LocalModelsSection({ onApplied }: { onApplied: () => void | Promise<void> }) {
  const t = useT();
  const [snapshot, setSnapshot] = useState<LocalModelsSnapshot | null>(null);
  const [state, setState] = useState<LocalModelsState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyModel, setBusyModel] = useState<string | null>(null);
  const [loadingModel, setLoadingModel] = useState<string | null>(null);
  const [autoBusy, setAutoBusy] = useState(false);
  const [autoUnload, setAutoUnload] = useState(true);

  const refreshSnapshot = useCallback(async () => {
    const next = await loadLocalModels();
    if (!next) return;
    setSnapshot(next);
    setState(next.state);
  }, []);

  useEffect(() => {
    void refreshSnapshot();
    void loadAdminConfig().then((cfg) => {
      if (cfg?.localModels) setAutoUnload(cfg.localModels.autoUnload !== false);
    });
  }, [refreshSnapshot]);

  const phase = state?.phase ?? 'idle';
  const inFlight = phase === 'installing' || phase === 'loading';

  // Enquanto instala ou carrega, o estado muda sozinho: o painel le o
  // progresso a cada 2 segundos e para quando a fase assenta.
  useEffect(() => {
    if (!inFlight) return;
    let cancelled = false;
    const timer = window.setInterval(() => {
      void loadLocalModelsState().then((next) => {
        if (!cancelled && next) setState(next);
      });
    }, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [inFlight]);

  // Quando a fase muda (fim da instalacao, erro, modelo pronto) o catalogo
  // precisa ser lido de novo, porque o campo "instalado" mora la.
  const previousPhase = useRef<string | null>(null);
  useEffect(() => {
    const current = state?.phase ?? null;
    const before = previousPhase.current;
    previousPhase.current = current;
    if (before === 'installing' || before === 'loading') {
      if (current !== before) void refreshSnapshot();
    }
  }, [state?.phase, refreshSnapshot]);

  const runInstall = async (item: LocalModelItem) => {
    setError(null);
    setBusyModel(item.id);
    try {
      await installLocalModel(item.id);
      const next = await loadLocalModelsState();
      if (next) setState(next);
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setBusyModel(null);
    }
  };

  const runCancel = async () => {
    setError(null);
    try {
      await cancelLocalModelInstall();
      const next = await loadLocalModelsState();
      if (next) setState(next);
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    }
  };

  const runLoad = async (item: LocalModelItem) => {
    setError(null);
    setLoadingModel(item.id);
    try {
      await loadLocalModel(item.id);
      const next = await loadLocalModelsState();
      if (next) setState(next);
      showToast(t('Modelo carregado'));
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setLoadingModel(null);
      void refreshSnapshot();
    }
  };

  const runUnload = async () => {
    setError(null);
    try {
      await unloadLocalModel();
      const next = await loadLocalModelsState();
      if (next) setState(next);
      showToast(t('Modelo derrubado, a VRAM foi liberada'));
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      void refreshSnapshot();
    }
  };

  const runApply = async (item: LocalModelItem) => {
    setError(null);
    setBusyModel(item.id);
    try {
      await applyLocalModel(item.id);
      showToast(t('O app agora usa este modelo para gerar o áudio'));
      await onApplied();
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setBusyModel(null);
    }
  };

  /** Espera a fase do servidor sair de "installing". */
  const waitForInstall = useCallback(async () => {
    const deadline = Date.now() + 60 * 60 * 1000;
    while (Date.now() < deadline) {
      const next = await loadLocalModelsState();
      if (next) {
        setState(next);
        if (next.phase !== 'installing') return next;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 2000));
    }
    return null;
  }, []);

  const runAutoSetup = async () => {
    if (!snapshot) return;
    const target = pickAutoModel(snapshot.items);
    if (!target) {
      showToast(t('Nenhum modelo local cabe nesta máquina'));
      return;
    }
    setAutoBusy(true);
    setError(null);
    try {
      if (!target.installed) {
        await installLocalModel(target.id);
        const settled = await waitForInstall();
        if (settled?.phase === 'error') {
          throw new Error(settled.error ?? 'falha na instalação');
        }
        await refreshSnapshot();
      }
      await loadLocalModel(target.id);
      const next = await loadLocalModelsState();
      if (next) setState(next);
      await applyLocalModel(target.id);
      await onApplied();
      showToast(t('Auto setup concluído, o app já usa este modelo'));
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setAutoBusy(false);
      void refreshSnapshot();
    }
  };

  const hardware = snapshot?.hardware ?? null;
  const items = snapshot?.items ?? [];
  const logLines = (state?.log ?? []).slice(-40);

  if (!snapshot) {
    return (
      <Card title={t('Modelos locais')} description={t('Modelos de musica na sua maquina')}>
        <p className="text-sm text-mute-500">{t('Procurando modelos locais…')}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {(error || state?.error) && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <p className="font-medium">{t('Erro na central de modelos')}</p>
          <p className="mt-0.5 text-xs text-amber-200/80">{error ?? state?.error}</p>
        </div>
      )}

      <HardwareCard hardware={hardware} />

      <Card
        title={t('Auto setup')}
        description={t(
          'Auto setup baixa o modelo certo para esta máquina e aponta o provedor de áudio do app para ele.',
        )}
        actions={
          <Button
            variant="primary"
            onClick={() => void runAutoSetup()}
            disabled={autoBusy || !hardware?.canAutoInstall}
          >
            {autoBusy ? t('Preparando o modelo…') : t('Auto setup')}
          </Button>
        }
      >
        <p className="text-xs text-mute-500">
          {hardware?.canAutoInstall
            ? t('A instalação automática está disponível nesta máquina.')
            : t(
                'A instalação automática precisa de Linux com uma GPU NVIDIA. No macOS e no Windows o caminho é manual.',
              )}
        </p>
        <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs text-mute-400">
          <input
            type="checkbox"
            className="mt-0.5 h-3.5 w-3.5 accent-brand-500"
            checked={autoUnload}
            onChange={(e) => {
              const value = e.target.checked;
              setAutoUnload(value);
              void loadAdminConfig().then((cfg) =>
                saveAdminConfig({
                  ...cfg,
                  localModels: { ...(cfg.localModels ?? {}), autoUnload: value },
                }),
              );
            }}
          />
          <span>
            {t(
              'Derrubar o modelo depois de gerar. Ele segura 22 GB de VRAM enquanto roda, e a máquina trava com o app aberto.',
            )}
          </span>
        </label>
      </Card>

      {phase === 'installing' && (
        <Card title={t('Instalando…')} description={state?.message}>
          <div className="h-2 w-full overflow-hidden rounded-full bg-ink-700">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, state?.percent ?? 0))}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-mute-400">
            {state?.percent ?? 0}% {state?.message ? `· ${state.message}` : ''}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone={state?.install.runtimeReady ? 'ok' : 'neutral'}>{t('Runtime pronto')}</Badge>
            <Badge tone={state?.install.weightsReady ? 'ok' : 'neutral'}>{t('Pesos prontos')}</Badge>
            <Badge tone={state?.install.serviceReady ? 'ok' : 'neutral'}>{t('Serviço pronto')}</Badge>
          </div>
          <pre
            className="scroll-thin mt-3 max-h-48 overflow-y-auto rounded-xl border border-ink-700 bg-ink-950 p-3 font-mono text-[11px] leading-relaxed text-mute-400"
            aria-label={t('Log da instalação')}
          >
            {logLines.length > 0 ? logLines.join('\n') : t('Sem logs ainda.')}
          </pre>
        </Card>
      )}

      <Card
        title={t('Catálogo de modelos')}
        description={t(
          'Modelos que o BR Music sabe preparar, com o veredito para esta máquina e os botões de instalação.',
        )}
      >
        <div className="space-y-3">
          {items.map((item) => (
            <ModelCard
              key={item.id}
              item={item}
              state={state}
              busyModel={busyModel}
              loadingModel={loadingModel}
              onInstall={runInstall}
              onCancel={runCancel}
              onLoad={runLoad}
              onUnload={runUnload}
              onApply={runApply}
            />
          ))}
          {items.length === 0 && (
            <p className="text-sm text-mute-500">{t('Nenhum modelo no catálogo.')}</p>
          )}
        </div>
      </Card>
    </div>
  );
}

function HardwareCard({ hardware }: { hardware: LocalHardware | null }) {
  const t = useT();
  if (!hardware) return null;
  return (
    <Card
      title={t('Esta máquina')}
      description={t(
        'O hardware detectado aqui. O veredito de cada modelo do catálogo sai destes números.',
      )}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {hardware.gpus.map((gpu) => (
          <Stat
            key={gpu.index}
            label={`${t('GPU')} ${gpu.index}`}
            value={gpu.name}
            hint={`${formatGb(gpu.vramMb)} ${t('de VRAM')}${gpu.driver ? ` · ${gpu.driver}` : ''}`}
          />
        ))}
        {hardware.gpus.length === 0 && (
          <Stat label={t('GPU')} value={t('Nenhuma GPU detectada')} />
        )}
        <Stat
          label={t('CPU')}
          value={hardware.cpu.model}
          hint={`${hardware.cpu.cores} ${t('núcleos')}`}
        />
        <Stat label={t('Memória RAM')} value={formatGb(hardware.ramMb)} />
        <Stat
          label={t('Disco livre')}
          value={formatGb(hardware.diskFreeMb)}
          hint={hardware.dataPath}
        />
      </div>
      <p className="mt-4 text-xs text-mute-500">
        {t('Plataforma')}: {hardware.platform} · {t('CUDA')}: {hardware.cuda ? t('sim') : t('não')}
      </p>
    </Card>
  );
}

function ModelCard({
  item,
  state,
  busyModel,
  loadingModel,
  onInstall,
  onCancel,
  onLoad,
  onUnload,
  onApply,
}: {
  item: LocalModelItem;
  state: LocalModelsState | null;
  busyModel: string | null;
  loadingModel: string | null;
  onInstall: (item: LocalModelItem) => void;
  onCancel: () => void;
  onLoad: (item: LocalModelItem) => void;
  onUnload: () => void;
  onApply: (item: LocalModelItem) => void;
}) {
  const t = useT();
  const verdict = VERDICTS[item.fit.verdict] ?? VERDICTS.unsupported;
  const status = STATUSES[item.status] ?? STATUSES.available;
  const isApi = item.kind === 'api';
  const installing = state?.phase === 'installing' && state?.modelId === item.id;
  const loading = loadingModel === item.id;
  const running = Boolean(state?.server.running) && state?.modelId === item.id;

  return (
    <section className="rounded-2xl border border-ink-700 bg-ink-850 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-mute-100">{t(item.name)}</p>
          <p className="mt-0.5 text-[11px] text-mute-500">{item.vendor}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={status.tone}>{t(status.label)}</Badge>
          {!isApi && <Badge tone={verdict.tone}>{t(verdict.label)}</Badge>}
        </div>
      </div>

      {isApi ? (
        <p className="mt-3 text-xs text-mute-400">
          {t('Roda por HTTP e não precisa instalar nada.')}
        </p>
      ) : (
        <>
          <p className="mt-3 text-xs leading-relaxed text-mute-300">
            {translateReason(item.fit.reason, t)}
          </p>
          <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="uppercase tracking-wide text-mute-500">{t('Tamanho')}</dt>
              <dd className="text-mute-200">
                {item.sizeGb ? `${item.sizeGb} GB` : t('não informado')}
              </dd>
            </div>
            <div>
              <dt className="uppercase tracking-wide text-mute-500">{t('Repositório')}</dt>
              <dd className="truncate text-mute-200" title={item.repo}>
                {item.repo ?? t('não informado')}
              </dd>
            </div>
            <div>
              <dt className="uppercase tracking-wide text-mute-500">{t('VRAM necessária')}</dt>
              <dd className="text-mute-200">
                {item.requires.vramMb ? formatGb(item.requires.vramMb) : t('não informado')}
              </dd>
            </div>
            <div>
              <dt className="uppercase tracking-wide text-mute-500">{t('Disco necessário')}</dt>
              <dd className="text-mute-200">
                {item.requires.diskGb ? `${item.requires.diskGb} GB` : t('não informado')}
              </dd>
            </div>
          </dl>
        </>
      )}

      {!isApi && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {!item.installed && !installing && (
            <Button
              variant="primary"
              onClick={() => onInstall(item)}
              disabled={busyModel === item.id}
            >
              {t('Baixar e instalar')}
            </Button>
          )}
          {installing && (
            <Button variant="danger" onClick={onCancel}>
              {t('Cancelar')}
            </Button>
          )}
          {item.installed && !running && (
            <Button onClick={() => onLoad(item)} disabled={loadingModel !== null}>
              {loading ? (
                <>
                  <span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-mute-400/40 border-t-mute-100" />
                  {t('Carregando o modelo, pode levar alguns minutos')}
                </>
              ) : (
                t('Carregar')
              )}
            </Button>
          )}
          {running && (
            <Button variant="danger" onClick={onUnload}>
              {t('Derrubar')}
            </Button>
          )}
          <Button onClick={() => onApply(item)} disabled={busyModel === item.id}>
            {t('Usar este modelo')}
          </Button>
        </div>
      )}
    </section>
  );
}
