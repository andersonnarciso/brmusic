import { useState } from 'react';
import type { AdminConfig, LlmProviderConfig, MusicProviderConfig } from '../lib/adminTypes';
import {
  MINIMAX_MUSIC_MODELS,
  MUSIC_MODES,
  PROVIDER_PRESETS,
} from '../lib/adminTypes';
import {
  discoverLocalRuntimes,
  testLlmProvider,
  testMusicProvider,
  type LocalRuntime,
} from '../lib/adminClient';
import { Badge, Button, Card, Field, Select, TextInput, Toggle } from './ui';

type Update = (updater: (current: AdminConfig) => AdminConfig) => void;

export function ProvidersSection({
  config,
  update,
  focus,
}: {
  config: AdminConfig;
  update: Update;
  focus?: 'music';
}) {
  if (focus === 'music') {
    return <MusicProviderSection config={config} update={update} />;
  }
  return (
    <div className="space-y-5">
      <Card
        title="Provedores de LLM"
        description="Conecte a API que escreve as letras, o plano musical e o estilo. Tudo OpenAI-compatible funciona."
        actions={
          <Button
            onClick={() =>
              update((c) => ({
                ...c,
                llmProviders: [
                  ...c.llmProviders,
                  {
                    id: `prov-${Date.now().toString(36)}`,
                    label: 'Novo provedor',
                    preset: 'openai',
                    baseUrl: 'https://api.openai.com/v1',
                    endpoint: '/chat/completions',
                    model: 'gpt-4o-mini',
                    apiKey: '',
                    temperature: 0.8,
                    maxTokens: 2000,
                    timeoutMs: 45000,
                    jsonMode: true,
                    enabled: false,
                  },
                ],
              }))
            }
          >
            + Adicionar provedor
          </Button>
        }
      >
        <p className="text-xs text-mute-500">
          A chave fica gravada no servidor (<code>server/data/config.json</code>) e nunca é devolvida
          ao navegador — o painel mostra apenas a máscara. Com o servidor offline, tudo é salvo no
          localStorage deste navegador.
        </p>
      </Card>

      {config.llmProviders.map((provider) => (
        <ProviderCard
          key={provider.id}
          provider={provider}
          onChange={(next) =>
            update((c) => ({
              ...c,
              llmProviders: c.llmProviders.map((p) => (p.id === next.id ? next : p)),
            }))
          }
          onRemove={() =>
            update((c) => ({
              ...c,
              llmProviders: c.llmProviders.filter((p) => p.id !== provider.id),
            }))
          }
        />
      ))}

      <LocalRuntimeScanner
        onUse={(runtime) =>
          update((c) => ({
            ...c,
            llmProviders: [
              ...c.llmProviders,
              {
                id: `local-${runtime.id}-${runtime.port}`,
                label: runtime.label,
                preset: (runtime.id as LlmProviderConfig['preset']) ?? 'custom',
                baseUrl: runtime.apiBase,
                endpoint: runtime.endpoint,
                model: runtime.models[0] ?? 'local-model',
                apiKey: '',
                temperature: 0.8,
                maxTokens: 2000,
                timeoutMs: 120000,
                jsonMode: true,
                enabled: true,
              },
            ],
          }))
        }
      />

      {config.llmProviders.length === 0 && (
        <p className="rounded-xl border border-dashed border-ink-700 px-5 py-8 text-center text-sm text-mute-500">
          Nenhum provedor cadastrado. Use “+ Adicionar provedor” ou a varredura de runtimes locais.
        </p>
      )}
    </div>
  );
}

/**
 * Varre as portas locais e mostra quais runtimes de LLM estão rodando
 * na máquina — Ollama, LM Studio, llama.cpp, KoboldCpp, GPT4All, vLLM, Jan,
 * text-generation-webui e SGLang.
 */
