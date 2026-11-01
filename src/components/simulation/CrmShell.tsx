'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, CircleDot, Sparkles, Wrench } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { CompanyMark } from '@/components/simulation/CompanyMark';
import { MobileInstallPrompt } from '@/components/simulation/MobileInstallPrompt';
import { SaveSyncStatus } from '@/components/simulation/SaveSyncStatus';
import {
  CORE_NAV_ITEMS,
  MOBILE_ACCOUNT_NAV_ITEM,
  MOBILE_MODE_NAV_ITEMS,
  activeHref,
  mobileModeItemForPath,
  primaryNavItemForPath,
  titleForPath,
  type NavItem,
} from '@/components/simulation/navConfig';
import {
  MobileSheet,
  MobileSheetContent,
  MobileSheetDescription,
  MobileSheetDismissButton,
  MobileSheetHeader,
  MobileSheetTitle,
} from '@/components/ui/mobile-sheet';
import { useSimulation } from '@/hooks/useSimulation';
import { legacyPathOpensPlay } from '@/lib/playSteps';
import type { SimulationContext } from '@/lib/simMachine';
import {
  isAllowedProgressRoute,
  isGuardedSimulatorRoute,
  resolveResumeRoute,
} from '@/lib/simulationProgress';
import { cn } from '@/lib/utils';

function formatCurrency(value: number) {
  if (!Number.isFinite(value)) return '$0';
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 10_000) return `$${Math.round(value / 1000).toLocaleString()}k`;
  return `$${Math.round(value).toLocaleString()}`;
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return '0%';
  return `${value.toFixed(1)}%`;
}

