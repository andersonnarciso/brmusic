import { Icon } from './Icons';
import { navigate, toggleSidebar, useApp } from '../lib/store';

interface NavItem {
  label: string;
  route: string;
  icon: keyof typeof Icon;
}

const MAIN_NAV: NavItem[] = [
  { label: 'Início', route: '/discover', icon: 'Home' },
  { label: 'Explorar', route: '/explore', icon: 'Compass' },
  { label: 'Criar', route: '/create', icon: 'Sparkles' },
  { label: 'Studio', route: '/studio', icon: 'Studio' },
  { label: 'Biblioteca', route: '/me', icon: 'Library' },
];

const SECONDARY_NAV: NavItem[] = [
  { label: 'Configurações', route: '/admin', icon: 'Sliders' },
  { label: 'Labs', route: '/labs', icon: 'Note' },
  { label: 'Notificações', route: '/notifications', icon: 'Bell' },
  { label: 'Mais', route: '/more', icon: 'More' },
];

export function Sidebar() {
  const route = useApp((s) => s.route);
  const collapsed = useApp((s) => s.sidebarCollapsed);
  const songs = useApp((s) => s.songs);

  const isActive = (target: string) =>
    route === target || (target === '/me' && route.startsWith('/song/'));

  const readyCount = songs.filter((s) => s.status === 'ready').length;

  return (
    <aside
      className={`relative z-20 flex h-full shrink-0 flex-col border-r border-ink-700 bg-ink-900
        transition-[width] duration-200 ${collapsed ? 'w-[68px]' : 'w-[236px]'}`}
    >
      <div className="flex items-center justify-between px-4 pb-3 pt-4">
        <button
          type="button"
          onClick={() => navigate('/discover')}
          className="flex items-center gap-2"
          aria-label="BR Music — início"
        >
          <img src="/logo-mark.png" alt="" className="h-8 w-8 shrink-0" />
          {!collapsed && (
            <img src="/logo-wordmark.png" alt="BR Music" className="h-[18px] w-auto" />
          )}
        </button>
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={collapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
          className="grid h-7 w-7 place-items-center rounded-lg text-mute-400 transition hover:bg-ink-800 hover:text-mute-100"
        >
          <Icon.PanelLeft size={16} />
        </button>
      </div>

      <nav className="scroll-thin flex-1 overflow-y-auto px-2.5 pb-3">
        <ul className="space-y-0.5">
          {MAIN_NAV.map((item) => {
            const ItemIcon = Icon[item.icon];
            const active = isActive(item.route);
            return (
              <li key={item.route}>
                <button
                  type="button"
                  onClick={() => navigate(item.route)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm
                    transition-colors ${
                      active
                        ? 'bg-ink-700 font-medium text-mute-100'
                        : 'text-mute-400 hover:bg-ink-850 hover:text-mute-100'
                    }`}
                >
                  <ItemIcon size={18} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="my-3 h-px bg-ink-700" />

        <ul className="space-y-0.5">
          {SECONDARY_NAV.map((item) => {
            const ItemIcon = Icon[item.icon];
            const active = isActive(item.route);
            return (
              <li key={item.route}>
                <button
                  type="button"
                  onClick={() => navigate(item.route)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm
                    transition-colors ${
                      active
                        ? 'bg-ink-700 font-medium text-mute-100'
                        : 'text-mute-400 hover:bg-ink-850 hover:text-mute-100'
                    }`}
                >
                  <ItemIcon size={18} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              </li>
            );
          })}
        </ul>

        {!collapsed && (
          <div className="mt-4 rounded-2xl border border-ink-700 bg-ink-850 p-3">
            <p className="text-xs font-medium text-mute-300">Tudo local e grátis</p>
            <p className="mt-1 text-[11px] leading-relaxed text-mute-500">
              As músicas são geradas no seu dispositivo. Nenhuma conta, nenhum servidor, sem plano.
            </p>
            <p className="mt-2 text-[11px] text-mute-500">
              {readyCount} música{readyCount === 1 ? '' : 's'} na biblioteca
            </p>
          </div>
        )}
      </nav>

      {!collapsed && (
        <div className="p-3">
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="w-full rounded-full border border-ink-600 px-4 py-2 text-sm font-medium text-mute-100
              transition hover:border-brand-500 hover:text-brand-400"
          >
            Conectar uma API
          </button>
        </div>
      )}
    </aside>
  );
}
