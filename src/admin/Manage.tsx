import { useEffect, useState } from 'react';
import type { AdminConfig } from '../lib/adminTypes';
import { isDesktop } from '../lib/export';
import { Badge, Button, Card, Field, Select, TextInput, Toggle } from './ui';
import { ConfirmDialog } from '../components/ConfirmDialog';

type Update = (updater: (current: AdminConfig) => AdminConfig) => void;

export function AppSection({ config, update }: { config: AdminConfig; update: Update }) {
  const app = config.app;
  const patch = (partial: Partial<typeof app>) =>
    update((c) => ({ ...c, app: { ...c.app, ...partial } }));

  const [info, setInfo] = useState<{ version: string; platform: string; electron: string } | null>(
    null,
  );
  const [usage, setUsage] = useState<string>('—');
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (isDesktop()) {
      void window.desktop!.getInfo().then((i) => setInfo(i));
    }
    if (navigator.storage?.estimate) {
      void navigator.storage.estimate().then((e) => {
        const mb = ((e.usage ?? 0) / 1048576).toFixed(1);
        setUsage(`${mb} MB`);
      });
    }
  }, []);

  return (
    <div className="space-y-5">
      <Card title="Comportamento do aplicativo" description="Como o app cria, toca e exporta.">
        <div className="grid gap-3 md:grid-cols-2">
          <Toggle
            label="Tocar automaticamente após gerar"
            hint="Começa a reprodução assim que a faixa fica pronta."
            checked={app.autoplayAfterGenerate}
            onChange={(autoplayAfterGenerate) => patch({ autoplayAfterGenerate })}
          />
          <Toggle
            label="Mostrar forma de onda real"
            hint="Desenha os picos do áudio sintetizado no player."
            checked={app.showWaveform}
            onChange={(showWaveform) => patch({ showWaveform })}
          />
          <Toggle
            label="Exportar stems junto do mix"
            hint="Gera o ZIP de stems sempre que a faixa é salva."
            checked={app.exportStemsOnSave}
            onChange={(exportStemsOnSave) => patch({ exportStemsOnSave })}
          />
          <Toggle
            label="Baixar automaticamente ao gerar"
            hint="Salva o WAV na pasta de downloads do sistema."
            checked={false}
            onChange={() => undefined}
          />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Field label="Variações por lote" hint="Quantas versões geradas de uma vez.">
            <TextInput
              type="number"
              min={1}
              max={8}
              value={app.variationsPerBatch}
              onChange={(e) => patch({ variationsPerBatch: Number(e.target.value) })}
            />
          </Field>
          <Field label="Crossfade (ms)" hint="Transição entre faixas no player.">
            <TextInput
              type="number"
              min={0}
              max={2000}
              step={50}
              value={app.crossfadeMs}
              onChange={(e) => patch({ crossfadeMs: Number(e.target.value) })}
            />
          </Field>
          <Field label="Formato de exportação">
            <Select value={app.exportFormat} onChange={() => patch({ exportFormat: 'wav' })}>
              <option value="wav">WAV (16 bits, 44,1 kHz)</option>
            </Select>
          </Field>
          <Field
            label="Pasta padrão de exportação"
            hint="Usada pelo app desktop (Electron)."
            className="md:col-span-3"
          >
            <TextInput
              value={app.defaultExportDir}
              onChange={(e) => patch({ defaultExportDir: e.target.value })}
              placeholder={info ? 'ex.: /home/usuário/Música' : 'Definido pelo app desktop'}
            />
          </Field>
        </div>
      </Card>

      <Card title="Diagnóstico" description="Ambiente em que o app está rodando.">
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Ambiente', isDesktop() ? 'Desktop (Electron)' : 'Navegador / PWA'],
            ['Versão do app', info?.version ?? 'web'],
            ['Plataforma', info?.platform ?? navigator.platform],
            ['Runtime', info?.electron ?? `navegador ${navigator.userAgent.slice(0, 48)}…`],
            ['Armazenamento usado', usage],
            ['Motor', 'Procedural (Web Audio)'],
            ['Amostragem', '44.1 kHz · estéreo'],
            ['Stems', '5 trilhas por faixa'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-ink-700 bg-ink-850 px-3 py-2">
              <dt className="text-[10px] uppercase tracking-wide text-mute-500">{label}</dt>
              <dd className="mt-0.5 truncate text-sm text-mute-100">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card title="Dados locais" description="Tudo fica neste dispositivo.">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="danger" onClick={() => setConfirmClear(true)}>
            Limpar biblioteca e cache
          </Button>
          <Badge tone="neutral">Ação local, sem upload</Badge>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmClear}
        danger
        title="Apagar todos os dados locais?"
        description="Todas as músicas, capas, stems, playlists e configurações salvas neste navegador serão apagados deste dispositivo. Não há como desfazer."
        details={[
          'Biblioteca de músicas e stems',
          'Playlists criadas',
          'Configuração de provedores de IA',
        ]}
        confirmLabel="Apagar tudo"
        cancelLabel="Cancelar"
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          localStorage.clear();
          indexedDB.deleteDatabase('brmusic');
          window.location.reload();
        }}
      />
    </div>
  );
}

