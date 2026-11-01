import type React from 'react';
import {
  BarChart3,
  CircleUserRound,
  Flag,
  GitBranch,
  History,
  Home,
  Layers3,
  LayoutDashboard,
  LineChart,
  Megaphone,
  PlayCircle,
  FolderOpenDot,
  Trophy,
  SearchCheck,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { resolveSimulationPath, type SimulationPhase } from '@/lib/simulationRouting';

export type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

export const CORE_NAV_ITEMS: NavItem[] = [
  { label: 'Continue', href: '/sim', icon: LayoutDashboard },
  { label: 'My Simulations', href: '/sim/simulations', icon: FolderOpenDot },
  { label: 'Leaderboard', href: '/sim/leaderboard', icon: Trophy },
  { label: 'Strategy', href: '/sim/strategy', icon: Flag },
  { label: 'Debrief', href: '/sim/debrief', icon: BarChart3 },
];

export const QUARTER_NAV_ITEMS: NavItem[] = [
  { label: 'Quarter 1', href: '/sim/q1', icon: Layers3 },
  { label: 'Quarter 2', href: '/sim/q2', icon: Layers3 },
  { label: 'Quarter 3', href: '/sim/q3', icon: Layers3 },
  { label: 'Quarter 4', href: '/sim/q4', icon: Layers3 },
];

export const CRM_NAV_ITEMS: NavItem[] = [
  { label: 'Campaigns', href: '/sim/campaigns', icon: Megaphone },
  { label: 'Pipeline', href: '/sim/pipeline', icon: GitBranch },
  { label: 'Analytics', href: '/sim/analytics', icon: LineChart },
];

export const ALL_NAV_ITEMS: NavItem[] = [
  { label: 'Continue', href: '/sim', icon: Home },
  { label: 'Setup', href: '/sim/setup', icon: Wrench },
  ...CORE_NAV_ITEMS.filter((item) => item.href !== '/sim'),
  ...QUARTER_NAV_ITEMS,
  ...CRM_NAV_ITEMS,
];

export const MOBILE_MODE_NAV_ITEMS: NavItem[] = [
  { label: 'Play', href: '/sim', icon: PlayCircle },
  { label: 'Review', href: '/sim/campaigns', icon: SearchCheck },
  { label: 'History', href: '/sim/simulations', icon: History },
];

export const MOBILE_ACCOUNT_NAV_ITEM: NavItem = {
  label: 'Account',
  href: '/sim/simulations',
  icon: CircleUserRound,
};

export function titleForPath(pathname: string) {
  if (pathname.startsWith('/sim/setup')) return 'Setup';
  if (pathname.startsWith('/sim/simulations')) return 'My Simulations';
  if (pathname.startsWith('/sim/leaderboard')) return 'Leaderboard';
  if (pathname.startsWith('/sim/strategy')) return 'Strategy Session';
  if (pathname.startsWith('/sim/campaigns')) return 'Campaigns';
  if (pathname.startsWith('/sim/pipeline')) return 'Pipeline';
  if (pathname.startsWith('/sim/analytics')) return 'Analytics';
  if (pathname.startsWith('/sim/q1')) return 'Q1 Operating Plan';
  if (pathname.startsWith('/sim/q2')) return 'Q2 Operating Plan';
  if (pathname.startsWith('/sim/q3')) return 'Q3 Operating Plan';
  if (pathname.startsWith('/sim/q4')) return 'Q4 Operating Plan';
  if (pathname.startsWith('/sim/debrief')) return 'Debrief';
  return 'Continue';
}

export function activeHref(pathname: string, href: string) {
  return href === '/sim' ? pathname === '/sim' : pathname.startsWith(href);
}

export function primaryNavItemForPath(pathname: string): NavItem {
  if (pathname.startsWith('/sim/setup')) return { label: 'Setup', href: '/sim/setup', icon: Wrench };
  if (pathname.startsWith('/sim/simulations')) return { label: 'Runs', href: '/sim/simulations', icon: FolderOpenDot };
  if (pathname.startsWith('/sim/leaderboard')) return { label: 'Leaderboard', href: '/sim/leaderboard', icon: Trophy };
  if (pathname.startsWith('/sim/strategy')) return { label: 'Strategy', href: '/sim/strategy', icon: Flag };
  if (pathname.startsWith('/sim/q1')) return { label: 'Q1', href: '/sim/q1', icon: Layers3 };
  if (pathname.startsWith('/sim/q2')) return { label: 'Q2', href: '/sim/q2', icon: Layers3 };
  if (pathname.startsWith('/sim/q3')) return { label: 'Q3', href: '/sim/q3', icon: Layers3 };
  if (pathname.startsWith('/sim/q4')) return { label: 'Q4', href: '/sim/q4', icon: Layers3 };
  if (pathname.startsWith('/sim/campaigns')) return { label: 'Campaigns', href: '/sim/campaigns', icon: Megaphone };
  if (pathname.startsWith('/sim/pipeline')) return { label: 'Pipeline', href: '/sim/pipeline', icon: GitBranch };
  if (pathname.startsWith('/sim/analytics')) return { label: 'Analytics', href: '/sim/analytics', icon: LineChart };
  if (pathname.startsWith('/sim/debrief')) return { label: 'Debrief', href: '/sim/debrief', icon: BarChart3 };
  return { label: 'Continue', href: '/sim', icon: LayoutDashboard };
}

export function mobileModeItemForPath(pathname: string): NavItem {
  if (pathname.startsWith('/sim/simulations')) return { label: 'History', href: '/sim/simulations', icon: History };
  if (
    pathname.startsWith('/sim/leaderboard')
    || pathname.startsWith('/sim/debrief')
  ) {
    return { label: 'History', href: '/sim/simulations', icon: History };
  }
  if (
    pathname.startsWith('/sim/campaigns')
    || pathname.startsWith('/sim/pipeline')
    || pathname.startsWith('/sim/analytics')
  ) {
    return { label: 'Review', href: '/sim/campaigns', icon: SearchCheck };
  }
  return { label: 'Play', href: '/sim', icon: PlayCircle };
}

export function quarterNavItemForPhase(currentPhase: SimulationPhase): NavItem {
  const href = resolveSimulationPath(currentPhase);
  if (href.startsWith('/sim/q1')) return { label: 'Q1', href: '/sim/q1', icon: Layers3 };
  if (href.startsWith('/sim/q2')) return { label: 'Q2', href: '/sim/q2', icon: Layers3 };
  if (href.startsWith('/sim/q3')) return { label: 'Q3', href: '/sim/q3', icon: Layers3 };
  if (href.startsWith('/sim/q4')) return { label: 'Q4', href: '/sim/q4', icon: Layers3 };
  return { label: 'Quarter', href, icon: Sparkles };
}
