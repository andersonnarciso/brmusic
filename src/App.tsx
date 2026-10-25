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
import {
  CreditsPage,
  LabsPage,
  MorePage,
  NotFound,
  NotificationsPage,
  PlansPage,
} from './pages/Simple';
import { AdminApp } from './admin/AdminApp';

function RouteView({ route }: { route: string }) {
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
  const songs = useApp((s) => s.songs);
  const currentId = usePlayer((p) => p.songId);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    initRouter();
    void restoreAssets();
  }, []);

  const currentSong = useMemo(
    () => songs.find((s) => s.id === currentId) ?? null,
    [songs, currentId],
  );

  const commands = useMemo<Command[]>(
    () => [
      { id: 'go-create', label: 'Criar música', group: 'Navegar', shortcut: '⌘N', run: () => navigate('/create') },
      { id: 'go-home', label: 'Ir para o Início', group: 'Navegar', run: () => navigate('/discover') },
      { id: 'go-explore', label: 'Ir para Explorar', group: 'Navegar', run: () => navigate('/explore') },
      { id: 'go-library', label: 'Ir para a Biblioteca', group: 'Navegar', shortcut: '⌘L', run: () => navigate('/me') },
      { id: 'go-studio', label: 'Ir para o Studio', group: 'Navegar', run: () => navigate('/studio') },
      { id: 'go-admin', label: 'Abrir Configurações', group: 'Navegar', run: () => navigate('/admin') },
      {
        id: 'variations',
        label: 'Gerar 4 variações',
        group: 'Criar',
        hint: 'mesma descrição, seeds diferentes',
        run: () => void createVariations(4),
      },
      {
        id: 'export-mix',
        label: 'Exportar o mix final (WAV)',
        group: 'Exportar',
        hint: currentSong?.title,
        run: () => {
          if (currentSong) void exportMix(currentSong);
        },
      },
      {
        id: 'export-stems',
        label: 'Exportar stems (ZIP)',
        group: 'Exportar',
        hint: 'bateria, baixo, pads, melodia e voz',
        run: () => {
          if (currentSong) void exportStems(currentSong);
        },
      },
      { id: 'toggle-sidebar', label: 'Recolher/expandir a barra lateral', group: 'Interface', run: toggleSidebar },
    ],
    [currentSong],
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
