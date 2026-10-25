import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  loadAdminConfig,
  loadAdminStats,
  pingServer,
  saveAdminConfig,
  type AdminServerInfo,
} from '../lib/adminClient';
import type { AdminConfig, AdminStats } from '../lib/adminTypes';
import { navigate } from '../lib/store';
import { ProvidersSection } from './Providers';
import {
  ActivitySection,
  AppSection,
  BrandSection,
  IntegrationsSection,
} from './Manage';
import { Badge, Button, Card, Stat } from './ui';

type SectionId =
  | 'overview'
  | 'providers'
  | 'music'
  | 'app'
  | 'brand'
  | 'integrations'
  | 'activity';

const SECTIONS: Array<{ id: SectionId; label: string; hint: string }> = [
  { id: 'overview', label: 'Visão geral', hint: 'KPIs e saúde da plataforma' },
  { id: 'providers', label: 'Provedores de IA', hint: 'Conecte suas APIs de LLM' },
  { id: 'music', label: 'Geração de música', hint: 'MiniMax nativo, motor local ou LLM' },
  { id: 'app', label: 'Aplicativo', hint: 'Padrões, exportação e diagnóstico' },
  { id: 'brand', label: 'Marca', hint: 'Nome, cores e domínio' },
  { id: 'integrations', label: 'Integrações', hint: 'Storage, CDN e analytics' },
  { id: 'activity', label: 'Atividade', hint: 'Log de eventos da plataforma' },
];

export function AdminApp() {
  const [section, setSection] = useState<SectionId>('overview');
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [server, setServer] = useState<AdminServerInfo | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const info = await pingServer();
    setServer(info);
    const loaded = await loadAdminConfig();
    setConfig(loaded);
    setStats(await loadAdminStats());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const update = useCallback((updater: (current: AdminConfig) => AdminConfig) => {
    setConfig((current) => (current ? updater(current) : current));
    setStatus('idle');
  }, []);

  const save = useCallback(async () => {
    if (!config) return;
    setStatus('saving');
    try {
      const saved = await saveAdminConfig(config);
      setConfig(saved);
      setStats(await loadAdminStats());
      setStatus('saved');
      setError(null);
      window.setTimeout(() => setStatus('idle'), 2400);
    } catch (e) {
      setStatus('error');
      setError(String(e));
    }
  }, [config]);

  const sectionBody = useMemo(() => {
    if (!config) return null;
    switch (section) {
      case 'overview':
        return <Overview config={config} stats={stats} server={server} />;
      case 'providers':
        return <ProvidersSection config={config} update={update} />;
      case 'music':
        return <ProvidersSection config={config} update={update} focus="music" />;
      case 'app':
        return <AppSection config={config} update={update} />;
      case 'brand':
        return <BrandSection config={config} update={update} />;
      case 'integrations':
        return <IntegrationsSection config={config} update={update} />;
      case 'activity':
        return <ActivitySection config={config} />;
      default:
        return null;
    }
  }, [config, section, stats, server, update]);

  return (
    <div className="flex h-full min-h-0 bg-ink-950">
      <aside className="flex w-60 shrink-0 flex-col border-r border-ink-700 bg-ink-900">
        <div className="flex items-center gap-2 border-b border-ink-700 px-4 py-4">
          <img src="/logo-mark.png" alt="" className="h-8 w-8 shrink-0" />
          <div>
            <img src="/logo-wordmark.png" alt="BR Music" className="h-[14px] w-auto" />
            <p className="mt-0.5 text-[10px] uppercase tracking-widest text-mute-500">Admin</p>
          </div>
        </div>

        <nav className="scroll-thin flex-1 overflow-y-auto p-2.5">
          {SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              aria-current={section === item.id}
              className={`mb-0.5 w-full rounded-xl px-3 py-2 text-left transition ${
                section === item.id
                  ? 'bg-ink-700 text-mute-100'
                  : 'text-mute-400 hover:bg-ink-850 hover:text-mute-200'
              }`}
            >
              <span className="block text-sm font-medium">{item.label}</span>
              <span className="block text-[11px] text-mute-500">{item.hint}</span>
            </button>
          ))}
        </nav>

        <div className="border-t border-ink-700 p-3">
          <div className="mb-2 flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${server ? 'bg-brand-500' : 'bg-amber-400'}`}
              aria-hidden
            />
            <span className="text-[11px] text-mute-400">
              {server ? 'Servidor conectado' : 'Servidor offline (modo local)'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/discover')}
            className="w-full rounded-full border border-ink-600 px-4 py-2 text-sm text-mute-300
              transition hover:border-brand-500 hover:text-brand-400"
          >
            Voltar ao app
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-ink-700 bg-ink-900 px-6 py-3.5">
          <div>
            <h1 className="font-display text-lg font-bold text-mute-100">
              {SECTIONS.find((s) => s.id === section)?.label}
            </h1>
            <p className="text-xs text-mute-500">{SECTIONS.find((s) => s.id === section)?.hint}</p>
          </div>
          <div className="flex items-center gap-2">
            {status === 'saved' && <Badge tone="ok">Salvo</Badge>}
            {status === 'error' && <Badge tone="bad">Erro ao salvar</Badge>}
            <Button variant="ghost" onClick={() => void refresh()}>
              Recarregar
            </Button>
            <Button variant="primary" onClick={() => void save()} disabled={status === 'saving'}>
              {status === 'saving' ? 'Salvando…' : 'Salvar alterações'}
            </Button>
          </div>
        </header>

        <div className="scroll-thin flex-1 overflow-y-auto px-6 py-6">
          {error && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}
          {!config ? (
            <p className="text-sm text-mute-500">Carregando configuração…</p>
          ) : (
            sectionBody
          )}
        </div>
      </div>
    </div>
  );
}

