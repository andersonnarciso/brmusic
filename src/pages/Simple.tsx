import { Icon } from '../components/Icons';
import { navigate } from '../lib/store';

interface SimplePageProps {
  title: string;
  description: string;
  items?: Array<{ title: string; body: string; cta?: string; route?: string }>;
}

export function SimplePage({ title, description, items }: SimplePageProps) {
  return (
    <div className="scroll-thin h-full overflow-y-auto px-5 pb-16">
      <header className="pt-5">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-mute-100">{title}</h1>
        <p className="mt-1 max-w-xl text-sm text-mute-400">{description}</p>
      </header>

      {items && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <article key={item.title} className="surface rounded-2xl p-5">
              <h2 className="text-base font-semibold text-mute-100">{item.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-mute-400">{item.body}</p>
              {item.cta && item.route && (
                <button
                  type="button"
                  onClick={() => navigate(item.route as string)}
                  className="mt-4 rounded-full border border-ink-600 px-3.5 py-1.5 text-sm text-mute-100
                    transition hover:border-brand-500 hover:text-brand-400"
                >
                  {item.cta}
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function DownloadsPage() {
  const items = [
    {
      title: 'Linux',
      body: 'AppImage (execute direto) ou pacote .deb para Debian/Ubuntu.',
      cta: 'Ver no GitHub',
    },
    {
      title: 'Windows',
      body: 'Instalador .exe com atalho no menu Iniciar, ou versão portátil.',
      cta: 'Ver no GitHub',
    },
    {
      title: 'macOS',
      body: 'Disco .dmg para Apple Silicon e Intel.',
      cta: 'Ver no GitHub',
    },
    {
      title: 'Navegador (PWA)',
      body: 'Instale pelo botão do navegador e use offline, sem instalar nada.',
      cta: 'Abrir no navegador',
    },
  ];
  return (
    <SimplePage
      title="Baixar o BR Music"
      description="Gratuito, open source e local-first. Sem conta, sem plano, sem telemetria."
      items={items}
    />
  );
}

export function CreditsPage() {
  return <DownloadsPage />;
}

export function PlansPage() {
  return <DownloadsPage />;
}

export function LabsPage() {
  return (
    <SimplePage
      title="Labs"
      description="Experimentos em andamento. Cada recurso nasce aqui antes de chegar à criação."
      items={[
        { title: 'Fala (beta)', body: 'Locução com trilha de fundo combinando.', cta: 'Testar', route: '/create' },
        { title: 'Separação de stems', body: 'Quebra a faixa em trilhas alinhadas.', cta: 'Abrir Estúdio', route: '/studio' },
        { title: 'Personas', body: 'Vozes consistentes entre várias faixas.', cta: 'Criar', route: '/create' },
      ]}
    />
  );
}

export function NotificationsPage() {
  return (
    <SimplePage
      title="Notificações"
      description="Avisos sobre gerações, créditos e novidades do BR Music."
    />
  );
}

export function MorePage() {
  return (
    <div className="space-y-5">
      <SimplePage
        title="Mais"
        description="Configurações, tema, conta e preferências de geração."
        items={[
          { title: 'Preferências de criação', body: 'Modelo padrão, idioma e formato de download.' },
          { title: 'Conta', body: 'Perfil, e-mail e sessão.' },
          { title: 'Privacidade', body: 'Como as suas faixas e prompts são guardados (localmente, neste navegador).' },
        ]}
      />
      <div className="rounded-2xl border border-ink-700 bg-ink-900 p-5">
        <h2 className="text-base font-semibold text-mute-100">Painel administrativo</h2>
        <p className="mt-1 text-sm text-mute-400">
          Gerencie provedores de IA, geração de música, usuários, planos, marca e integrações.
        </p>
        <button
          type="button"
          onClick={() => navigate('/admin')}
          className="mt-4 rounded-full brand-gradient px-4 py-2 text-sm font-semibold text-ink-950"
        >
          Abrir painel administrativo
        </button>
      </div>
    </div>
  );
}


export function NotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <Icon.Note size={24} className="text-mute-500" />
      <h1 className="font-display text-2xl font-bold text-mute-100">Página não encontrada</h1>
      <button
        type="button"
        onClick={() => navigate('/discover')}
        className="rounded-full brand-gradient px-4 py-2 text-sm font-semibold text-ink-950"
      >
        Voltar ao início
      </button>
    </div>
  );
}
