# BR Music v1.0.3

## English

**A working language switch, lyrics that actually get written, and the audio provider wired for real.**

### Language switch

English is now the primary language and Portuguese (pt-BR) the secondary one, on every screen and in the native menu of the desktop app on Linux, Windows and macOS. The switcher sits on the landing header, in the sidebar footer and in More. The choice is remembered between sessions.

### Fixes

- **The desktop app never talked to its own backend.** The interface runs under `file://`, so `fetch('/api/...')` resolved to `file:///api/...` and failed silently. Everything that needs the server (lyrics, audio provider, settings) now resolves the right origin.
- **"Generate lyrics" only showed an error.** The guard ignored the theme typed in the lyrics field. That field is a valid theme now, and the reason for a local fallback is shown instead of failing quietly.
- **The model answered with a truncated letter.** Reasoning models spend a large and unpredictable part of the token budget thinking first (one run used 26k tokens of reasoning), so the reply came back cut mid-thought or with the model's own scratchpad mixed in. The lyrics route now asks for a bigger budget and retries when the model reports a truncation, and the response is cleaned before it reaches the app.
- **The external audio provider was never called.** The app always rendered locally. It now uses the configured provider, and when the provider fails the local engine takes over with an explanation.

### Audio provider

The hosted MiniMax Music API was discontinued for new accounts on 20/08/2026 (HTTP 410, status 2153). The settings panel explains this, and the app disables that provider instead of retrying a dead endpoint on every track.

New preset: **MiniMax Music 3 self-hosted** (`POST /v1/audio/speech`, `model: MiniMaxAI/MiniMax-Music3`), the open source model served by SGLang-Omni on an NVIDIA GPU.

### Packaging

`server/data` no longer ships inside the app. It carried local API keys and FTP credentials from the build machine.

## Português

**Troca de idioma funcionando, letra sendo escrita de verdade e provedor de áudio ligado de fato.**

### Troca de idioma

Inglês é agora o idioma principal e português (pt-BR) o secundário, em todas as telas e também no menu nativo do app desktop em Linux, Windows e macOS. O seletor fica no cabeçalho da landing, no rodapé da barra lateral e em Mais. A escolha fica salva entre sessões.

### Correções

- **O app desktop nunca falava com o próprio backend.** A interface roda em `file://`, então `fetch('/api/...')` virava `file:///api/...` e falhava em silêncio. Tudo que depende do servidor (letra, provedor de áudio, configurações) agora resolve a origem certa.
- **"Gerar letra" só mostrava um erro.** A validação ignorava o tema digitado no campo de letra. Esse campo agora vale como tema, e o motivo do fallback local aparece em vez de sumir sem explicação.
- **O modelo devolvia a letra truncada.** Modelos de raciocínio gastam uma parte grande e variável do orçamento de tokens pensando antes (uma chamada usou 26 mil tokens de raciocínio), então a resposta voltava cortada no meio do pensamento ou com o rascunho do modelo misturado dentro. A rota de letra agora pede um orçamento maior, repete quando o modelo avisa truncamento e limpa a resposta antes de entregar.
- **O provedor de áudio externo nunca era chamado.** O app sempre renderizava local. Agora usa o provedor configurado e, se ele falhar, o motor local assume com a explicação.

### Provedor de áudio

A API de Música hospedada da MiniMax foi descontinuada para contas novas em 20/08/2026 (HTTP 410, status 2153). O painel de configurações explica isso, e o app desliga aquele provedor em vez de repetir uma chamada morta a cada faixa.

Novo preset: **MiniMax Music 3 self-hosted** (`POST /v1/audio/speech`, `model: MiniMaxAI/MiniMax-Music3`), o modelo open source servido por SGLang-Omni em GPU NVIDIA.

### Empacotamento

`server/data` não entra mais no app. Ele carregava chaves de API e credenciais de FTP da máquina de build.

---

**Full Changelog**: https://github.com/andersonnarciso/brmusic/compare/v1.0.2...v1.0.3