function Overview({
  config,
  stats,
  server,
}: {
  config: AdminConfig;
  stats: AdminStats | null;
  server: AdminServerInfo | null;
}) {
  const lastGeneration = stats?.lastGenerationAt
    ? new Date(stats.lastGenerationAt).toLocaleString('pt-BR')
    : '—';

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Músicas geradas"
          value={stats?.totalSongs ?? 0}
          hint={`${stats?.songsToday ?? 0} nas últimas 24h`}
        />
        <Stat
          label="Stems disponíveis"
          value={(stats?.totalSongs ?? 0) * 5}
          hint="5 trilhas por faixa (bateria, baixo, pads, melodia, voz)"
        />
        <Stat
          label="Chamadas de API"
          value={stats?.apiCalls ?? 0}
          hint={`modo: ${config.musicProvider.mode} · ${config.musicProvider.vendor}`}
        />
        <Stat
          label="Última geração"
          value={stats?.lastGenerationAt ? new Date(stats.lastGenerationAt).toLocaleTimeString('pt-BR') : '—'}
          hint="tudo local, sem servidor externo"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card
          title="Status dos provedores de IA"
          description="Qual provedor está habilitado e respondendo."
        >
          <ul className="divide-y divide-ink-800">
            {config.llmProviders.map((provider) => (
              <li key={provider.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm text-mute-100">
                    {provider.label}
                    <span className="ml-2 text-xs text-mute-500">{provider.model}</span>
                  </p>
                  <p className="truncate text-[11px] text-mute-500">{provider.baseUrl}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {provider.lastTest && (
                    <Badge tone={provider.lastTest.ok ? 'ok' : 'bad'}>
                      {provider.lastTest.ok ? 'OK' : 'falhou'} · {provider.lastTest.latencyMs} ms
                    </Badge>
                  )}
                  <Badge tone={provider.enabled ? 'ok' : 'neutral'}>
                    {provider.enabled ? 'ativo' : 'inativo'}
                  </Badge>
                </div>
              </li>
            ))}
            {config.llmProviders.length === 0 && (
              <li className="py-3 text-sm text-mute-500">
                Nenhum provedor cadastrado — vá em “Provedores de IA”.
              </li>
            )}
          </ul>
        </Card>

        <Card title="Atividade recente" description="Últimos eventos registrados pela plataforma.">
          <ul className="space-y-2.5">
            {config.activity.slice(0, 8).map((event) => (
              <li key={event.id} className="flex items-start gap-2.5 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                <div className="min-w-0">
                  <p className="text-mute-200">{event.message}</p>
                  <p className="text-[11px] text-mute-500">
                    {event.kind} · {new Date(event.at).toLocaleString('pt-BR')}
                  </p>
                </div>
              </li>
            ))}
            {config.activity.length === 0 && (
              <li className="py-3 text-sm text-mute-500">Nenhum evento registrado ainda.</li>
            )}
          </ul>
        </Card>
      </div>

      <Card title="Configuração de geração" description="Parâmetros padrão aplicados às novas faixas.">
        <dl className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ['Modelo', config.generation.defaultModel],
            ['BPM padrão', String(config.generation.defaultBpm)],
            ['Weirdness', String(config.generation.defaultWeirdness)],
            ['Influência', String(config.generation.defaultStyleInfluence)],
            ['Variedade', String(config.generation.defaultVariety)],
            ['Duração máx.', `${config.generation.maxDurationSec}s`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-ink-700 bg-ink-850 px-3 py-2">
              <dt className="text-[10px] uppercase tracking-wide text-mute-500">{label}</dt>
              <dd className="mt-0.5 text-sm text-mute-100">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[11px] text-mute-500">
          Última geração: {lastGeneration} · servidor:{' '}
          {server ? `modo ${server.musicMode}/${server.musicVendor}` : 'offline'}
        </p>
      </Card>
    </div>
  );
}