function LocalRuntimeScanner({ onUse }: { onUse: (runtime: LocalRuntime) => void }) {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{ runtimes: LocalRuntime[]; scanned: number } | null>(null);

  const run = async () => {
    setScanning(true);
    setResult(await discoverLocalRuntimes());
    setScanning(false);
  };

  return (
    <Card
      title="Runtimes locais de LLM"
      description="Procura servidores OpenAI-compatible rodando na sua máquina e lista os modelos de cada um."
      actions={
        <Button onClick={() => void run()} disabled={scanning}>
          {scanning ? 'Procurando…' : 'Descobrir runtimes locais'}
        </Button>
      }
    >
      {result && result.runtimes.length === 0 && (
        <p className="text-sm text-mute-500">
          Nenhum runtime encontrado em {result.scanned} portas conhecidas. Verifique se o servidor
          está no ar (por exemplo, <code>ollama serve</code> ou{' '}
          <code>llama-server --port 8080</code>).
        </p>
      )}

      {result && result.runtimes.length > 0 && (
        <ul className="space-y-2">
          {result.runtimes.map((runtime) => (
            <li
              key={`${runtime.id}-${runtime.port}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-700 bg-ink-850 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-mute-100">
                  {runtime.label}
                  <span className="ml-2 text-xs text-mute-500">:{runtime.port}</span>
                </p>
                <p className="truncate text-[11px] text-mute-500">
                  {runtime.models.length > 0
                    ? runtime.models.join(', ')
                    : 'sem modelos listados pelo servidor'}
                </p>
              </div>
              <Button onClick={() => onUse(runtime)}>Usar</Button>
            </li>
          ))}
        </ul>
      )}

      {!result && (
        <p className="text-xs text-mute-500">
          Portas verificadas: Ollama (11434), LM Studio (1234), llama.cpp (8080), Jan (1337),
          text-generation-webui (5000), KoboldCpp (5001), GPT4All (4891), vLLM (8000) e SGLang
          (30000).
        </p>
      )}
    </Card>
  );
}

function ProviderCard({
  provider,
  onChange,
  onRemove,
}: {
  provider: LlmProviderConfig;
  onChange: (next: LlmProviderConfig) => void;
  onRemove: () => void;
}) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; latencyMs: number } | null>(
    null,
  );

  const preset = PROVIDER_PRESETS.find((p) => p.id === provider.preset);

  const applyPreset = (id: string) => {
    const next = PROVIDER_PRESETS.find((p) => p.id === id);
    if (!next) return;
    onChange({
      ...provider,
      preset: next.id,
      baseUrl: next.baseUrl,
      endpoint: next.endpoint,
      model: next.models[0] ?? provider.model,
    });
  };

  const runTest = async () => {
    setTesting(true);
    const res = await testLlmProvider(provider.id);
    setResult(res);
    setTesting(false);
  };

  return (
    <Card
      title={provider.label}
      description={preset?.hint}
      actions={
        <>
          {provider.lastTest && (
            <Badge tone={provider.lastTest.ok ? 'ok' : 'bad'}>
              {provider.lastTest.ok ? 'conectado' : 'erro'} · {provider.lastTest.latencyMs} ms
            </Badge>
          )}
          <Badge tone={provider.enabled ? 'ok' : 'neutral'}>
            {provider.enabled ? 'ativo' : 'inativo'}
          </Badge>
          <Button onClick={() => void runTest()} disabled={testing}>
            {testing ? 'Testando…' : 'Testar conexão'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Nome">
          <TextInput
            value={provider.label}
            onChange={(e) => onChange({ ...provider, label: e.target.value })}
          />
        </Field>

        <Field label="Compatibilidade" hint="Define URL e formato da requisição.">
          <Select value={provider.preset} onChange={(e) => applyPreset(e.target.value)}>
            {PROVIDER_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Modelo">
          {preset && preset.models.length > 0 ? (
            <>
              <TextInput
                list={`models-${provider.id}`}
                value={provider.model}
                onChange={(e) => onChange({ ...provider, model: e.target.value })}
              />
              <datalist id={`models-${provider.id}`}>
                {preset.models.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </>
          ) : (
            <TextInput
              value={provider.model}
              onChange={(e) => onChange({ ...provider, model: e.target.value })}
            />
          )}
        </Field>

        <Field label="Base URL">
          <TextInput
            value={provider.baseUrl}
            onChange={(e) => onChange({ ...provider, baseUrl: e.target.value })}
          />
        </Field>

        <Field label="Endpoint">
          <TextInput
            value={provider.endpoint}
            onChange={(e) => onChange({ ...provider, endpoint: e.target.value })}
          />
        </Field>

        <Field label="Chave da API" hint="Gravada apenas no servidor.">
          <TextInput
            type="password"
            placeholder={provider.apiKey || 'sk-…'}
            value={provider.apiKey}
            onChange={(e) => onChange({ ...provider, apiKey: e.target.value })}
          />
        </Field>

        <Field label="Temperatura">
          <TextInput
            type="number"
            step={0.1}
            min={0}
            max={2}
            value={provider.temperature}
            onChange={(e) => onChange({ ...provider, temperature: Number(e.target.value) })}
          />
        </Field>

        <Field label="Tokens máx.">
          <TextInput
            type="number"
            step={100}
            min={64}
            value={provider.maxTokens}
            onChange={(e) => onChange({ ...provider, maxTokens: Number(e.target.value) })}
          />
        </Field>

        <Field label="Timeout (ms)">
          <TextInput
            type="number"
            step={1000}
            min={5000}
            value={provider.timeoutMs}
            onChange={(e) => onChange({ ...provider, timeoutMs: Number(e.target.value) })}
          />
        </Field>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Toggle
          label="Provedor habilitado"
          hint="Usado quando o modo de geração é “Plano via LLM”."
          checked={provider.enabled}
          onChange={(enabled) => onChange({ ...provider, enabled })}
        />
        <Toggle
          label="Resposta em JSON"
          hint="Envia response_format=json_object quando o provedor suporta."
          checked={provider.jsonMode}
          onChange={(jsonMode) => onChange({ ...provider, jsonMode })}
        />
      </div>

      {result && (
        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
            result.ok
              ? 'border-brand-500/30 bg-brand-500/10 text-brand-400'
              : 'border-red-500/30 bg-red-500/10 text-red-300'
          }`}
        >
          {result.ok ? 'Conexão OK' : 'Falhou'} · {result.latencyMs} ms — {result.message}
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <Button variant="danger" onClick={onRemove}>
          Remover provedor
        </Button>
      </div>
    </Card>
  );
}

function MusicProviderSection({ config, update }: { config: AdminConfig; update: Update }) {
  const music = config.musicProvider;
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const patch = (partial: Partial<MusicProviderConfig>) =>
    update((c) => ({ ...c, musicProvider: { ...c.musicProvider, ...partial } }));

  const isMiniMax = music.vendor === 'minimax';

  const runTest = async () => {
    setTesting(true);
    const res = await testMusicProvider();
    setResult({ ok: res.ok, message: res.message });
    setTesting(false);
  };

  return (
    <div className="space-y-5">
      <Card
        title="Modo de geração"
        description="Escolha quem gera o áudio final da música."
      >
        <div className="grid gap-3 md:grid-cols-3">
          {MUSIC_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => patch({ mode: mode.id })}
              aria-pressed={music.mode === mode.id}
              className={`rounded-2xl border p-4 text-left transition ${
                music.mode === mode.id
                  ? 'border-brand-500 bg-brand-500/5'
                  : 'border-ink-700 bg-ink-850 hover:border-ink-600'
              }`}
            >
              <p className="text-sm font-semibold text-mute-100">{mode.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-mute-500">{mode.description}</p>
            </button>
          ))}
        </div>
      </Card>

      <Card
        title="Provedor de áudio"
        description="Inclui o modo nativo da API de Música da MiniMax (POST /v1/music_generation)."
        actions={
          <>
            <Badge tone={music.enabled ? 'ok' : 'neutral'}>
              {music.enabled ? 'ativo' : 'inativo'}
            </Badge>
            {isMiniMax && (
              <Button onClick={() => void runTest()} disabled={testing}>
                {testing ? 'Gerando…' : 'Testar (gera 1 faixa)'}
              </Button>
            )}
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Provedor">
            <Select
              value={music.vendor}
              onChange={(e) => {
                const vendor = e.target.value as MusicProviderConfig['vendor'];
                patch({
                  vendor,
                  baseUrl: vendor === 'minimax' ? 'https://api.minimax.io/v1' : music.baseUrl,
                  endpoint: vendor === 'minimax' ? '/music_generation' : music.endpoint,
                  model: vendor === 'minimax' ? 'music-3.0' : music.model,
                });
              }}
            >
              <option value="local">Motor local (navegador)</option>
              <option value="minimax">MiniMax Music (nativo)</option>
              <option value="custom">Personalizado</option>
              <option value="replicate">Replicate</option>
            </Select>
          </Field>

          <Field label="Base URL">
            <TextInput
              value={music.baseUrl}
              onChange={(e) => patch({ baseUrl: e.target.value })}
            />
          </Field>

          <Field label="Endpoint">
            <TextInput
              value={music.endpoint}
              onChange={(e) => patch({ endpoint: e.target.value })}
            />
          </Field>

          <Field label="Modelo">
            {isMiniMax ? (
              <Select value={music.model} onChange={(e) => patch({ model: e.target.value })}>
                {MINIMAX_MUSIC_MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            ) : (
              <TextInput value={music.model} onChange={(e) => patch({ model: e.target.value })} />
            )}
          </Field>

          <Field label="Chave da API" hint="Bearer token. Ficará só no servidor.">
            <TextInput
              type="password"
              placeholder={music.apiKey || 'sk-…'}
              value={music.apiKey}
              onChange={(e) => patch({ apiKey: e.target.value })}
            />
          </Field>

          <Field label="Formato de saída" hint="hex retorna o áudio embutido na resposta.">
            <Select
              value={music.outputFormat}
              onChange={(e) => patch({ outputFormat: e.target.value as 'hex' | 'url' })}
            >
              <option value="hex">hex (embutido)</option>
              <option value="url">url (expira em 24h)</option>
            </Select>
          </Field>

          <Field label="Formato de áudio">
            <Select
              value={music.audioFormat}
              onChange={(e) => patch({ audioFormat: e.target.value as 'mp3' | 'wav' | 'pcm' })}
            >
              <option value="mp3">mp3</option>
              <option value="wav">wav</option>
              <option value="pcm">pcm</option>
            </Select>
          </Field>

          <Field label="Sample rate">
            <Select
              value={music.sampleRate}
              onChange={(e) =>
                patch({ sampleRate: Number(e.target.value) as MusicProviderConfig['sampleRate'] })
              }
            >
              {[16000, 24000, 32000, 44100].map((sr) => (
                <option key={sr} value={sr}>
                  {sr} Hz
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Bitrate">
            <Select
              value={music.bitrate}
              onChange={(e) =>
                patch({ bitrate: Number(e.target.value) as MusicProviderConfig['bitrate'] })
              }
            >
              {[32000, 64000, 128000, 256000].map((br) => (
                <option key={br} value={br}>
                  {br / 1000} kbps
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Duração alvo (s)">
            <TextInput
              type="number"
              min={10}
              max={300}
              value={music.durationSec}
              onChange={(e) => patch({ durationSec: Number(e.target.value) })}
            />
          </Field>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Toggle
            label="Provedor de áudio habilitado"
            hint="Quando desligado, o app usa o motor local mesmo com o modo configurado aqui."
            checked={music.enabled}
            onChange={(enabled) => patch({ enabled })}
          />
          <Toggle
            label="Otimizador de letras (MiniMax)"
            hint="lyrics_optimizer: o modelo escreve a letra a partir do prompt quando não há letra."
            checked={music.lyricsOptimizer}
            onChange={(lyricsOptimizer) => patch({ lyricsOptimizer })}
          />
        </div>

        {isMiniMax && (
          <div className="mt-4 rounded-xl border border-ink-700 bg-ink-850 p-4 text-xs text-mute-400">
            <p className="mb-1.5 font-medium text-mute-200">Modo nativo MiniMax</p>
            <p>
              POST <code className="text-mute-200">{music.baseUrl}{music.endpoint}</code> com{' '}
              <code className="text-mute-200">Authorization: Bearer &lt;API_KEY&gt;</code>. O corpo usa{' '}
              <code className="text-mute-200">model</code>, <code className="text-mute-200">prompt</code>,{' '}
              <code className="text-mute-200">lyrics</code>,{' '}
              <code className="text-mute-200">output_format</code> e{' '}
              <code className="text-mute-200">audio_setting</code>. A resposta traz{' '}
              <code className="text-mute-200">data.audio</code> em hexadecimal e{' '}
              <code className="text-mute-200">base_resp.status_code</code> (1002 = rate limit, 1004 =
              autenticação, 1008 = saldo, 1026 = conteúdo bloqueado).
            </p>
          </div>
        )}

        {result && (
          <div
            className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
              result.ok
                ? 'border-brand-500/30 bg-brand-500/10 text-brand-400'
                : 'border-red-500/30 bg-red-500/10 text-red-300'
            }`}
          >
            {result.ok ? 'Teste OK' : 'Teste falhou'} — {result.message}
          </div>
        )}
      </Card>

      <Card title="Parâmetros padrão de geração" description="Aplicados a toda nova criação.">
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
          <Field label="Modelo padrão">
            <TextInput
              value={config.generation.defaultModel}
              onChange={(e) =>
                update((c) => ({
                  ...c,
                  generation: { ...c.generation, defaultModel: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="BPM padrão">
            <TextInput
              type="number"
              value={config.generation.defaultBpm}
              onChange={(e) =>
                update((c) => ({
                  ...c,
                  generation: { ...c.generation, defaultBpm: Number(e.target.value) },
                }))
              }
            />
          </Field>
          <Field label="Weirdness padrão">
            <TextInput
              type="number"
              min={0}
              max={100}
              value={config.generation.defaultWeirdness}
              onChange={(e) =>
                update((c) => ({
                  ...c,
                  generation: { ...c.generation, defaultWeirdness: Number(e.target.value) },
                }))
              }
            />
          </Field>
          <Field label="Influência do estilo">
            <TextInput
              type="number"
              min={0}
              max={100}
              value={config.generation.defaultStyleInfluence}
              onChange={(e) =>
                update((c) => ({
                  ...c,
                  generation: { ...c.generation, defaultStyleInfluence: Number(e.target.value) },
                }))
              }
            />
          </Field>
          <Field label="Variedade">
            <TextInput
              type="number"
              min={0}
              max={4}
              value={config.generation.defaultVariety}
              onChange={(e) =>
                update((c) => ({
                  ...c,
                  generation: { ...c.generation, defaultVariety: Number(e.target.value) },
                }))
              }
            />
          </Field>
          <Field label="Duração máxima (s)">
            <TextInput
              type="number"
              value={config.generation.maxDurationSec}
              onChange={(e) =>
                update((c) => ({
                  ...c,
                  generation: { ...c.generation, maxDurationSec: Number(e.target.value) },
                }))
              }
            />
          </Field>
          <Field label="Créditos mensais">
            <TextInput
              type="number"
              value={config.generation.monthlyCredits}
              onChange={(e) =>
                update((c) => ({
                  ...c,
                  generation: { ...c.generation, monthlyCredits: Number(e.target.value) },
                }))
              }
            />
          </Field>
          <Field label="Concorrência da fila">
            <TextInput
              type="number"
              min={1}
              value={config.generation.queueConcurrency}
              onChange={(e) =>
                update((c) => ({
                  ...c,
                  generation: { ...c.generation, queueConcurrency: Number(e.target.value) },
                }))
              }
            />
          </Field>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Toggle
            label="Permitir download"
            checked={config.generation.allowDownload}
            onChange={(allowDownload) =>
              update((c) => ({
                ...c,
                generation: { ...c.generation, allowDownload },
              }))
            }
          />
          <Toggle
            label="Moderação automática"
            hint="Bloqueia prompts com termos proibidos antes da geração."
            checked={config.generation.autoModeration}
            onChange={(autoModeration) =>
              update((c) => ({
                ...c,
                generation: { ...c.generation, autoModeration },
              }))
            }
          />
        </div>
      </Card>
    </div>
  );
}
