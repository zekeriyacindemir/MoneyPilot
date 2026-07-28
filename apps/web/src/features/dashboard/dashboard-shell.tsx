'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@/features/auth/auth-context';
import { Icon } from './components/icons';
import { Avatar, IconButton } from './components/ui';
import { dashboardNavigation, getDashboardNavigation } from './navigation';

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuReference = useRef<HTMLDivElement>(null);
  const currentPage = getDashboardNavigation(pathname);
  const userLabel = user?.name || user?.email || 'MoneyPilot user';

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMobileNavigationOpen(false);
        setIsUserMenuOpen(false);
      }
    }

    function handlePointerDown(event: MouseEvent) {
      if (!userMenuReference.current?.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      router.replace('/login');
    }
  }

  return (
    <div className="min-h-screen bg-[var(--dashboard-canvas)] text-slate-900 lg:flex">
      {isMobileNavigationOpen ? <button type="button" aria-label="Menüyü kapat" className="fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-[1px] lg:hidden" onClick={() => setIsMobileNavigationOpen(false)} /> : null}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[17.5rem] -translate-x-full flex-col border-r border-[var(--dashboard-border)] bg-white px-4 py-5 transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${isMobileNavigationOpen ? 'translate-x-0 shadow-2xl' : ''}`} aria-label="Ana navigasyon">
        <div className="flex items-center justify-between px-2">
          <Link href="/dashboard" className="group inline-flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
            <span className="flex size-9 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold tracking-tight text-white transition group-hover:bg-blue-700">M</span>
            <span className="text-base font-semibold tracking-tight text-slate-950">MoneyPilot</span>
          </Link>
          <IconButton label="Menüyü kapat" className="lg:hidden" onClick={() => setIsMobileNavigationOpen(false)}><Icon name="close" className="size-5" /></IconButton>
        </div>

        <nav className="mt-9 flex-1" aria-label="Dashboard sayfaları">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Workspace</p>
          <div className="mt-3 space-y-1">
            {dashboardNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} aria-current={isActive ? 'page' : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${isActive ? 'bg-[var(--dashboard-accent-soft)] text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`} onClick={() => setIsMobileNavigationOpen(false)}>
                  <Icon name={item.icon} className="size-5" />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-700">Her şey tek yerde</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Finansal görünümünüz yakında canlı verilerle buluşacak.</p>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-[var(--dashboard-border)] bg-[var(--dashboard-canvas)]/90 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <IconButton label="Menüyü aç" className="lg:hidden" aria-expanded={isMobileNavigationOpen} onClick={() => setIsMobileNavigationOpen(true)}><Icon name="menu" className="size-5" /></IconButton>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950">{currentPage?.title}</p>
                <p className="hidden truncate text-xs text-slate-500 sm:block">{currentPage?.description}</p>
              </div>
            </div>

            <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
              <IconButton label="Bildirimler yakında" title="Bildirimler yakında"><Icon name="bell" className="size-5" /></IconButton>
              <div ref={userMenuReference} className="relative">
                <button type="button" aria-expanded={isUserMenuOpen} aria-haspopup="menu" className="flex max-w-48 items-center gap-2 rounded-xl px-1.5 py-1.5 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:max-w-72" onClick={() => setIsUserMenuOpen((isOpen) => !isOpen)}>
                  <Avatar name={userLabel} />
                  <span className="hidden min-w-0 text-left sm:block"><span className="block truncate text-sm font-medium text-slate-800">{user?.name || 'Hesabım'}</span><span className="block truncate text-xs text-slate-500">{user?.email}</span></span>
                  <Icon name="chevron" className={`hidden size-4 shrink-0 text-slate-400 transition sm:block ${isUserMenuOpen ? 'rotate-90' : ''}`} />
                </button>
                {isUserMenuOpen ? <div role="menu" className="absolute right-0 top-[calc(100%+0.5rem)] w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-950/10">
                  <button type="button" role="menuitem" className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600" onClick={() => setIsUserMenuOpen(false)}>Profil yakında</button>
                  <Link role="menuitem" href="/dashboard/settings" className="flex rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600" onClick={() => setIsUserMenuOpen(false)}>Settings</Link>
                  <div className="my-1 border-t border-slate-100" />
                  <button type="button" role="menuitem" className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-700 hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-rose-600" onClick={() => void handleLogout()}>Çıkış yap</button>
                </div> : null}
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 sm:py-9 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
