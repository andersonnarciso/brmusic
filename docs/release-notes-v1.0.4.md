# BR Music v1.0.4

## English

**A local model center: detect your machine, download the model, load it when you want, unload it when you are done.**

### The model never starts on its own

The local model server is no longer enabled to start at boot. Earlier versions wrote a systemd unit with `WantedBy=default.target` and enabled it, so the model loaded itself on every login and held 22 GB of VRAM while you were doing something else. The unit the app writes now has no `[Install]` section and is explicitly disabled: the model only runs when you press **Load**, and **Unload** gives the VRAM back. There is also a start limit, so a model that crashes does not loop forever taking the GPU.

### Local models tab

In `#/admin` there is a new **Local models** tab:

- **Your machine**: every GPU with its VRAM, the CPU, the RAM, the free disk and whether automatic install is possible.
- **The catalog**: MiniMax Music 3 (validated), ACE-Step, YuE, DiffRhythm, SongGeneration, Stable Audio Open, HeartMuLa, MuSiCGen, Higgs Audio v2, and the ones that run over HTTP (MiniMax hosted, Replicate, ElevenLabs Music, Stability, Mubert, your own endpoint). Each local model shows a verdict for your machine: fits, tight, does not fit or unsupported platform.
- **Download and install**: the app installs the runtime, downloads the weights and writes the service, with progress and a log.
- **Load** and **Unload**: the model starts only when you ask, and the button to give the VRAM back is right there.
- **Auto setup**: picks the model that fits the machine, installs it, loads it and points the app's audio provider at it.
- The creator's model list now shows every audio engine you can pick, not only the procedural presets: the local MiniMax Music 3, the hosted MiniMax Music, Replicate, ElevenLabs Music, Stability, Mubert and your own endpoint. Picking one switches the engine right there, and the app says which one is in use.

Automatic install needs Linux with an NVIDIA GPU. On macOS and Windows the tab shows the machine and the manual path.

### Also in this release

- The external audio request no longer dies after five minutes: the Node fetch gives up waiting for headers long before a local model finishes rendering a track.
- The target duration is honoured, so a 10 second track no longer asks for 30 seconds of audio.
- The panel now shows the length of the saved API key, so a full key is not mistaken for a truncated one.
- The app no longer passes the procedural engine off as real music. When the audio provider does not answer, the track records which engine made it and the library shows a PROCEDURAL badge with the reason. The creator warns before you generate, and pressing Create offers three choices: load the model and generate, generate with the procedural engine, or cancel. The app never loads the local model on its own.
- The creator shows the target duration of the local model and how slow it is on your hardware.
- The hosted MiniMax Music warning no longer reads like "your account is new". The hosted Music API closed for accounts without the paid Music product, which depends on the product and the key type, not on the age of the account. The warning names the key type in use and says how to settle it: test a pay-as-you-go key.
- The trash action removes the track from the creator list, the library counter and the player queue.

## Português

**Central de modelos locais: detecta a máquina, baixa o modelo, carrega quando você quiser e derruba quando terminar.**

### O modelo não sobe mais sozinho

O servidor do modelo local deixou de ser habilitado para subir no boot. As versões anteriores escreviam uma unit do systemd com `WantedBy=default.target` e a habilitavam, então o modelo se carregava a cada login e segurava 22 GB de VRAM enquanto você fazia outra coisa. A unit que o app escreve agora não tem seção `[Install]` e fica explicitamente desabilitada: o modelo só roda quando você aperta **Carregar**, e **Derrubar** devolve a VRAM. Também existe um limite de reinício, para um modelo que crashou não ficar em laço tomando a placa.

### Aba de modelos locais

Em `#/admin` tem uma aba nova, **Modelos locais**:

- **Esta máquina**: cada GPU com a VRAM, o CPU, a RAM, o disco livre e se a instalação automática é possível.
- **O catálogo**: MiniMax Music 3 (validado), ACE-Step, YuE, DiffRhythm, SongGeneration, Stable Audio Open, HeartMuLa, MuSiCGen, Higgs Audio v2, e os que rodam por API (MiniMax hospedada, Replicate, ElevenLabs Music, Stability, Mubert, endpoint próprio). Cada modelo local mostra um veredito para a sua máquina: cabe, cabe apertado, não cabe ou plataforma sem suporte.
- **Baixar e instalar**: o app instala o runtime, baixa os pesos e escreve o serviço, com progresso e log.
- **Carregar** e **Derrubar**: o modelo só sobe quando você pede, e o botão que devolve a VRAM está ali.
- **Auto setup**: escolhe o modelo que cabe na máquina, instala, carrega e aponta o provedor de áudio do app para ele.
- A lista de modelos do criador agora mostra todos os motores de áudio que dá para escolher, e não só os presets do motor procedural: o MiniMax Music 3 local, o MiniMax Music hospedado, Replicate, ElevenLabs Music, Stability, Mubert e o seu endpoint. Escolher um troca o motor na hora, e o app diz qual está em uso.

A instalação automática precisa de Linux com GPU NVIDIA. No macOS e no Windows a aba mostra a máquina e o caminho manual.

### Também nesta versão

- A requisição de áudio externo não morre mais depois de cinco minutos: o `fetch` do Node desiste de esperar os headers muito antes de um modelo local terminar de renderizar a faixa.
- A duração alvo é respeitada, então uma faixa de 10 segundos não pede mais 30 segundos de áudio.
- O painel mostra o tamanho da chave de API salva, para uma chave inteira não ser confundida com uma truncada.
- O app não passa mais o motor procedural por música de verdade. Quando o provedor de áudio não responde, a faixa registra o motor que a fez e a biblioteca mostra a etiqueta PROCEDURAL com o motivo. O criador avisa antes de gerar, e o botão Criar oferece três escolhas: carregar o modelo e gerar, gerar com o motor procedural, ou cancelar. O app nunca sobe o modelo local sozinho.
- O criador mostra a duração alvo do modelo local e o quanto ele demora na sua máquina.
- O aviso da MiniMax hospedada não parece mais dizer "sua conta é nova". A API de Música fechou para contas sem o produto de Música pago, o que depende do produto e do tipo de chave, não da idade da conta. O aviso diz qual chave está em uso e como conferir: testar uma chave pay-as-you-go.
- Mover para a lixeira tira a faixa da lista do criador, do contador da biblioteca e da fila do player.

---

**Full Changelog**: https://github.com/andersonnarciso/brmusic/compare/v1.0.3...v1.0.4