export function BrandSection({ config, update }: { config: AdminConfig; update: Update }) {
  const patch = (partial: Partial<AdminConfig['brand']>) =>
    update((c) => ({ ...c, brand: { ...c.brand, ...partial } }));

  return (
    <div className="space-y-5">
      <Card title="Identidade" description="Nome, marca e cores aplicadas na interface.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Nome do site">
            <TextInput value={config.brand.siteName} onChange={(e) => patch({ siteName: e.target.value })} />
          </Field>
          <Field label="Texto do logo">
            <TextInput value={config.brand.logoText} onChange={(e) => patch({ logoText: e.target.value })} />
          </Field>
          <Field label="Domínio">
            <TextInput value={config.brand.domain} onChange={(e) => patch({ domain: e.target.value })} />
          </Field>
          <Field label="Cor primária">
            <div className="flex gap-2">
              <input
                type="color"
                value={config.brand.primaryColor}
                onChange={(e) => patch({ primaryColor: e.target.value })}
                aria-label="Cor primária"
                className="h-10 w-12 cursor-pointer rounded-lg border border-ink-700 bg-ink-850"
              />
              <TextInput
                value={config.brand.primaryColor}
                onChange={(e) => patch({ primaryColor: e.target.value })}
              />
            </div>
          </Field>
          <Field label="Cor de destaque">
            <div className="flex gap-2">
              <input
                type="color"
                value={config.brand.accentColor}
                onChange={(e) => patch({ accentColor: e.target.value })}
                aria-label="Cor de destaque"
                className="h-10 w-12 cursor-pointer rounded-lg border border-ink-700 bg-ink-850"
              />
              <TextInput
                value={config.brand.accentColor}
                onChange={(e) => patch({ accentColor: e.target.value })}
              />
            </div>
          </Field>
          <Field label="E-mail de suporte">
            <TextInput
              value={config.brand.supportEmail}
              onChange={(e) => patch({ supportEmail: e.target.value })}
            />
          </Field>
          <Field label="Idioma">
            <Select value={config.brand.locale} onChange={(e) => patch({ locale: e.target.value })}>
              <option value="pt-BR">Português (Brasil)</option>
              <option value="pt-PT">Português (Portugal)</option>
              <option value="en-US">English (US)</option>
              <option value="es-ES">Español</option>
            </Select>
          </Field>
          <Field label="Moeda de referência">
            <Select value={config.brand.currency} onChange={(e) => patch({ currency: e.target.value })}>
              <option value="BRL">BRL — R$</option>
              <option value="USD">USD — $</option>
              <option value="EUR">EUR — €</option>
            </Select>
          </Field>
        </div>
      </Card>
    </div>
  );
}

export function IntegrationsSection({ config, update }: { config: AdminConfig; update: Update }) {
  const patch = (partial: Partial<AdminConfig['integrations']>) =>
    update((c) => ({ ...c, integrations: { ...c.integrations, ...partial } }));

  return (
    <div className="space-y-5">
      <Card
        title="Armazenamento e CDN"
        description="Onde os arquivos de áudio ficam guardados. Por padrão, tudo é local."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Provedor">
            <Select
              value={config.integrations.storageProvider}
              onChange={(e) => patch({ storageProvider: e.target.value })}
            >
              <option value="indexeddb">IndexedDB (local, sem servidor)</option>
              <option value="s3">Amazon S3</option>
              <option value="r2">Cloudflare R2</option>
              <option value="gcs">Google Cloud Storage</option>
            </Select>
          </Field>
          <Field label="Bucket">
            <TextInput
              value={config.integrations.storageBucket}
              onChange={(e) => patch({ storageBucket: e.target.value })}
            />
          </Field>
          <Field label="URL do CDN">
            <TextInput
              value={config.integrations.cdnUrl}
              onChange={(e) => patch({ cdnUrl: e.target.value })}
            />
          </Field>
        </div>
        <div className="mt-4">
          <Toggle
            label="Manter arquivos locais por padrão"
            hint="Quando ligado, o áudio fica no IndexedDB do navegador em vez de ir para o storage configurado."
            checked={config.integrations.storageProvider === 'indexeddb'}
            onChange={(checked) => patch({ storageProvider: checked ? 'indexeddb' : 's3' })}
          />
        </div>
      </Card>

      <Card title="Telemetria opcional" description="Tudo desligado por padrão — o app não coleta nada.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="ID de analytics">
            <TextInput
              value={config.integrations.analyticsId}
              onChange={(e) => patch({ analyticsId: e.target.value })}
              placeholder="vazio = sem telemetria"
            />
          </Field>
          <Field label="Cloudflare Turnstile (chave pública)">
            <TextInput
              value={config.integrations.cloudflareTurnstileKey}
              onChange={(e) => patch({ cloudflareTurnstileKey: e.target.value })}
              placeholder="opcional"
            />
          </Field>
        </div>
      </Card>
    </div>
  );
}

export function ActivitySection({ config }: { config: AdminConfig }) {
  const [filter, setFilter] = useState<string>('all');

  const events = config.activity.filter((e) => filter === 'all' || e.kind === filter);

  return (
    <Card
      title="Log de atividade"
      description="Eventos gerados pelo painel e pela API."
      actions={
        <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-40">
          <option value="all">Todos</option>
          <option value="generation">Geração</option>
          <option value="config">Configuração</option>
          <option value="user">Usuários</option>
          <option value="billing">Billing</option>
        </Select>
      }
    >
      <ul className="divide-y divide-ink-800">
        {events.map((event) => (
          <li key={event.id} className="flex items-start justify-between gap-4 py-2.5">
            <div>
              <p className="text-sm text-mute-200">{event.message}</p>
              <p className="text-[11px] text-mute-500">
                {event.kind} · por {event.actor}
              </p>
            </div>
            <span className="shrink-0 text-xs text-mute-500">
              {new Date(event.at).toLocaleString('pt-BR')}
            </span>
          </li>
        ))}
        {events.length === 0 && (
          <li className="py-6 text-center text-sm text-mute-500">Nenhum evento registrado.</li>
        )}
      </ul>
    </Card>
  );
}
