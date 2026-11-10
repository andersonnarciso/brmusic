import { useEffect, useMemo, useState } from 'react';
import {
  createVariations,
  initRouter,
  navigate,
  restoreAssets,
  toggleSidebar,
  useApp,
  usePlayer,
} from './lib/store';
import { exportMix, exportStems } from './lib/export';
import { Sidebar } from './components/Sidebar';
import { PlayBar } from './components/PlayBar';
import { CreatePanel } from './components/CreatePanel';
import { SongList } from './components/SongList';
import { CommandPalette, type Command } from './components/CommandPalette';
import { Landing } from './pages/Landing';
import { Home } from './pages/Home';
import { Library } from './pages/Library';
import { Explore } from './pages/Explore';
import { Studio } from './pages/Studio';
import { EditorPage } from './pages/Editor';
import { HarnessPage } from './pages/Harness';
import {
  CreditsPage,
  LabsPage,
  MorePage,
  NotFound,
  NotificationsPage,
  PlansPage,
} from './pages/Simple';
import { AdminApp } from './admin/AdminApp';
import { useT } from './lib/useT';

function RouteView({ route }: { route: string }) {
  if (route.startsWith('/editor/')) {
    return <EditorPage songId={route.replace('/editor/', '')} />;
  }
  switch (route) {
    case '/create':
      return (
        <div className="flex h-full min-h-0">
          <CreatePanel />
          <SongList />
        </div>
      );
    case '/discover':
    case '/home':
      return <Home />;
    case '/me':
      return <Library />;
    case '/explore':
      return <Explore />;
    case '/studio':
      return <Studio />;
    case '/harness':
      return <HarnessPage />;
    case '/credits':
    case '/downloads':
      return <CreditsPage />;
    case '/labs':
      return <LabsPage />;
    case '/notifications':
      return <NotificationsPage />;
    case '/more':
      return <MorePage />;
    case '/plans':
      return <PlansPage />;
    default:
      return <NotFound />;
  }
}

export function App() {
  const route = useApp((s) => s.route);
  const toast = useApp((s) => s.toast);
  const language = useApp((s) => s.language);
  const songs = useApp((s) => s.songs);
  const currentId = usePlayer((p) => p.songId);
  const t = useT();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    initRouter();
    void restoreAssets();
  }, []);

  // o titulo e o idioma do documento acompanham a preferencia
  useEffect(() => {
    document.title =
      language === 'en' ? 'BR Music, AI music generator' : 'BR Music, gerador de músicas com IA';
    document.documentElement.lang = language === 'en' ? 'en' : 'pt-BR';
    // No app desktop o menu nativo segue o mesmo idioma.
    void window.desktop?.setLanguage?.(language);
  }, [language]);

  const currentSong = useMemo(
    () => songs.find((s) => s.id === currentId) ?? null,
    [songs, currentId],
  );

  const commands = useMemo<Command[]>(
    () => [
      { id: 'go-create', label: t('Criar música'), group: t('Navegar'), shortcut: '⌘N', run: () => navigate('/create') },
      { id: 'go-home', label: t('Ir para o Início'), group: t('Navegar'), run: () => navigate('/discover') },
      { id: 'go-explore', label: t('Ir para Explorar'), group: t('Navegar'), run: () => navigate('/explore') },
      { id: 'go-library', label: t('Ir para a Biblioteca'), group: t('Navegar'), shortcut: '⌘L', run: () => navigate('/me') },
      { id: 'go-studio', label: t('Ir para o Studio'), group: t('Navegar'), run: () => navigate('/studio') },
      { id: 'go-admin', label: t('Abrir Configurações'), group: t('Navegar'), run: () => navigate('/admin') },
      {
        id: 'variations',
        label: t('Gerar 4 variações'),
        group: t('Criar'),
        hint: t('mesma descrição, seeds diferentes'),
        run: () => void createVariations(4),
      },
      {
        id: 'export-mix',
        label: t('Exportar o mix final (WAV)'),
        group: t('Exportar'),
        hint: currentSong?.title,
        run: () => {
          if (currentSong) void exportMix(currentSong);
        },
      },
      {
        id: 'export-stems',
        label: t('Exportar stems (ZIP)'),
        group: t('Exportar'),
        hint: t('bateria, baixo, pads, melodia e voz'),
        run: () => {
          if (currentSong) void exportStems(currentSong);
        },
      },
      { id: 'toggle-sidebar', label: t('Recolher/expandir a barra lateral'), group: t('Interface'), run: toggleSidebar },
    ],
    [currentSong, t],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        navigate('/create');
        return;
      }
      if (event.key === 'Escape') {
        setPaletteOpen(false);
        return;
      }
      if (typing) return;
      if (event.key === ' ') {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent('brmusic:toggle-play'));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const toastNode = toast && (
    <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full border border-ink-600 bg-ink-800 px-4 py-2 text-sm text-mute-100 shadow-xl">
      {toast}
    </div>
  );

  if (route === '/') {
    return (
      <>
        <Landing />
        {toastNode}
        <CommandPalette
          open={paletteOpen}
          commands={commands}
          onClose={() => setPaletteOpen(false)}
        />
      </>
    );
  }

  if (route === '/admin') {
    return (
      <div className="h-full">
        <AdminApp />
        {toastNode}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-ink-950">
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-hidden">
          <RouteView route={route} />
        </main>
      </div>
      <PlayBar />
      {toastNode}
      <CommandPalette
        open={paletteOpen}
        commands={commands}
        onClose={() => setPaletteOpen(false)}
      />
    </div>
  );
}
