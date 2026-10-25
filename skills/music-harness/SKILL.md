---
name: music-harness
description: Conduza o pipeline de geração de música do BR Music de forma programática, sem UI. Use quando precisar criar faixas a partir de uma ideia, medir a qualidade do mix (LUFS, pico, dinâmica, clipping), extrair os stems ou automatizar gerações em lote. O harness é o runtime interno do app (ideia → prompt → letra → plano → arranjo → render → stems → master → export) e roda por trás do botão "Criar música".
---

# Harness de música do BR Music

## O que é o harness

O harness é a camada que conduz a geração por dentro do app. Ele **não é uma tela**:
a pessoa clica em "Criar música" e o harness executa nove etapas internamente,
mostrando apenas o estado atual e o laudo final.

| Etapa | O que faz | Onde |
|---|---|---|
| Ideia | normaliza a descrição | `src/lib/harness.ts` |
| Prompt | junta ideia, estilo, preset e andamento | `buildPrompt()` |
| Letra | LLM configurado no painel, com gerador local de reserva | `src/lib/lyrics.ts` |
| Plano | BPM, tonalidade, escala, progressão e seções | LLM via `POST /api/generate` ou `buildLocalPlan()` |
| Arranjo | instrumentação e energia por trecho | `buildArrangement()` |
| Render | síntese do áudio (Web Audio) | `src/lib/audio/engine.ts` |
| Stems | bateria, baixo, pads, melodia e voz em canais separados | `engine.ts` (mixer de 14 canais) |
| Mix e Master | remaster, normalização de pico para -1 dBFS | `src/lib/audio/edit.ts` |
| Export | WAV, ZIP de stems, FTP | `src/lib/export.ts` |

## Como usar como agente

### Opção 1: CLI (recomendado)

```bash
cd /home/anderson/Projetos/brmusic
npm run build            # o CLI usa dist/
node server/index.mjs &  # backend local (config, letras, planos)

node scripts/harness-cli.mjs "sertanejo brasileiro com sanfona, 120 bpm" --out ./faixas
```

O CLI abre o app em um Chrome headless, dispara a criação, espera o harness
terminar e grava o WAV masterizado em `--out`, junto de `relatorio.json` com o
laudo de qualidade. Opções: `--style`, `--instrumental`, `--out`, `--json`.

### Opção 2: pelo app, via CDP

1. Abra `http://127.0.0.1:4321/#/create` em um Chrome com `--remote-debugging-port`.
2. Preencha o campo "Descrição" e clique em "Criar música".
3. Acompanhe a etapa atual no botão (o store expõe `harnessStage`).
4. Ao terminar, o badge na linha da faixa mostra o LUFS da masterização.

### Opção 3: módulo TypeScript

```ts
import { runHarness } from './src/lib/harness';

const result = await runHarness({
  idea: 'sertanejo brasileiro com sanfona',
  style: '120 bpm, voz masculina',
  instrumental: false,
  onStage: (id, status, detail) => console.log(id, status, detail),
});
// result.wav, result.report.lufs, result.report.peakDb, result.plan
```

## Laudo de qualidade (gate antes de publicar)

| Métrica | Alvo | Interpretação |
|---|---|---|
| Pico | <= -1 dBFS | o harness normaliza automaticamente |
| Loudness | -16 a -11 LUFS | streams de música costumam ficar em -14 |
| Dinâmica | > 6 dB | abaixo disso a mixagem está esmagada |
| Clipping | 0 amostras | acima de 0,1% do total, corrigir |
| Largura estéreo | > 5% | abaixo disso a mixagem está quase mono |

`analyzeQuality(buffer)` devolve essas métricas e um veredito em português.

## Regras

- O motor padrão é **procedural e local**: nenhuma faixa é pré-gravada, e o
  sintetizador roda no navegador. Para áudio com modelo treinado, configure um
  provedor de áudio externo no painel (modo "Áudio externo").
- As etapas de texto usam o LLM configurado; sem provedor, há geradores locais
  para o app funcionar offline.
- A letra, o plano e o master são editáveis antes do render: rode as etapas
  separadamente em vez de sempre executar o pipeline inteiro.
- Ao gerar em lote, varie a seed (o hash do prompt com o horário) para não
  repetir a mesma faixa.

## Arquivos úteis

- `src/lib/harness.ts`: pipeline, plano local, arranjo e laudo
- `src/lib/audio/engine.ts`: síntese e separação de stems
- `src/lib/audio/edit.ts`: corte, reverso, velocidade, fades, ganho e remaster
- `src/lib/audio/presets.ts`: estilos (palavras-chave em português e inglês)
- `src/lib/lyrics.ts`: gerador de letra com LLM e reserva local
- `scripts/harness-cli.mjs`: automação headless