export function CrmShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, isLoading } = useAuth();
  const { context, isReady } = useSimulation();
  const [mobileNavVisible, setMobileNavVisible] = useState(true);
  const [accountOpen, setAccountOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState<Partial<SimulationContext> | null>(null);

  const companyNameRaw = hasMounted ? (context.strategy.companyName?.trim() ?? '') : '';
  const companyName = companyNameRaw || 'Name your company in Setup';
  const industry = hasMounted ? (context.strategy.industry || 'saas') : 'saas';
  const logoStyle = hasMounted ? (context.strategy.logoStyle || 'orb') : 'orb';
  const runStatus = hasMounted && context.finalResults ? 'Completed' : 'In progress';
  const userLabel = user?.email ?? 'Signed in user';
  const roleLabel = user?.role ?? 'user';

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('cmo-sim-state-v2');
      setSavedSnapshot(raw ? JSON.parse(raw) as Partial<SimulationContext> : null);
    } catch {
      setSavedSnapshot(null);
    }
  }, [pathname, context]);

  const progressRoute = useMemo(
    () => resolveResumeRoute({ context, snapshot: savedSnapshot, isReady, pathname }),
    [context, isReady, pathname, savedSnapshot],
  );
  const mobileModeItem = useMemo(() => mobileModeItemForPath(pathname), [pathname]);

  const primaryItem = useMemo(() => primaryNavItemForPath(pathname), [pathname]);

  useEffect(() => {
    if (pathname?.startsWith('/sim/play')) return;
    if (pathname && legacyPathOpensPlay(pathname)) {
      router.replace('/sim/play');
      return;
    }
    if (!isReady) return;
    if (!pathname) return;
    if (!isGuardedSimulatorRoute(pathname)) return;
    if (isAllowedProgressRoute(pathname, progressRoute)) return;
    router.replace(progressRoute);
  }, [isReady, pathname, progressRoute, router]);

  useEffect(() => {
    setMobileNavVisible(true);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth < 1280) {
      setSidebarCollapsed(true);
    }
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/landing');
    router.refresh();
  };

  useEffect(() => {
    let lastY = window.scrollY;

    const handleScroll = () => {
      if (window.innerWidth >= 1024) return;
      if (document.body.dataset.mobileOverlay === 'open') {
        setMobileNavVisible(true);
        return;
      }

      const currentY = window.scrollY;
      const delta = currentY - lastY;
      const nearBottom = window.innerHeight + currentY >= document.documentElement.scrollHeight - 72;

      if (currentY < 64 || nearBottom) {
        setMobileNavVisible(true);
      } else if (delta > 28) {
        setMobileNavVisible(false);
      } else if (delta < -16) {
        setMobileNavVisible(true);
      }

      lastY = currentY;
    };

    const showNav = () => setMobileNavVisible(true);
    const observer = new MutationObserver(() => {
      if (document.body.dataset.mobileOverlay === 'open') {
        setMobileNavVisible(true);
      }
    });

    observer.observe(document.body, { attributes: true, attributeFilter: ['data-mobile-overlay'] });
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('focusin', showNav);
    window.addEventListener('touchstart', showNav, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('focusin', showNav);
      window.removeEventListener('touchstart', showNav);
    };
  }, []);

  if (pathname === "/sim" || pathname?.startsWith("/sim/play")) {
    return children;
  }

  return (
    <div className="mobile-app-shell min-h-screen bg-[linear-gradient(180deg,#f7f9fc_0%,#eef3f8_34%,#f6f8fb_100%)] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-[1480px] gap-0">
        <aside
          className={cn(
            'hidden shrink-0 flex-col border-r border-slate-200 bg-white/95 transition-[width] duration-200 md:flex',
            sidebarCollapsed ? 'w-[96px]' : 'w-[288px]',
          )}
        >
          <div className={cn('flex h-16 items-center gap-3 border-b border-slate-200', sidebarCollapsed ? 'justify-center px-2' : 'px-5')}>
            <CompanyMark companyName={companyNameRaw || 'Workspace'} industry={industry} size={34} style={logoStyle} />
            {!sidebarCollapsed ? (
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-950">{companyName}</div>
                <div className="truncate text-xs text-slate-500">Workspace · {industry.replace('-', ' ')}</div>
              </div>
            ) : null}
          </div>

          <nav className={cn('py-4', sidebarCollapsed ? 'px-2' : 'px-3')}>
            <SidebarGroup
              label="CMO Simulator"
              items={withoutRunDestinationLinks([{ label: 'Setup', href: '/sim/setup', icon: Wrench }, ...CORE_NAV_ITEMS])}
              pathname={pathname}
              collapsed={sidebarCollapsed}
            />
          </nav>

          <div className="mt-auto px-4 pb-5">
            {!sidebarCollapsed ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span className="inline-flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-slate-500" />
                    Run state
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 shadow-sm">
                    {runStatus}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <SidebarMetric label="Revenue" value={hasMounted ? formatCurrency(context.kpis.revenue) : '$0'} />
                  <SidebarMetric label="Market" value={hasMounted ? formatPercent(context.kpis.marketShare) : '0%'} />
                </div>
                <p className="mt-3 text-[11px] leading-5 text-slate-500">
                  The workspace keeps score while each quarter adds another decision layer.
                </p>
              </div>
            ) : (
              <div className="flex justify-center">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                  {runStatus}
                </span>
              </div>
            )}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-40 overflow-x-clip border-b border-slate-200/80 bg-white/88 backdrop-blur">
            <div className="hidden h-16 min-w-0 items-center justify-between gap-3 px-4 sm:px-6 md:flex">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed((prev) => !prev)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
                  aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </button>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-950">{titleForPath(pathname)}</div>
                  <div className="truncate text-xs text-slate-500">CMO Simulator · {companyName}</div>
                </div>
              </div>

              <div className="hidden items-center gap-2 md:flex">
                <SaveSyncStatus />
                <Link
                  href="/sim/play"
                  className="ml-2 inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <Wrench className="h-4 w-4 text-slate-500" />
                  Continue
                </Link>
                <details className="relative">
                  <summary className="list-none cursor-pointer rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                    {userLabel}
                  </summary>
                  <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                    <div className="rounded-md bg-slate-50 p-2">
                      <div className="truncate text-xs font-semibold text-slate-900">{userLabel}</div>
                      <div className="mt-0.5 text-[11px] uppercase tracking-wide text-slate-500">{roleLabel}</div>
                    </div>
                    <Link className="mt-2 block rounded-md px-2 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100" href="/sim/simulations">
                      My simulations
                    </Link>
                    <Link className="mt-0.5 block rounded-md px-2 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100" href="/sim/setup">
                      New simulation
                    </Link>
                    <Link className="mt-0.5 block rounded-md px-2 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100" href="/sim/credits">
                      Credits
                    </Link>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      disabled={isLoading}
                      className="mt-1 w-full rounded-md px-2 py-2 text-left text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                    >
                      {isLoading ? 'Signing out…' : 'Sign out'}
                    </button>
                  </div>
                </details>
              </div>
            </div>

            <div className="md:hidden">
              <div className="safe-top px-4 pb-3 pt-3">
                <div className="rounded-[28px] border border-white/80 bg-white/86 px-4 py-3 shadow-[0_16px_38px_rgba(15,23,42,0.08)] backdrop-blur">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <CompanyMark companyName={companyNameRaw || 'Workspace'} industry={industry} size={32} style={logoStyle} />
                      <div className="min-w-0">
                        <div className="truncate text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                          {runStatus} operating year
                        </div>
                        <div className="truncate text-base font-semibold tracking-tight text-slate-950">
                          {titleForPath(pathname)}
                        </div>
                        <div className="truncate text-xs text-slate-500">{companyName}</div>
                      </div>
                    </div>
                    <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                      <CircleDot className="h-3.5 w-3.5" />
                      {runStatus}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-2">
                    <CompactMetric label="Revenue" value={formatCurrency(context.kpis.revenue)} mobile />
                    <CompactMetric label="Profit" value={formatCurrency(context.kpis.profit)} mobile />
                    <CompactMetric label="Market" value={formatPercent(context.kpis.marketShare)} mobile />
                    <CompactMetric label="Brand" value={formatPercent(context.kpis.brandAwareness)} mobile />
                  </div>

                  <MobileInstallPrompt className="mt-3" compact />
                </div>
              </div>
            </div>
          </header>

          <main className="px-4 pb-[calc(env(safe-area-inset-bottom)+92px)] pt-4 sm:px-6 md:px-6 md:py-6 md:pb-6">
            <div className="mb-5 hidden min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white/80 px-4 py-3 shadow-sm md:block">
              <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-center gap-2 break-words text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <CircleDot className="h-3.5 w-3.5 text-emerald-600" />
                  {runStatus} operating year
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <CompactMetric label="Revenue" value={hasMounted ? formatCurrency(context.kpis.revenue) : '$0'} />
                  <CompactMetric label="Profit" value={hasMounted ? formatCurrency(context.kpis.profit) : '$0'} />
                  <CompactMetric label="Market" value={hasMounted ? formatPercent(context.kpis.marketShare) : '0%'} />
                  <CompactMetric label="Brand" value={hasMounted ? formatPercent(context.kpis.brandAwareness) : '0%'} />
                </div>
              </div>
            </div>
            {children}
          </main>
        </div>
      </div>

      <nav
        className={cn(
          'safe-bottom fixed inset-x-0 bottom-0 z-50 mx-auto block w-full px-4 pb-3 transition-transform duration-300 md:hidden',
          mobileNavVisible ? 'translate-y-0' : 'translate-y-[calc(100%+32px)]',
        )}
        aria-label="Mobile simulator navigation"
      >
        <div className="mx-auto flex max-w-md items-center justify-between rounded-[28px] border border-white/80 bg-white/88 px-3 py-2 shadow-[0_20px_45px_rgba(15,23,42,0.14)] backdrop-blur-xl">
          <MobileNavLink item={MOBILE_MODE_NAV_ITEMS[0]} pathname={pathname} activeOverride={mobileModeItem.label === 'Play'} />
          <MobileNavLink item={MOBILE_MODE_NAV_ITEMS[2]} pathname={pathname} activeOverride={mobileModeItem.label === 'History'} />
          <button
            type="button"
            className="flex min-w-[68px] flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            onClick={() => setAccountOpen(true)}
          >
            <motion.div whileTap={{ scale: 0.95 }} className="flex flex-col items-center gap-1">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <MOBILE_ACCOUNT_NAV_ITEM.icon className="h-4 w-4" />
              </span>
              <span>{MOBILE_ACCOUNT_NAV_ITEM.label}</span>
            </motion.div>
          </button>
        </div>
      </nav>

      <MobileSheet open={accountOpen} onOpenChange={setAccountOpen}>
        <MobileSheetContent className="max-h-[84vh]">
          <MobileSheetHeader>
            <div>
              <MobileSheetTitle>My account</MobileSheetTitle>
              <MobileSheetDescription>
                Saved runs, account actions, sync status, and secondary navigation live here on mobile.
              </MobileSheetDescription>
            </div>
            <MobileSheetDismissButton />
          </MobileSheetHeader>
          <div className="space-y-5 overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+18px)]">
            <section className="space-y-3 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Account</div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="truncate text-sm font-semibold text-slate-950">{userLabel}</div>
                <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">{roleLabel}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <SaveSyncStatus />
              </div>
              <div className="grid gap-2">
                <AccountSheetLink href="/sim/simulations" label="My simulations" onNavigate={() => setAccountOpen(false)} />
                <AccountSheetLink href="/sim/setup" label="New simulation" onNavigate={() => setAccountOpen(false)} />
                <AccountSheetLink href="/sim/credits" label="Credits" onNavigate={() => setAccountOpen(false)} />
                <button
                  type="button"
                  onClick={() => {
                    void handleSignOut();
                    setAccountOpen(false);
                  }}
                  disabled={isLoading}
                  className="rounded-[22px] border border-rose-200 bg-white px-4 py-3 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                >
                  {isLoading ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            </section>
            <NavSheetSection title="Modes" items={withoutRunDestinationLinks(MOBILE_MODE_NAV_ITEMS)} pathname={pathname} targetHref={mobileModeItem.href} />
            <NavSheetSection title="Core" items={withoutRunDestinationLinks([{ label: 'Setup', href: '/sim/setup', icon: Wrench }, ...CORE_NAV_ITEMS])} pathname={pathname} targetHref={primaryItem.href} />
          </div>
        </MobileSheetContent>
      </MobileSheet>
    </div>
  );
}

