/**
 * Internacionalização do BR Music.
 *
 * O dicionário é mapeado do texto em português para o texto em inglês, o que
 * mantém a origem no código legível. English is the primary language,
 * Portuguese (pt-BR) is the secondary one.
 */

export type Language = 'en' | 'pt';

export const LANGUAGES: Array<{ id: Language; label: string }> = [
  { id: 'en', label: 'English' },
  { id: 'pt', label: 'Português (Brasil)' },
];

/** Traducoes: chave em portugues, valor em ingles. */
const EN: Record<string, string> = {
  // navegacao
  'Início': 'Home',
  'Explorar': 'Explore',
  'Criar': 'Create',
  'Studio': 'Studio',
  'Biblioteca': 'Library',
  'Configurações': 'Settings',
  'Labs': 'Labs',
  'Notificações': 'Notifications',
  'Mais': 'More',
  'Harness': 'Harness',
  'Tudo local e grátis': 'Everything local and free',
  'As músicas são geradas no seu dispositivo. Nenhuma conta, nenhum servidor, sem plano.':
    'Tracks are generated on your device. No account, no server, no plan.',
  'músicas na biblioteca': 'tracks in the library',
  'Conectar uma API': 'Connect an API',
  'Código aberto': 'Open source',
  'Abrir app': 'Open app',
  'Ir para o início do BR Music': 'Go to the BR Music home',
  'Idioma': 'Language',
  'English é o idioma principal, Português (pt-BR) é o secundário.':
    'English is the primary language, Portuguese (pt-BR) is the secondary one.',

  // criacao
  'Músicas': 'Songs',
  'Fala': 'Speech',
  'Simples': 'Simple',
  'Avançado': 'Advanced',
  'Descrição': 'Description',
  'Título': 'Title',
  'Letra': 'Lyrics',
  'Estilo': 'Style',
  'Áudio': 'Audio',
  'Gerar letra': 'Generate lyrics',
  'Instrumental': 'Instrumental',
  'Automático': 'Automatic',
  'Escrever letra': 'Write lyrics',
  'Descreva sua letra': 'Describe your lyrics',
  'Descreva sua letra, ou peça para o modelo escrever':
    'Describe your lyrics, or ask the model to write them',
  'A letra será criada pelo modelo a partir da sua descrição e do estilo escolhido.':
    'Lyrics will be created by the model from your description and the chosen style.',
  'A letra será criada pelo modelo a partir da sua descrição e do estilo':
    'Lyrics will be created by the model from your description and the style',
  'Descreva o tema antes de gerar a letra':
    'Describe the theme before generating lyrics',
  'Letra criada pelo modelo': 'Lyrics written by the model',
  'Letra criada no modo local': 'Lyrics written in local mode',
  'Não foi possível gerar a letra': 'Could not generate the lyrics',
  'Transforme qualquer ideia em uma música': 'Turn any idea into a song',
  'Enviar arquivo': 'Upload file',
  'Gravar': 'Record',
  'Parar gravação': 'Stop recording',
  'Sem permissão de microfone': 'No microphone permission',
  'Áudio anexado': 'Audio attached',
  'Criar música': 'Create track',
  'Gerando': 'Generating',
  'ver detalhes da geração': 'see generation details',
  'Preparando a ideia': 'Preparing the idea',
  'Montando o prompt': 'Building the prompt',
  'Escrevendo a letra': 'Writing the lyrics',
  'Definindo o plano': 'Defining the plan',
  'Montando o arranjo': 'Building the arrangement',
  'Sintetizando o áudio': 'Synthesizing the audio',
  'Separando os stems': 'Separating the stems',
  'Masterizando': 'Mastering',
  'Finalizando': 'Finishing',

  // lista e biblioteca
  'Workspaces': 'Workspaces',
  'Meu workspace': 'My workspace',
  'Playlist': 'Playlist',
  'Variações': 'Variations',
  'Compartilhar': 'Share',
  'Buscar': 'Search',
  'Filtros': 'Filters',
  'Mais recentes': 'Newest',
  'Mais antigas': 'Oldest',
  'Mais tocadas': 'Most played',
  'Curtidas': 'Likes',
  'Curtidos': 'Liked',
  'Públicas': 'Public',
  'Enviadas': 'Uploads',
  'Visualização em lista': 'List view',
  'Visualização em grade': 'Grid view',
  'Enviar áudio': 'Upload audio',
  'Nenhuma música por aqui': 'No tracks here',
  'Crie uma faixa e ela aparece aqui automaticamente.':
    'Create a track and it shows up here automatically.',
  'Remover': 'Remove',
  'Lixeira': 'Trash',
  'Restaurar': 'Restore',
  'Excluir em definitivo': 'Delete permanently',
  'Excluída em': 'Deleted on',
  'Manter': 'Keep',
  'Excluir': 'Delete',
  'Manter na lixeira': 'Keep in trash',
  'Playlists': 'Playlists',
  'Álbuns': 'Albums',
  'Projetos do Estúdio': 'Studio Projects',
  'Capas': 'Covers',
  'Hooks': 'Hooks',
  'Histórico': 'History',
  'Nova playlist': 'New playlist',
  'Nome da nova playlist': 'Name of the new playlist',
  'faixa': 'track',
  'faixas': 'tracks',
  'A playlist': 'The playlist',
  'será apagada. As músicas continuam na biblioteca.':
    'will be deleted. The tracks stay in the library.',
  'Esta seção entra na próxima versão.': 'This section lands in the next version.',
  'Nada por aqui ainda': 'Nothing here yet',
  'A lixeira está vazia. Músicas excluídas ficam aqui até serem apagadas.':
    'The trash is empty. Deleted tracks stay here until you erase them.',

  // player
  'Nada tocando': 'Nothing playing',
  'Escolha uma música na biblioteca': 'Pick a track in the library',
  'Shuffle': 'Shuffle',
  'Música anterior': 'Previous track',
  'Próxima música': 'Next track',
  'Repetir': 'Repeat',
  'Pausar': 'Pause',
  'Tocar': 'Play',
  'Reproduzir': 'Play',
  'Silenciar': 'Mute',
  'Ativar som': 'Unmute',

  // paleta de comandos
  'Navegar': 'Navigate',
  'Interface': 'Interface',
  'Ir para o Início': 'Go to Home',
  'Ir para Explorar': 'Go to Explore',
  'Ir para a Biblioteca': 'Go to the Library',
  'Ir para o Studio': 'Go to the Studio',
  'Abrir Configurações': 'Open Settings',
  'Gerar 4 variações': 'Generate 4 variations',
  'mesma descrição, seeds diferentes': 'same description, different seeds',
  'Exportar o mix final (WAV)': 'Export the final mix (WAV)',
  'Exportar stems (ZIP)': 'Export stems (ZIP)',
  'bateria, baixo, pads, melodia e voz': 'drums, bass, pads, melody and vocals',
  'Recolher/expandir a barra lateral': 'Collapse/expand the sidebar',

  // busca, acessibilidade e rotulos pontuais
  'Adicionar mídia': 'Add media',
  'Buscar comando': 'Search commands',
  'Buscar comando…': 'Search commands…',
  'Buscar músicas': 'Search tracks',
  'Buscar na biblioteca': 'Search the library',
  'Buscar no BR Music': 'Search BR Music',
  'Enviar': 'Send',
  'Excluir em definitivo?': 'Delete permanently?',
  'Excluir esta playlist?': 'Delete this playlist?',
  'Música não encontrada.': 'Track not found.',
  'Nenhum comando encontrado.': 'No command found.',
  'Nenhuma opção': 'No options',
  'Ordenar': 'Sort',
  'Pedir uma parte para o Estúdio': 'Ask the Studio for a part',
  'Plano': 'Plan',
  'Prompt gerado': 'Generated prompt',
  'Título (opcional)': 'Title (optional)',
  'Voltar': 'Back',
  'Estilos': 'Styles',
  'Beat, letra, ou os dois.': 'A beat, lyrics, or both.',
  'Feito por': 'Made by',
  'Licença MIT': 'MIT License',
  'Gerando a música': 'Generating the song',
  'O motor de áudio agora é {model}': 'The audio engine is now {model}',
  'MiniMax Music 3 (local)': 'MiniMax Music 3 (local)',
  'MiniMax Music (hospedada)': 'MiniMax Music (hosted)',
  'Replicate (modelos da comunidade)': 'Replicate (community models)',
  'ElevenLabs Music': 'ElevenLabs Music',
  'Stability AI (Stable Audio)': 'Stability AI (Stable Audio)',
  'Mubert': 'Mubert',
  'Endpoint proprio': 'Own endpoint',
  'Etapa': 'Stage',
  'Escrevendo...': 'Writing...',
  'Chave salva no servidor ({n} caracteres). Digite uma nova para substituir.':
    'Key saved on the server ({n} characters). Type a new one to replace it.',
  'Chave salva no servidor. Digite uma nova para substituir.':
    'Key saved on the server. Type a new one to replace it.',
  'Derrubar o modelo depois de gerar. Ele segura 22 GB de VRAM enquanto roda, e a máquina trava com o app aberto.':
    'Unload the model after generating. It holds 22 GB of VRAM while running, and the machine slows down with the app open.',
  'Será gravada no servidor ao salvar.': 'It will be saved on the server when you save.',

  // menu da faixa
  'Remix': 'Remix',
  'Editar': 'Edit',
  'Capa': 'Cover',
  'Reaproveitar prompt': 'Reuse prompt',
  'Mashup': 'Mashup',
  'Amostrar esta música': 'Sample this track',
  'Usar como inspiração': 'Use as inspiration',
  'Baixar': 'Download',
  'Mix final (WAV)': 'Final mix (WAV)',
  'Stems (ZIP)': 'Stems (ZIP)',
  'Gerenciar': 'Manage',
  'Playlist:': 'Playlist:',
  'Enviar para o FTP': 'Upload to FTP',
  'Adicionar à fila': 'Add to queue',
  'Tocar em seguida': 'Play next',
  'Rádio de músicas': 'Track radio',
  'Mover para a lixeira': 'Move to trash',
  'Abrir no editor': 'Open in editor',

  // acoes e confirmacoes
  'Exportar mix': 'Export mix',
  'Exportar stems': 'Export stems',
  'Excluir esta música?': 'Delete this track?',
  'A música será removida da biblioteca. O áudio, a capa e os stems serão apagados deste dispositivo. Não há como desfazer.':
    'The track will be removed from the library. Audio, cover and stems are erased from this device. There is no undo.',
  'Faixa': 'Track',
  'Duração': 'Duration',
  'Arquivos: mix WAV, capa e 5 stems': 'Files: WAV mix, cover and 5 stems',
  'Apagar tudo': 'Erase everything',
  'Cancelar': 'Cancel',
  'Confirmar': 'Confirm',
  'Apagar todos os dados locais?': 'Erase all local data?',
  'Todas as músicas, capas, stems, playlists e configurações salvas neste navegador serão apagados deste dispositivo. Não há como desfazer.':
    'All tracks, covers, stems, playlists and settings stored in this browser are erased from this device. There is no undo.',
  'Biblioteca de músicas e stems': 'Track library and stems',
  'Playlists criadas': 'Created playlists',
  'Configuração de provedores de IA': 'AI provider configuration',
  'Ação local, sem upload': 'Local action, no upload',
  'Falha na geração, tente novamente': 'Generation failed, try again',
  'Descreva a música que você quer criar': 'Describe the track you want to create',

  // estudio e editor
  'Exportar': 'Export',
  'Cortar': 'Trim',
  'Remover seção': 'Remove section',
  'Reverso': 'Reverse',
  'Velocidade': 'Speed',
  'Fade in': 'Fade in',
  'Fade out': 'Fade out',
  'Remaster': 'Remaster',
  'Substituir seção': 'Replace section',
  'Stems': 'Stems',
  'Estender': 'Extend',
  'Zoom': 'Zoom',
  'Seleção:': 'Selection:',
  'até': 'to',
  'Mixer': 'Mixer',
  'MASTER': 'MASTER',
  'Volume': 'Volume',
  'Pan': 'Pan',
  'centro': 'center',
  'Limitador': 'Limiter',
  'ligado': 'on',
  'desligado': 'off',
  'Mix e Master': 'Mix and Master',
  'Projeto sem título': 'Untitled project',
  'Adicionar parte': 'Add part',
  '+ Nova faixa': '+ New track',
  'Desfazer': 'Undo',
  'Refazer': 'Redo',
  'Geradas': 'Generated',
  'Nova parte': 'New part',
  'Selecione um ponto na timeline e peça uma parte':
    'Pick a point on the timeline and ask for a part',

  // biblioteca (pagina /me)
  'Nada por aqui ainda, crie sua primeira faixa.':
    'Nothing here yet, create your first track.',
  'data desconhecida': 'unknown date',
  'Excluir definitivamente': 'Delete permanently',
  'Use “…” na faixa para adicionar.': 'Use “…” on a track to add it.',
  'Nenhuma playlist ainda. Crie a primeira acima.':
    'No playlists yet. Create the first one above.',
  'Sem descrição': 'No description',
  'será apagada deste dispositivo, junto com o áudio, a capa e os stems. Não há como desfazer.':
    'will be erased from this device, together with the audio, the cover and the stems. There is no undo.',
  'sem BPM': 'no BPM',

  // explorar (pagina /explore)
  'Encontre um som e leve a ideia direto para a criação.':
    'Find a sound and take the idea straight into creation.',
  'Por occasion': 'By occasion',
  'Por estilo': 'By style',
  'Para empezar o dia': 'To start the day',
  'Chuva na janela': 'Rain on the window',
  'Estrada de madrugada': 'Early morning highway',
  'Festa no quintal': 'Backyard party',
  'Treino pesado': 'Heavy workout',
  'Chuva de verão': 'Summer rain',
  'Rua deserta': 'Empty street',
  'Bar de esquina': 'Corner bar',

  // harness
  'Harness de produção': 'Production harness',
  'Conduz uma ideia até a faixa final em etapas: prompt, letra, plano, arranjo, render, stems, master e export. Cada etapa pode ser inspecionada e repetida.':
    'Takes an idea to the final track in stages: prompt, lyrics, plan, arrangement, render, stems, master and export. Every stage can be inspected and repeated.',
  'Rodar pipeline': 'Run pipeline',
  'Rodando': 'Running',
  'Ideia': 'Idea',
  'O que você quer ouvir': 'What you want to hear',
  'Arranjo': 'Arrangement',
  'Instrumentos e energia por trecho': 'Instruments and energy per section',
  'Render': 'Render',
  'Síntese do áudio': 'Audio synthesis',
  'Export': 'Export',
  'Etapas': 'Stages',

  // harness: etapas e detalhes do pipeline
  'Prompt': 'Prompt',
  'Descrição técnica da faixa': 'Technical description of the track',
  'Texto com estrutura de seções': 'Text with a section structure',
  'Andamento, tonalidade, progressão, seções': 'Tempo, key, progression, sections',
  'Trilhas separadas': 'Separate stems',
  'Compressão, loudness e dinâmica': 'Compression, loudness and dynamics',
  'WAV, ZIP e FTP': 'WAV, ZIP and FTP',
  'rodando': 'running',
  'pronto': 'ready',
  'aguardando': 'waiting',
  'Andamento': 'Tempo',
  'Tonalidade': 'Key',
  'Escala': 'Scale',
  'Seções': 'Sections',
  'compassos': 'bars',
  'A biblioteca tem': 'The library has',
  'faixa(s)': 'track(s)',
  'O harness cria uma nova a cada execução.': 'The harness creates a new one on every run.',
  'amostras': 'samples',
  'linhas': 'lines',
  'instrumental, sem letra': 'instrumental, no lyrics',
  'seções': 'sections',
  'camadas': 'layers',
  'trechos em pico': 'peak sections',
  'provedor externo': 'external provider',
  'áudio único do provedor externo': 'single audio file from the external provider',
  'trilhas separadas': 'separate stems',
  'pico': 'peak',
  'master aplicado': 'master applied',
  'masterizado': 'mastered',
  'Revisar': 'Review',
  'o pico está alto demais': 'the peak is too high',
  'há amostras estourando': 'some samples are clipping',
  'o loudness está baixo': 'the loudness is too low',
  'a dinâmica está comprimida demais': 'the dynamics are too compressed',
  'a mixagem está quase mono': 'the mix is almost mono',
  'Preparando': 'Preparing',
  'Faixa gerada': 'Generated track',
  'Ouvir': 'Listen',
  'Laudo de qualidade': 'Quality report',
  'Mixagem saudável, pronta para publicar': 'Healthy mix, ready to publish',
  'Loudness': 'Loudness',
  'Pico': 'Peak',
  'Dinâmica': 'Dynamics',
  'Estéreo': 'Stereo',
  'Clipping': 'Clipping',
  'RMS': 'RMS',

  // landing
  'Faça qualquer música que você ': 'Make any song you can ',
  'imaginar': 'imagine',
  'Faça qualquer música que você imaginar': 'Make any song you can imagine',
  'Grátis, sem conta e rodando no seu próprio dispositivo. Descreva a faixa, ajuste o estilo e leve o mix, e os stems, para onde quiser.':
    'Free, with no account, running on your own device. Describe the track, set the style and take the mix, and the stems, wherever you want.',
  'Tudo o que você precisa para fazer música do seu jeito':
    'Everything you need to make music your way',
  'Baixe, instale e use offline': 'Download, install and use offline',
  'Sem conta, sem plano, sem servidor. O app inteiro roda no seu computador.':
    'No account, no plan, no server. The whole app runs on your computer.',
  'Usar a versão web': 'Use the web version',
  'Baixar no GitHub': 'Download on GitHub',
  'Linux, Windows e macOS · versões estáticas para os três sistemas':
    'Linux, Windows and macOS, static builds for all three systems',
  'Perguntas frequentes': 'Frequently asked questions',
  'Como eu faço uma música com o BR Music?': 'How do I make a track with BR Music?',
  'Preciso saber música para usar?': 'Do I need to know music to use it?',
  'Preciso pagar alguma coisa?': 'Do I have to pay anything?',
  'Posso usar as músicas comercialmente?': 'Can I use the tracks commercially?',
  'Posso usar outra IA no lugar do motor?': 'Can I use another AI instead of the engine?',
  'Destaque': 'Spotlight',
  'Beta': 'Beta',
  'Novo': 'New',
  'Estúdio no navegador': 'Browser based studio',
  'Separação de stems': 'Stem separation',
  'Vozes e Personas': 'Voices and personas',
  'Modelos personalizados': 'Custom models',
  'Crie o impensável com o BR Music v1': 'Create the unthinkable with BR Music v1',
  'Faça uma locução com Fala (beta)': 'Make a voiceover with Speech (beta)',
  'BR Music, gerador de músicas com IA': 'BR Music, AI music generator',
  'BR Music, gerador de música livre, local e open source.':
    'BR Music, a free, local and open source music generator.',
  'Gerador procedural local · nenhuma faixa é pré-gravada':
    'Local procedural generator · no pre-recorded track',

  // paginas
  'Painel administrativo': 'Admin panel',
  'Gerencie provedores de IA, geração de música, usuários, planos, marca e integrações.':
    'Manage AI providers, music generation, users, plans, branding and integrations.',
  'Abrir painel administrativo': 'Open admin panel',
  'Página não encontrada': 'Page not found',
  'Voltar ao início': 'Back to home',
  'Suas criações recentes': 'Your recent creations',
  'Ver biblioteca →': 'View library →',
  'Baixar o BR Music': 'Download BR Music',
  'Gratuito, open source e local-first. Sem conta, sem plano, sem telemetria.':
    'Free, open source and local-first. No account, no plan, no telemetry.',
  'AppImage (execute direto) ou pacote .deb para Debian/Ubuntu.':
    'AppImage (run it directly) or a .deb package for Debian/Ubuntu.',
  'Instalador .exe com atalho no menu Iniciar, ou versão portátil.':
    '.exe installer with a Start menu shortcut, or the portable build.',
  'Disco .dmg para Apple Silicon e Intel.': '.dmg disk for Apple Silicon and Intel.',
  'Navegador (PWA)': 'Browser (PWA)',
  'Instale pelo botão do navegador e use offline, sem instalar nada.':
    'Install it from the browser button and use it offline, with nothing to install.',
  'Ver no GitHub': 'View on GitHub',
  'Abrir no navegador': 'Open in the browser',
  'Experimentos em andamento. Cada recurso nasce aqui antes de chegar à criação.':
    'Work in progress. Every feature starts here before it reaches the creation screen.',
  'Fala (beta)': 'Speech (beta)',
  'Locução com trilha de fundo combinando.': 'Voiceover with a matching background track.',
  'Testar': 'Try it',
  'Quebra a faixa em trilhas alinhadas.': 'Splits the track into aligned stems.',
  'Personas': 'Personas',
  'Vozes consistentes entre várias faixas.': 'Consistent voices across several tracks.',
  'Avisos sobre gerações, créditos e novidades do BR Music.':
    'Notices about generations, credits and BR Music news.',
  'Configurações, tema, conta e preferências de geração.':
    'Settings, theme, account and generation preferences.',
  'Preferências de criação': 'Creation preferences',
  'Modelo padrão, idioma e formato de download.': 'Default model, language and download format.',
  'Conta': 'Account',
  'Perfil, e-mail e sessão.': 'Profile, e-mail and session.',
  'Privacidade': 'Privacy',
  'Como as suas faixas e prompts são guardados (localmente, neste navegador).':
    'How your tracks and prompts are stored (locally, in this browser).',

  // admin
  'Visão geral': 'Overview',
  'Provedores de IA': 'AI providers',
  'Geração de música': 'Music generation',
  'Aplicativo': 'Application',
  'Marca': 'Branding',
  'Integrações': 'Integrations',
  'Atividade': 'Activity',
  'Planos e preços': 'Plans and pricing',
  'Usuários': 'Users',
  'Modelo': 'Model',
  'Chave da API': 'API key',
  'Nome': 'Name',
  'Compatibilidade': 'Compatibility',
  'Endpoint': 'Endpoint',
  'Base URL': 'Base URL',
  'Temperatura': 'Temperature',
  'Tokens máx.': 'Max tokens',
  'Timeout (ms)': 'Timeout (ms)',
  'Testar conexão': 'Test connection',
  'Testando': 'Testing',
  'Conexão OK': 'Connection OK',
  'Falhou': 'Failed',
  'Carregar modelos de música': 'Load music models',
  'Carregando': 'Loading',
  'modelo(s) de música': 'music model(s)',
  'de texto descartado(s)': 'text model(s) discarded',
  'Ver todos os': 'See all',
  'modelos anunciados': 'announced models',
  'Este provedor não expõe modelos de música. Use um provedor de áudio, como o modo nativo da MiniMax.':
    'This provider exposes no music models. Use an audio provider, such as the native MiniMax mode.',
  'Salvar alterações': 'Save changes',
  'Recarregar': 'Reload',
  'Salvo': 'Saved',
  'Erro ao salvar': 'Save error',
  'Todos os eventos registrados pela plataforma.':
    'All events recorded by the platform.',
  'Nenhum evento registrado.': 'No events recorded.',
  'Nenhum provedor cadastrado, vá em “Provedores de IA”.':
    'No provider registered, go to AI providers.',
  'Conecte a API que escreve as letras, o plano musical e o estilo. Tudo OpenAI-compatible funciona.':
    'Connect the API that writes the lyrics, the musical plan and the style. Anything OpenAI-compatible works.',
  'A chave fica gravada no servidor (server/data/config.json) e nunca é devolvida ao navegador, o painel mostra apenas a máscara. Com o servidor offline, tudo é salvo no localStorage deste navegador.':
    'The key is stored on the server (server/data/config.json) and never returned to the browser, the panel only shows the mask. With the server offline, everything is stored in this browser localStorage.',
  'Runtimes locais de LLM': 'Local LLM runtimes',
  'Provedor': 'Provider',
  'Bucket': 'Bucket',
  'Armazenamento e CDN': 'Storage and CDN',
  'Onde os arquivos de áudio ficam guardados. Por padrão, tudo é local.':
    'Where audio files are stored. By default everything is local.',
  'Telemetria opcional': 'Optional telemetry',
  'Tudo desligado por padrão, o app não coleta nada.': 'Everything off by default, the app collects nothing.',
  'Hospedagem tradicional (FTP)': 'Traditional hosting (FTP)',
  'Envie as músicas geradas direto para a sua conta de hospedagem (cPanel, Hostinger, Locaweb).':
    'Send generated tracks straight to your hosting account (cPanel, Hostinger, Locaweb).',
  'Pasta remota': 'Remote folder',
  'Timeout': 'Timeout',
  'Modo passivo': 'Passive mode',
  'Conexão segura (FTPS)': 'Secure connection (FTPS)',
  'Usa TLS na porta 21. Desligado, a conexão é em texto simples.':
    'Uses TLS on port 21. Off, the connection is plain text.',
  'Recomendado quando há firewall ou NAT no caminho.':
    'Recommended when there is a firewall or NAT on the path.',
  'Envio automático ao gerar': 'Automatic upload on generate',
  'Cada faixa nova é enviada para o FTP assim que fica pronta.':
    'Every new track is uploaded to the FTP as soon as it is ready.',
  'Diagnóstico': 'Diagnostics',
  'Ambiente em que o app está rodando.': 'The environment the app is running in.',
  'Dados locais': 'Local data',
  'Limpar biblioteca e cache': 'Clear library and cache',
  'Comportamento do aplicativo': 'Application behaviour',
  'Como o app cria, toca e exporta.': 'How the app creates, plays and exports.',
  'Autoplay após gerar': 'Autoplay after generating',
  'Mostrar forma de onda real': 'Show the real waveform',
  'Exportar stems junto do mix': 'Export stems together with the mix',
  'Gera o ZIP de stems sempre que a faixa é salva.':
    'Generates the stems ZIP every time a track is saved.',
  'Modelo mais capaz até hoje: vocais mais cheios, arranjos mais firmados e mais detalhe no que você pediu.':
    'The most capable model so far: fuller vocals, tighter arrangements and more detail in what you asked for.',
  'Criar com v1':
    'Create with v1',
  'O primeiro modelo a criar locuções com trilha de fundo que combina com o seu texto.':
    'The first model to create voiceovers with a background track that matches your script.',
  'Testar Fala':
    'Try Speech',
  'DAW completo para arranjar, editar e mixar cada parte da música até ficar do seu jeito.':
    'A full DAW to arrange, edit and mix every part of the song until it feels like yours.',
  'Abrir o Estúdio':
    'Open the Studio',
  'Stems exportáveis':
    'Exportable stems',
  'Separe a faixa em bateria, baixo, pads, melodia e voz, e leve para a sua DAW em ZIP.':
    'Split the track into drums, bass, pads, melody and vocals, then take the ZIP to your DAW.',
  'Ver recursos':
    'See the features',
  'Variações e remixes':
    'Variations and remixes',
  'Gere 4 versões da mesma ideia de uma vez, remixe com outro estilo ou estenda a faixa.':
    'Generate 4 versions of the same idea at once, remix with another style or extend the track.',
  'Criar agora':
    'Create now',
  '100% local e gratuito':
    '100% local and free',
  'O motor roda no seu dispositivo. Sem conta, sem plano, sem servidor, e as faixas ficam offline.':
    'The engine runs on your device. No account, no plan, no server, and the tracks stay offline.',
  'Baixar o app':
    'Download the app',
  'AppImage ou .deb':
    'AppImage or .deb',
  'Instalador .exe ou portátil':
    '.exe installer or portable',
  'App .dmg para Apple Silicon e Intel':
    '.dmg app for Apple Silicon and Intel',
  'Descreva o que você quer: gênero, clima, tema ou a sua própria letra, e toque em Criar. A faixa completa (voz, letra e produção) é gerada em poucos segundos.':
    'Describe what you want: genre, mood, theme or your own lyrics, then hit Create. The full track (vocals, lyrics and production) is generated in seconds.',
  'Não. O BR Music foi feito para todo mundo: quem está criando pela primeira vez e quem já produz há anos. Em linguagem simples você escolhe o estilo e o resto se resolve.':
    'No. BR Music is made for everyone: first time creators and seasoned producers alike. In plain language you pick the style and the rest works itself out.',
  'Não. Não existe plano, assinatura nem limite: o app é livre, open source e roda offline no seu computador.':
    'No. There is no plan, no subscription and no limit: the app is free, open source and runs offline on your computer.',
  'Sim. As faixas são geradas por você, no seu dispositivo, a partir do seu prompt, você pode usar em vídeo, podcast, anúncio ou publicar um álbum.':
    'Yes. The tracks are generated by you, on your device, from your prompt, so you can use them in video, podcast, ads or release an album.',
  'Sim. Em Configurações você conecta qualquer API compatível com OpenAI (MiniMax, OpenAI, Groq, OpenRouter, Ollama local) e até a API de Música da MiniMax para gerar o áudio final.':
    'Yes. In Settings you connect any OpenAI-compatible API (MiniMax, OpenAI, Groq, OpenRouter, local Ollama) and even the MiniMax Music API to produce the final audio.',
  'Crie o impensável com o v1':
    'Create the unthinkable with v1',
  'Veja como a BLK² explora novos sons com o v1, misturando o familiar com o inesperado.':
    'See how BLK² explores new sounds with v1, mixing the familiar with the unexpected.',
  'O primeiro modelo a criar locução com trilha de fundo combinando com a sua mensagem.':
    'The first model to create a voiceover with a background track that matches your message.',
  'Estúdio':
    'Studio',
  'Arranje no Estúdio':
    'Arrange in the Studio',
  'Leve a faixa gerada para a DAW e ajuste cada camada até ficar do seu jeito.':
    'Take the generated track to the DAW and adjust every layer until it feels like yours.',
  'Abrir Estúdio':
    'Open Studio',

  // admin: painel e visao geral
  'Servidor conectado': 'Server connected',
  'Servidor offline (modo local)': 'Server offline (local mode)',
  'Voltar ao app': 'Back to the app',
  'Salvando…': 'Saving…',
  'Carregando configuração…': 'Loading configuration…',
  'Músicas geradas': 'Generated tracks',
  'nas últimas 24h': 'in the last 24h',
  'Stems disponíveis': 'Available stems',
  '5 trilhas por faixa (bateria, baixo, pads, melodia, voz)':
    '5 tracks per song (drums, bass, pads, melody, vocals)',
  '5 trilhas por faixa': '5 tracks per song',
  'Chamadas de API': 'API calls',
  'modo:': 'mode:',
  'Última geração': 'Last generation',
  'Última geração:': 'Last generation:',
  'sem dados': 'no data',
  'sem registro': 'no record',
  'tudo local, sem servidor externo': 'all local, no external server',
  'servidor:': 'server:',
  'modo': 'mode',
  'Status dos provedores de IA': 'AI provider status',
  'Qual provedor está habilitado e respondendo.': 'Which provider is enabled and responding.',
  'falhou': 'failed',
  'ativo': 'active',
  'inativo': 'inactive',
  'Atividade recente': 'Recent activity',
  'Últimos eventos registrados pela plataforma.': 'Latest events recorded by the platform.',
  'Nenhum evento registrado ainda.': 'No events recorded yet.',
  'Configuração de geração': 'Generation settings',
  'Parâmetros padrão aplicados às novas faixas.': 'Default parameters applied to new tracks.',
  'BPM padrão': 'Default BPM',
  'Influência': 'Influence',
  'Variedade': 'Variety',
  'Duração máx.': 'Max duration',
  'KPIs e saúde da plataforma': 'KPIs and platform health',
  'Conecte suas APIs de LLM': 'Connect your LLM APIs',
  'MiniMax nativo, motor local ou LLM': 'Native MiniMax, local engine or LLM',
  'Padrões, exportação e diagnóstico': 'Defaults, export and diagnostics',
  'Nome, cores e domínio': 'Name, colors and domain',
  'Storage, CDN e analytics': 'Storage, CDN and analytics',
  'Log de eventos da plataforma': 'Platform event log',

  // admin: provedores de llm
  'Provedores de LLM': 'LLM providers',
  '+ Adicionar provedor': '+ Add provider',
  'Novo provedor': 'New provider',
  'A chave fica gravada no servidor (': 'The key is stored on the server (',
  ') e nunca é devolvida ao navegador, o painel mostra apenas a máscara. Com o servidor offline, tudo é salvo no localStorage deste navegador.':
    ') and is never returned to the browser, the panel only shows the mask. With the server offline, everything is stored in this browser localStorage.',
  'Nenhum provedor cadastrado. Use “+ Adicionar provedor” ou a varredura de runtimes locais.':
    'No provider registered. Use “+ Add provider” or the local runtime scan.',
  'Procura servidores OpenAI-compatible rodando na sua máquina e lista os modelos de cada um.':
    'Looks for OpenAI-compatible servers running on your machine and lists the models of each one.',
  'Procurando…': 'Searching…',
  'Descobrir runtimes locais': 'Discover local runtimes',
  'Nenhum runtime encontrado em ': 'No runtime found in ',
  ' portas conhecidas. Verifique se o servidor está no ar (por exemplo, ':
    ' known ports. Check that the server is up (for example, ',
  ' ou ': ' or ',
  ').': ').',
  'sem modelos listados pelo servidor': 'no models listed by the server',
  'Usar': 'Use',
  'Portas verificadas: Ollama (11434), LM Studio (1234), llama.cpp (8080), Jan (1337), text-generation-webui (5000), KoboldCpp (5001), GPT4All (4891), vLLM (8000) e SGLang (30000).':
    'Checked ports: Ollama (11434), LM Studio (1234), llama.cpp (8080), Jan (1337), text-generation-webui (5000), KoboldCpp (5001), GPT4All (4891), vLLM (8000) and SGLang (30000).',
  'modelo(s) de música encontrado(s)': 'music model(s) found',
  'Nenhum modelo de música encontrado neste provedor': 'No music model found in this provider',
  'conectado': 'connected',
  'erro': 'error',
  'Testando…': 'Testing…',
  'Carregando…': 'Loading…',
  'Define URL e formato da requisição.': 'Defines the request URL and format.',
  'Sugestões: modelos de música detectados no provedor.':
    'Suggestions: music models detected on the provider.',
  'Gravada apenas no servidor.': 'Stored on the server only.',
  'Provedor habilitado': 'Provider enabled',
  'Usado quando o modo de geração é “Plano via LLM”.':
    'Used when the generation mode is “Plan via LLM”.',
  'Resposta em JSON': 'JSON response',
  'Envia response_format=json_object quando o provedor suporta.':
    'Sends response_format=json_object when the provider supports it.',
  'Remover provedor': 'Remove provider',

  // admin: presets de provedor
  'Qualquer endpoint /chat/completions (OpenAI, Together, Groq, vLLM, LM Studio).':
    'Any /chat/completions endpoint (OpenAI, Together, Groq, vLLM, LM Studio).',
  'Usa x-api-key e anthropic-version: 2023-06-01.':
    'Uses x-api-key and anthropic-version: 2023-06-01.',
  'Usa ?key= na URL e corpo { contents: [...] }.':
    'Uses ?key= in the URL and a { contents: [...] } body.',
  'Catálogo amplo de modelos; aceita qualquer slug do catálogo.':
    'Wide model catalog; accepts any catalog slug.',
  'API compatível com OpenAI, latência muito baixa.':
    'OpenAI-compatible API, very low latency.',
  'Endpoint compatível com OpenAI: Authorization: Bearer <API_KEY>. O custo por token é extremamente baixo, o que compensa no uso frequente.':
    'OpenAI-compatible endpoint: Authorization: Bearer <API_KEY>. The cost per token is extremely low, which pays off with frequent use.',
  'MiniMax (OpenAI-compatible)': 'MiniMax (OpenAI-compatible)',
  'Ollama (local)': 'Ollama (local)',
  'Modelo rodando na sua máquina; sem chave de API. Também serve /v1/chat/completions.':
    'Model running on your machine; no API key. It also serves /v1/chat/completions.',
  'llama.cpp (servidor local)': 'llama.cpp (local server)',
  'Servidor do llama.cpp (llama-server) exposto no formato OpenAI. Sem chave.':
    'llama.cpp server (llama-server) exposed in the OpenAI format. No key.',
  'LM Studio (local)': 'LM Studio (local)',
  'Servidor local do LM Studio no formato OpenAI. Sem chave.':
    'Local LM Studio server in the OpenAI format. No key.',
  'vLLM (local)': 'vLLM (local)',
  'Servidor do vLLM (OpenAI-compatible). Sem chave.': 'vLLM server (OpenAI-compatible). No key.',
  'LocalAI (local)': 'LocalAI (local)',
  'LocalAI: Ollama + GPT4All + llama.cpp em um servidor OpenAI-compatible.':
    'LocalAI: Ollama + GPT4All + llama.cpp in one OpenAI-compatible server.',
  'KoboldCpp (local)': 'KoboldCpp (local)',
  'KoboldCpp com a flag --api. Sem chave.': 'KoboldCpp with the --api flag. No key.',
  'GPT4All (local)': 'GPT4All (local)',
  'Servidor embutido do GPT4All (OpenAI-compatible). Sem chave.':
    'GPT4All built-in server (OpenAI-compatible). No key.',
  'text-generation-webui (local)': 'text-generation-webui (local)',
  'oobabooga com a flag --api. Sem chave.': 'oobabooga with the --api flag. No key.',
  'Jan (local)': 'Jan (local)',
  'Servidor local do Jan. Sem chave.': 'Local Jan server. No key.',
  'SGLang (local)': 'SGLang (local)',
  'SGLang / MiniMax M2 local. Sem chave.': 'SGLang / local MiniMax M2. No key.',
  'Personalizado (OpenAI-compatible)': 'Custom (OpenAI-compatible)',
  'Qualquer endpoint HTTP. O corpo enviado é o formato /chat/completions da OpenAI.':
    'Any HTTP endpoint. The body sent follows the OpenAI /chat/completions format.',

  // admin: provedor de audio
  'Modo de geração': 'Generation mode',
  'Escolha quem gera o áudio final da música.': 'Choose who generates the final music audio.',
  'Motor local (procedural)': 'Local engine (procedural)',
  'Sem servidor: a faixa é sintetizada no navegador com Web Audio. Grátis, instantâneo e offline.':
    'No server: the track is synthesized in the browser with Web Audio. Free, instant and offline.',
  'Plano via LLM': 'Plan via LLM',
  'O LLM configurado escreve o plano musical (letra, andamento, tonalidade, seções) e o motor local o executa.':
    'The configured LLM writes the musical plan (lyrics, tempo, key, sections) and the local engine performs it.',
  'Áudio externo (provedor configurável)': 'External audio (configurable provider)',
  'Um provedor HTTP gera o áudio final: MiniMax Music hospedada (legada), MiniMax Music 3 self-hosted ou um endpoint próprio.':
    'An HTTP provider generates the final audio: hosted MiniMax Music (legacy), self-hosted MiniMax Music 3 or your own endpoint.',
  'Provedor de áudio': 'Audio provider',
  'Escolha quem gera o áudio final: a API hospedada da MiniMax, o MiniMax Music 3 self-hosted ou um endpoint próprio.':
    'Choose who generates the final audio: the hosted MiniMax API, self-hosted MiniMax Music 3 or your own endpoint.',
  'Motor local (navegador)': 'Local engine (browser)',
  'Sem provedor: a faixa é sintetizada no navegador com Web Audio.':
    'No provider: the track is synthesized in the browser with Web Audio.',
  'MiniMax Music (hospedada, legada)': 'MiniMax Music (hosted, legacy)',
  'A API hospedada de Música foi descontinuada para contas novas em 20/08/2026. Continua valendo para clientes pagantes antigos.':
    'The hosted Music API was discontinued for new accounts on 20/08/2026. It still applies to older paying customers.',
  'MiniMax Music 3 (self-hosted)': 'MiniMax Music 3 (self-hosted)',
  'Servidor local com SGLang-Omni em GPU NVIDIA. O corpo usa input (letra), instructions (estilo) e response_format wav.':
    'Local server with SGLang-Omni on an NVIDIA GPU. The body uses input (lyrics), instructions (style) and response_format wav.',
  'Endpoint próprio': 'Custom endpoint',
  'Responde com áudio binário (WAV/MP3) ou JSON com o áudio em base64.':
    'Returns binary audio (WAV/MP3) or JSON with the audio in base64.',
  'Replicate (endpoint HTTP)': 'Replicate (HTTP endpoint)',
  'Qualquer modelo de áudio do Replicate, chamado por HTTP padrão.':
    'Any Replicate audio model, called over standard HTTP.',
  'Gerando…': 'Generating…',
  'Testar (gera 1 faixa)': 'Test (generates 1 track)',
  'A API hospedada de Música da MiniMax foi descontinuada para contas novas em 20/08/2026 (HTTP 410). Para contas novas use o MiniMax Music 3 self-hosted ou o MiniMax Audio.':
    'The hosted MiniMax Music API was discontinued for new accounts on 20/08/2026 (HTTP 410). For new accounts use self-hosted MiniMax Music 3 or MiniMax Audio.',
  'Bearer token. Ficará só no servidor.': 'Bearer token. It stays on the server only.',
  'Formato de saída': 'Output format',
  'hex retorna o áudio embutido na resposta.': 'hex returns the audio embedded in the response.',
  'hex (embutido)': 'hex (embedded)',
  'url (expira em 24h)': 'url (expires in 24h)',
  'Formato de áudio': 'Audio format',
  'Duração alvo (s)': 'Target duration (s)',
  'Provedor de áudio habilitado': 'Audio provider enabled',
  'Quando desligado, o app usa o motor local mesmo com o modo configurado aqui.':
    'When off, the app uses the local engine even with the mode set here.',
  'Otimizador de letras (MiniMax)': 'Lyrics optimizer (MiniMax)',
  'lyrics_optimizer: o modelo escreve a letra a partir do prompt quando não há letra.':
    'lyrics_optimizer: the model writes the lyrics from the prompt when there are none.',
  'Modo nativo MiniMax': 'Native MiniMax mode',
  ' com ': ' with ',
  '. O corpo usa ': '. The body uses ',
  ' e ': ' and ',
  '. A resposta traz ': '. The response returns ',
  ' em hexadecimal e ': ' in hexadecimal and ',
  ' (1002 = rate limit, 1004 = autenticação, 1008 = saldo, 1026 = conteúdo bloqueado).':
    ' (1002 = rate limit, 1004 = authentication, 1008 = balance, 1026 = blocked content).',
  'Teste OK': 'Test OK',
  'Teste falhou': 'Test failed',

  // admin: modelos locais
  'Modelos locais': 'Local models',
  'Modelos de musica na sua maquina': 'Music models on your machine',
  'Esta máquina': 'This machine',
  'O hardware detectado aqui. O veredito de cada modelo do catálogo sai destes números.':
    'The hardware detected here. The verdict for each model in the catalog comes from these numbers.',
  'GPU': 'GPU',
  'CPU': 'CPU',
  'CUDA': 'CUDA',
  'de VRAM': 'of VRAM',
  'núcleos': 'cores',
  'sim': 'yes',
  'não': 'no',
  'não informado': 'not reported',
  'Nenhuma GPU detectada': 'No GPU detected',
  'Memória RAM': 'RAM',
  'Disco livre': 'Free disk',
  'A instalação automática está disponível nesta máquina.':
    'Automatic setup is available on this machine.',
  'A instalação automática precisa de Linux com uma GPU NVIDIA. No macOS e no Windows o caminho é manual.':
    'Automatic setup needs Linux with an NVIDIA GPU. On macOS and Windows the path is manual.',
  'Auto setup': 'Auto setup',
  'Auto setup baixa o modelo certo para esta máquina e aponta o provedor de áudio do app para ele.':
    'Auto setup downloads the right model for this machine and points the app audio provider at it.',
  'Auto setup concluído, o app já usa este modelo': 'Auto setup finished, the app already uses this model',
  'Preparando o modelo…': 'Preparing the model…',
  'Procurando modelos locais…': 'Looking for local models…',
  'Catálogo de modelos': 'Model catalog',
  'Modelos que o BR Music sabe preparar, com o veredito para esta máquina e os botões de instalação.':
    'Models BR Music knows how to prepare, with the verdict for this machine and the install buttons.',
  'Nenhum modelo no catálogo.': 'No model in the catalog.',
  'Cabe na sua máquina': 'Fits your machine',
  'Cabe, mas apertado': 'Fits, but tight',
  'Não cabe nesta máquina': 'Does not fit this machine',
  'Não suportado nesta máquina': 'Not supported on this machine',
  'Validado': 'Validated',
  'Não validado': 'Not validated',
  'Legado': 'Legacy',
  'Disponível': 'Available',
  'Tamanho': 'Size',
  'Repositório': 'Repository',
  'VRAM necessária': 'VRAM needed',
  'Disco necessário': 'Disk needed',
  'Roda por HTTP e não precisa instalar nada.':
    'Runs over HTTP and needs nothing installed.',
  'Baixar e instalar': 'Download and install',
  'Carregar': 'Load',
  'Derrubar': 'Unload',
  'Usar este modelo': 'Use this model',
  'Carregando o modelo, pode levar alguns minutos':
    'Loading the model, it can take a few minutes',
  'Modelo carregado': 'Model loaded',
  'Modelo derrubado, a VRAM foi liberada': 'Model unloaded, the VRAM was freed',
  'O app agora usa este modelo para gerar o áudio':
    'The app now uses this model to generate the audio',
  'Nenhum modelo local cabe nesta máquina': 'No local model fits this machine',
  'Instalando…': 'Installing…',
  'Runtime pronto': 'Runtime ready',
  'Pesos prontos': 'Weights ready',
  'Serviço pronto': 'Service ready',
  'Log da instalação': 'Install log',
  'Sem logs ainda.': 'No logs yet.',
  'Erro na central de modelos': 'Error in the local model hub',
  'Cabe com folga nesta maquina.': 'Fits comfortably on this machine.',
  'Requer CUDA. No macOS nao ha GPU NVIDIA.': 'Requires CUDA. There is no NVIDIA GPU on macOS.',
  'Requer GPU NVIDIA com CUDA.': 'Requires an NVIDIA GPU with CUDA.',
  'Roda pela API, sem instalar nada.': 'Runs over the API, nothing to install.',
  'Precisa de {vram} MB de VRAM somando as GPUs e a maquina tem {livre} MB.':
    'Needs {vram} MB of VRAM across the GPUs and this machine has {livre} MB.',
  'Precisa de {vram} MB de VRAM em uma GPU e a maior daqui tem {livre} MB.':
    'Needs {vram} MB of VRAM on one GPU and the largest here has {livre} MB.',
  'Precisa de {ram} MB de RAM e a maquina tem {livre} MB.':
    'Needs {ram} MB of RAM and this machine has {livre} MB.',
  'Precisa de {disco} GB de disco e ha {livre} GB livres.':
    'Needs {disco} GB of disk and there are {livre} GB free.',
  'Cabe, mas apertado: {vram} MB de VRAM com {livre} MB disponiveis.':
    'Fits, but tight: {vram} MB of VRAM with {livre} MB available.',
  'MiniMax Music (API)': 'MiniMax Music (API)',
  'Replicate': 'Replicate',

  // admin: parametros padrao de geracao
  'Parâmetros padrão de geração': 'Default generation parameters',
  'Aplicados a toda nova criação.': 'Applied to every new creation.',
  'Modelo padrão': 'Default model',
  'Weirdness padrão': 'Default weirdness',
  'Influência do estilo': 'Style influence',
  'Duração máxima (s)': 'Max duration (s)',
  'Créditos mensais': 'Monthly credits',
  'Concorrência da fila': 'Queue concurrency',
  'Permitir download': 'Allow download',
  'Moderação automática': 'Automatic moderation',
  'Bloqueia prompts com termos proibidos antes da geração.':
    'Blocks prompts with forbidden terms before generating.',

  // admin: aplicativo e diagnostico
  'Tocar automaticamente após gerar': 'Autoplay after generating',
  'Começa a reprodução assim que a faixa fica pronta.':
    'Starts playback as soon as the track is ready.',
  'Desenha os picos do áudio sintetizado no player.':
    'Draws the peaks of the synthesized audio in the player.',
  'Baixar automaticamente ao gerar': 'Download automatically on generate',
  'Salva o WAV na pasta de downloads do sistema.': 'Saves the WAV in the system downloads folder.',
  'Variações por lote': 'Variations per batch',
  'Quantas versões geradas de uma vez.': 'How many versions are generated at once.',
  'Crossfade (ms)': 'Crossfade (ms)',
  'Transição entre faixas no player.': 'Transition between tracks in the player.',
  'Formato de exportação': 'Export format',
  'Pasta padrão de exportação': 'Default export folder',
  'Usada pelo app desktop (Electron).': 'Used by the desktop app (Electron).',
  'ex.: /home/usuário/Música': 'e.g.: /home/user/Music',
  'Definido pelo app desktop': 'Set by the desktop app',
  '44.1 kHz · estéreo': '44.1 kHz · stereo',
  'Ambiente': 'Environment',
  'Navegador / PWA': 'Browser / PWA',
  'Versão do app': 'App version',
  'Plataforma': 'Platform',
  'Runtime': 'Runtime',
  'navegador': 'browser',
  'Armazenamento usado': 'Storage used',
  'a medir': 'measuring',
  'Motor': 'Engine',
  'Amostragem': 'Sampling',
  'Tudo fica neste dispositivo.': 'Everything stays on this device.',

  // admin: marca e integracoes
  'Identidade': 'Identity',
  'Nome, marca e cores aplicadas na interface.': 'Name, brand and colors applied to the interface.',
  'Nome do site': 'Site name',
  'Texto do logo': 'Logo text',
  'Domínio': 'Domain',
  'Cor primária': 'Primary color',
  'Cor de destaque': 'Accent color',
  'E-mail de suporte': 'Support e-mail',
  'Português (Brasil)': 'Portuguese (Brazil)',
  'Português (Portugal)': 'Portuguese (Portugal)',
  'Moeda de referência': 'Reference currency',
  'IndexedDB (local, sem servidor)': 'IndexedDB (local, no server)',
  'URL do CDN': 'CDN URL',
  'Manter arquivos locais por padrão': 'Keep files local by default',
  'Quando ligado, o áudio fica no IndexedDB do navegador em vez de ir para o storage configurado.':
    'When on, the audio stays in the browser IndexedDB instead of going to the configured storage.',
  'ID de analytics': 'Analytics ID',
  'vazio = sem telemetria': 'empty = no telemetry',
  'Cloudflare Turnstile (chave pública)': 'Cloudflare Turnstile (public key)',
  'opcional': 'optional',

  // admin: atividade e ftp
  'Log de atividade': 'Activity log',
  'Eventos gerados pelo painel e pela API.': 'Events generated by the panel and by the API.',
  'Todos': 'All',
  'Geração': 'Generation',
  'Configuração': 'Configuration',
  'por': 'by',
  'Porta': 'Port',
  'Usuário': 'User',
  'Senha': 'Password',
  'senha do FTP': 'FTP password',
  'Onde as músicas serão gravadas.': 'Where the tracks are written.',
  'Conectado em': 'Connected in',
  'item(ns) em': 'item(s) in',
  'Testando...': 'Testing...',

  // avisos (toasts) e etapas do pipeline
  'Música removida da biblioteca': 'Track removed from the library',
  'Link da música copiado': 'Track link copied',
  'Não foi possível copiar o link': 'Could not copy the link',
  'Remix gerado': 'Remix generated',
  'Continuação gerada': 'Continuation generated',
  'Nova capa gerada': 'New cover generated',
  'Música movida para a lixeira': 'Track moved to the trash',
  'Música restaurada': 'Track restored',
  'Música excluída definitivamente': 'Track permanently deleted',
  'Denúncia registrada, obrigado pelo aviso': 'Report filed, thanks for the heads up',
  'Adicionada à fila': 'Added to the queue',
  'Será a próxima música': 'Will play next',
  '{count} variações geradas': '{count} variations generated',
  'Prompt de "{title}" carregado na criação': 'Prompt from "{title}" loaded into the creator',
  '"{title}" adicionada como inspiração': '"{title}" added as inspiration',
  'Amostra de "{title}" carregada': 'Sample from "{title}" loaded',
  'Mashup de "{a}" e "{b}" pronto': 'Mashup of "{a}" and "{b}" ready',
  'Voz: {voice}': 'Voice: {voice}',
  'Rádio iniciada com {count} faixas': 'Radio started with {count} tracks',
  'Playlist "{name}" criada': 'Playlist "{name}" created',
  '"{title}" pronta': '"{title}" is ready',
  '"{title}" pronta, {lufs} LUFS': '"{title}" is ready, {lufs} LUFS',
  'provedor externo indisponível, usamos o motor local ({motivo})':
    'external provider unavailable, we used the local engine ({motivo})',
};

const STORAGE_KEY = 'brmusic.language';

export function readLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'pt' || stored === 'en') return stored;
  } catch {
    /* armazenamento indisponivel */
  }
  return 'en';
}

export function writeLanguage(language: Language): void {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    /* ignore */
  }
}

/** Traduz um texto do portugues para o ingles quando existe traducao. */
export function translate(text: string, language: Language): string {
  if (language !== 'en') return text;
  return EN[text] ?? text;
}

/** Substitui {placeholders} por valores. */
export function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, key) =>
    key in params ? String(params[key]) : match,
  );
}

export const translationCount = Object.keys(EN).length;