function SidebarGroup({
  label,
  items,
  pathname,
  lockedHrefs,
  className,
  collapsed = false,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  lockedHrefs?: Set<string>;
  className?: string;
  collapsed?: boolean;
}) {
  return (
    <div className={className}>
      {!collapsed ? <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div> : null}
      {items.map((item) => {
        const isActive = activeHref(pathname, item.href);
        const Icon = item.icon;
        const isLocked = lockedHrefs?.has(item.href) ?? false;
        return (
          <Link
            key={item.href}
            href={isLocked ? '#' : item.href}
            onClick={(event) => {
              if (isLocked) event.preventDefault();
            }}
            className={cn(
              'mt-1 flex min-w-0 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              collapsed && 'h-10 justify-center gap-0 px-2',
              isActive ? 'bg-slate-100 text-slate-950' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
              isLocked && 'cursor-not-allowed opacity-45 hover:bg-transparent hover:text-slate-600',
            )}
            aria-current={isActive ? 'page' : undefined}
            title={collapsed ? item.label : undefined}
          >
            <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-slate-900' : 'text-slate-500')} />
            {!collapsed ? <span className="min-w-0 break-words">{item.label}</span> : null}
          </Link>
        );
      })}
    </div>
  );
}

function MobileNavLink({ item, pathname, activeOverride }: { item: NavItem; pathname: string; activeOverride?: boolean }) {
  const Icon = item.icon;
  const isActive = activeOverride ?? activeHref(pathname, item.href);

  return (
    <Link href={item.href} className="flex min-w-[68px] justify-center">
      <motion.div
        whileTap={{ scale: 0.95 }}
        className={cn(
          'flex w-full flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-[11px] font-semibold transition',
          isActive ? 'text-slate-950' : 'text-slate-500',
        )}
      >
        <span
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-2xl',
            isActive ? 'bg-slate-950 text-white shadow-sm' : 'bg-slate-100 text-slate-600',
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="truncate">{item.label}</span>
      </motion.div>
    </Link>
  );
}

function NavSheetSection({
  title,
  items,
  pathname,
  targetHref,
  lockedHrefs,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  targetHref: string;
  lockedHrefs?: Set<string>;
}) {
  return (
    <section>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{title}</h3>
      <div className="mt-3 space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeHref(pathname, item.href);
          const isTarget = item.href === targetHref;
          const isLocked = lockedHrefs?.has(item.href) ?? false;
          return (
            <Link
              key={item.href}
              href={isLocked ? '#' : item.href}
              onClick={(event) => {
                if (isLocked) event.preventDefault();
              }}
              className={cn(
                'flex items-center justify-between rounded-[22px] border px-4 py-3 transition',
                isActive
                  ? 'border-slate-950 bg-slate-950 text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-white',
                isLocked && 'cursor-not-allowed opacity-45 hover:bg-slate-50',
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl', isActive ? 'bg-white/10' : 'bg-white')}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="break-words text-sm font-semibold">{item.label}</div>
                  <div className={cn('break-words text-xs', isActive ? 'text-slate-300' : 'text-slate-500')}>
                    {isLocked ? 'Locked after finalize' : isTarget ? 'Current phase target' : isActive ? 'Open now' : 'Open view'}
                  </div>
                </div>
              </div>
              {isTarget && !isActive && !isLocked && (
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                  Next
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

const RUN_DESTINATION_PREFIXES = [
  '/sim/setup',
  '/sim/strategy',
  '/sim/debrief',
  '/sim/q1',
  '/sim/q2',
  '/sim/q3',
  '/sim/q4',
  '/sim/campaigns',
  '/sim/pipeline',
  '/sim/analytics',
];

function withoutRunDestinationLinks(items: NavItem[]) {
  return items.filter((item) => !RUN_DESTINATION_PREFIXES.some((prefix) => item.href === prefix || item.href.startsWith(`${prefix}/`)));
}

function AccountSheetLink({
  href,
  label,
  onNavigate,
}: {
  href: string;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
    >
      {label}
    </Link>
  );
}

function SidebarMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-md border border-slate-200 bg-white px-3 py-2">
      <div className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function CompactMetric({ label, value, mobile = false }: { label: string; value: string; mobile?: boolean }) {
  return (
    <div className={cn('min-w-0 overflow-hidden rounded-2xl bg-slate-50 px-3 py-2 text-right', mobile && 'px-2.5 py-2')}>
      <div className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={cn('truncate font-semibold tracking-tight text-slate-950', mobile ? 'text-xs' : 'text-sm')}>{value}</div>
    </div>
  );
}
