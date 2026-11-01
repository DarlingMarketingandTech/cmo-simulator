'use client';

import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  MobileSheet,
  MobileSheetContent,
  MobileSheetDismissButton,
  MobileSheetHeader,
  MobileSheetTitle,
} from '@/components/ui/mobile-sheet';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { LogoGenerator, type CompanyLogoStyle } from '@/components/LogoGenerator';
import { useAuth } from '@/components/auth/AuthProvider';
import { usePageTracking, useSimulationTracking } from '@/hooks/useAnalytics';
import { logger } from '@/lib/logger';
import { createInitialSimulationContext, type HydrationPatch, type SimulationContext } from '@/lib/simMachine';
import { saveSimulationSnapshot } from '@/lib/saveSimulationSnapshot';
import { recordSimulationEvent } from '@/lib/simulationTelemetry';
import { mergeSimulationContext } from '@/lib/simulationHydration';
import { resolveSimulationPath } from '@/lib/simulationRouting';
import {
  createDefaultUserProfileFormState,
  MARKETING_MATURITY_OPTIONS,
  PROFILE_ROLE_OPTIONS,
  SIMULATION_GOAL_OPTIONS,
  toggleGoal,
  type UserProfileFormState,
} from '@/lib/userProfile';
import { cn } from '@/lib/utils';
import {
  SIMULATION_SCENARIOS,
  type SimulationScenarioIconKey,
} from '@/lib/config/simulationScenarios';
import type { DifficultyLevel } from '@/types';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CircleCheckBig,
  DollarSign,
  LayoutGrid,
  Orbit,
  Rocket,
  Target,
  Wrench,
  Zap,
} from 'lucide-react';

const SCENARIO_CARD_ICONS: Record<SimulationScenarioIconKey, LucideIcon> = {
  target: Target,
  rocket: Rocket,
  zap: Zap,
};

interface SetupData {
  scenarioId: string | null;
  companyName: string;
  logoStyle: CompanyLogoStyle;
  budgetAllocation: {
    brandAwareness: number;
    leadGeneration: number;
    conversionOptimization: number;
  };
}

type SetupStepMeta = {
  label: string;
  title: string;
  summary: string;
  tooltip: string;
  popupTitle: string;
  popupDescription: string;
  nextAction: string;
  nextDetails: string[];
};

const STEP_META: SetupStepMeta[] = [
  {
    label: 'Operating Scenario',
    title: 'Choose your board context',
    summary: 'The scenario sets your budget, market pressure, and the type of leadership mandate you start under.',
    tooltip: 'Scenario selection defines the initial operating environment, starting budget, and the difficulty profile used throughout the simulation.',
    popupTitle: 'What happens after scenario selection?',
    popupDescription: 'Your scenario becomes the baseline for the workspace. The next step names the company and creates the identity shown throughout the simulator.',
    nextAction: 'Next, you will name the workspace and approve the company mark that appears across the CRM shell.',
    nextDetails: [
      'The chosen scenario locks the starting budget and board mandate.',
      'The company profile and market conditions flow into your strategy setup.',
      'The selected scenario preview stays visible in the workspace summary rail.',
    ],
  },
  {
    label: 'Company Identity',
    title: 'Approve the company identity',
    summary: 'Name the business and choose the mark treatment that will represent the workspace in the simulator shell.',
    tooltip: 'The company name and logo style are reused in the workspace header, mobile shell, and review screens.',
    popupTitle: 'What happens after identity approval?',
    popupDescription: 'Once the identity is set, the next step establishes your budget posture so the strategy and quarter views can frame tradeoffs correctly.',
    nextAction: 'Next, you will divide the annual budget across brand, demand, and conversion priorities.',
    nextDetails: [
      'The approved name appears in the sidebar and operating header.',
      'The selected mark style becomes the workspace logo for desktop and mobile views.',
      'A stronger identity makes the next review step easier to scan and validate.',
    ],
  },
  {
    label: 'Budget Philosophy',
    title: 'Set the capital posture',
    summary: 'Allocate 100% of the annual budget so the simulator knows whether you are leaning into brand, pipeline, or conversion efficiency.',
    tooltip: 'Budget posture does not spend money yet. It sets the initial planning bias the simulator carries into strategy and quarterly decision-making.',
    popupTitle: 'What happens after budget setup?',
    popupDescription: 'The final review step turns your selections into an executive brief, then passes you into the strategy session with the scenario and budget posture preloaded.',
    nextAction: 'Next, you will review an executive brief before launching the strategy session.',
    nextDetails: [
      'The budget split is checked for a complete 100% allocation.',
      'The financial summary shows how your posture will be presented back to leadership.',
      'This split follows you into the strategy session as your initial operating philosophy.',
    ],
  },
  {
    label: 'Executive Briefing',
    title: 'Validate the workspace before launch',
    summary: 'Confirm the scenario, identity, and budget posture before entering the strategy session.',
    tooltip: 'Completing setup saves the simulation context locally and routes you into the strategy session with the workspace already configured.',
    popupTitle: 'What happens after setup is complete?',
    popupDescription: 'The simulator saves your workspace, opens the strategy session, and then routes you into Q1 once the strategic foundation is complete.',
    nextAction: 'Next, you will define audience, positioning, and primary channels before the Q1 operating console unlocks.',
    nextDetails: [
      'Setup saves the workspace to local storage for the simulation provider.',
      'You are routed directly to the strategy session after setup.',
      'Once strategy is complete, the CRM-style quarterly console opens in Q1.',
    ],
  },
];

const LOGO_STYLE_OPTIONS: Array<{
  id: CompanyLogoStyle;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    id: 'orb',
    label: 'Executive Orb',
    description: 'Rounded and polished. Best for software-forward or growth-stage brands.',
    icon: Orbit,
  },
  {
    id: 'badge',
    label: 'Ledger Badge',
    description: 'Structured and stable. Good for service, operational, or institutional brands.',
    icon: LayoutGrid,
  },
  {
    id: 'monogram',
    label: 'Monogram Plate',
    description: 'Minimal and formal. Best when you want a sharper corporate identity.',
    icon: Building2,
  },
];

const BUDGET_GUIDANCE: Array<{
  key: keyof SetupData['budgetAllocation'];
  label: string;
  shortLabel: string;
  description: string;
  detail: string;
  accent: string;
  track: string;
}> = [
  {
    key: 'brandAwareness',
    label: 'Brand Formation',
    shortLabel: 'Brand',
    description: 'Long-term equity, memory structure, positioning, and category ownership.',
    detail: 'Higher investment here improves durable visibility and supports slower-burn growth bets.',
    accent: 'text-violet-300',
    track: 'accent-violet-400',
  },
  {
    key: 'leadGeneration',
    label: 'Demand Generation',
    shortLabel: 'Demand',
    description: 'Traffic, lead capture, pipeline creation, and market activation.',
    detail: 'Higher investment here biases the workspace toward near-term acquisition and opportunity creation.',
    accent: 'text-sky-300',
    track: 'accent-sky-400',
  },
  {
    key: 'conversionOptimization',
    label: 'Performance / Conversion',
    shortLabel: 'Conversion',
    description: 'Sales enablement, closing efficiency, retargeting, and revenue capture.',
    detail: 'Higher investment here favors efficiency, monetization, and lower-funnel execution.',
    accent: 'text-emerald-300',
    track: 'accent-emerald-400',
  },
];

function mapPreferredDifficultyToRuntime(
  preferred: UserProfileFormState['preferredDifficulty'],
): DifficultyLevel {
  switch (preferred) {
    case 'easy':
      return 'beginner';
    case 'hard':
      return 'advanced';
    default:
      return 'intermediate';
  }
}

function mapProfileFromApi(profile: Record<string, unknown> | null | undefined): UserProfileFormState {
  const rawGoals = profile?.selected_goals;
  const selectedGoals = Array.isArray(rawGoals)
    ? rawGoals.filter((goal): goal is string => typeof goal === 'string')
    : undefined;

  return {
    fullName: typeof profile?.full_name === 'string' ? profile.full_name : '',
    companyName: typeof profile?.company_name === 'string' ? profile.company_name : '',
    role:
      typeof profile?.role === 'string' && PROFILE_ROLE_OPTIONS.some((option) => option.value === profile.role)
        ? (profile.role as UserProfileFormState['role'])
        : 'cmo',
    marketingMaturity:
      typeof profile?.marketing_maturity === 'string' &&
      MARKETING_MATURITY_OPTIONS.some((option) => option.value === profile.marketing_maturity)
        ? (profile.marketing_maturity as UserProfileFormState['marketingMaturity'])
        : 'developing',
    selectedGoals:
      selectedGoals && selectedGoals.length > 0
        ? (selectedGoals as UserProfileFormState['selectedGoals'])
        : ['pipeline'],
    preferredDifficulty:
      typeof profile?.preferred_difficulty === 'string' &&
      ['easy', 'medium', 'hard'].includes(profile.preferred_difficulty)
        ? (profile.preferred_difficulty as UserProfileFormState['preferredDifficulty'])
        : 'medium',
  };
}

function formatBudget(value: number) {
  return `$${(value / 1_000_000).toFixed(1)}M`;
}

export default function SetupPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [guideOpen, setGuideOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [profileExpanded, setProfileExpanded] = useState(false);
  const [showAdvancedScenario, setShowAdvancedScenario] = useState(false);
  const [showAdvancedIdentity, setShowAdvancedIdentity] = useState(false);
  const [showAdvancedBudget, setShowAdvancedBudget] = useState(false);
  const [data, setData] = useState<SetupData>({
    scenarioId: null,
    companyName: '',
    logoStyle: 'monogram',
    budgetAllocation: {
      brandAwareness: 33,
      leadGeneration: 34,
      conversionOptimization: 33,
    },
  });
  const [profileDraft, setProfileDraft] = useState<UserProfileFormState>(() => createDefaultUserProfileFormState());
  const [profileLoadState, setProfileLoadState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  usePageTracking();
  const { trackStart, trackMilestone } = useSimulationTracking();

  const [hasSavedRun, setHasSavedRun] = useState(false);
  const [savedRunContext, setSavedRunContext] = useState<Partial<SimulationContext> | null>(null);
  const [savedRunPhase, setSavedRunPhase] = useState<string>('idle');

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;
  const budgetTotal =
    data.budgetAllocation.brandAwareness +
    data.budgetAllocation.leadGeneration +
    data.budgetAllocation.conversionOptimization;
  const selectedScenario = SIMULATION_SCENARIOS.find((scenario) => scenario.id === data.scenarioId);
  const SelectedScenarioIcon = selectedScenario ? SCENARIO_CARD_ICONS[selectedScenario.iconKey] : undefined;
  const stepMeta = STEP_META[step - 1];

  useEffect(() => {
    trackMilestone('setup_step_view', step, { step });
  }, [step, trackMilestone]);

  useEffect(() => {
    if (!user) return;

    void (async () => {
      try {
        const response = await fetch('/api/simulations/latest');
        if (!response.ok) return;
        const responseData = await response.json();
        if (responseData?.run?.context) {
          setHasSavedRun(true);
          setSavedRunContext(responseData.run.context as Partial<SimulationContext>);
          setSavedRunPhase(responseData.run.current_phase || 'idle');
        }
      } catch (error) {
        logger.error('Failed to load latest saved run', error);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (user) return;
    setProfileLoadState('idle');
    setProfileMessage('Profile memory is optional for guests. Sign in anytime to sync these answers across runs.');
  }, [user]);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    setProfileLoadState('loading');

    void (async () => {
      try {
        const response = await fetch('/api/profile');
        if (!response.ok) {
          throw new Error('Failed to load profile memory.');
        }
        const apiData = await response.json();
        const loadedProfile = mapProfileFromApi(apiData?.profile);
        if (!isMounted) return;
        setProfileDraft((current) => ({ ...current, ...loadedProfile }));
        setProfileLoadState('ready');
        setProfileMessage(null);
      } catch (error) {
        if (!isMounted) return;
        setProfileLoadState('error');
        setProfileMessage(error instanceof Error ? error.message : 'Profile memory could not be loaded.');
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (step === 2 && data.companyName.trim().length >= 2 && !showAdvancedIdentity) {
      setShowAdvancedIdentity(true);
    }
  }, [data.companyName, showAdvancedIdentity, step]);

  const handleNext = () => {
    if (step < totalSteps) {
      setStep((current) => current + 1);
      return;
    }

    void saveAndContinue();
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((current) => current - 1);
    }
  };

  const commitScenarioAndAdvance = (scenarioId: string) => {
    setData((current) => ({ ...current, scenarioId }));
    setShowAdvancedScenario(false);
    setStep(2);
  };

  const commitIdentityAndAdvance = (logoStyle: CompanyLogoStyle) => {
    if (data.companyName.trim().length < 2) return;
    setData((current) => ({ ...current, logoStyle }));
    setStep(3);
  };

  const saveProfileMemory = async (runId: string) => {
    const profilePayload = {
      fullName: profileDraft.fullName.trim(),
      companyName: data.companyName.trim(),
      role: profileDraft.role,
      marketingMaturity: profileDraft.marketingMaturity,
      selectedGoals: profileDraft.selectedGoals,
      preferredDifficulty: profileDraft.preferredDifficulty,
      onboardingAnswers: {
        scenarioId: data.scenarioId,
        scenarioName: selectedScenario?.name ?? null,
        logoStyle: data.logoStyle,
        budgetAllocation: data.budgetAllocation,
        budgetTotal,
        runId,
      },
    };

    const response = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profilePayload),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error || 'Failed to save profile memory.');
    }

    return response.json();
  };

  const saveAndContinue = async () => {
    try {
      const scenario = SIMULATION_SCENARIOS.find((entry) => entry.id === data.scenarioId);
      if (!scenario) throw new Error('Scenario missing');

      // Guardrail: limit users to five saved runs at a time.
      // Server-side enforcement also exists, but this gives a clear UX before the user invests time.
      if (user) {
        try {
          const runsResponse = await fetch('/api/simulations');
          if (runsResponse.ok) {
            const runsJson = await runsResponse.json().catch(() => null);
            const existingRuns = Array.isArray(runsJson?.runs) ? (runsJson.runs as unknown[]) : [];
            if (existingRuns.length >= 5) {
              alert(
                "You already have 5 saved simulations. Delete one from 'My simulations' before starting a new run.",
              );
              router.push('/sim/simulations');
              return;
            }
          }
        } catch (limitError) {
          logger.warn('Saved run count check failed; continuing without local guardrail', {
            error: limitError,
          });
        }
      }

      const runId = crypto.randomUUID();
      const startedAt = new Date().toISOString();

      const initialState: Partial<SimulationContext> = {
        simulationId: runId,
        startedAt: new Date(startedAt),
        scenarioId: scenario.id,
        strategy: {
          companyName: data.companyName.trim(),
          guidedDemo: false,
          industry: scenario.industry,
          logoStyle: data.logoStyle,
          targetAudience: '',
          brandPositioning: '',
          primaryChannels: [],
          budgetAllocation: data.budgetAllocation,
          marketLandscape: scenario.marketLandscape,
          timeHorizon: scenario.timeHorizon,
          difficulty: mapPreferredDifficultyToRuntime(profileDraft.preferredDifficulty),
        },
        kpis: scenario.startingKPIs,
        totalBudget: scenario.budget,
        remainingBudget: scenario.budget,
      };
      const hydratedContext = mergeSimulationContext(
        createInitialSimulationContext(),
        initialState as HydrationPatch,
      );

      if (user) {
        try {
          await saveProfileMemory(runId);
          setProfileMessage('Profile saved to your account — future runs will reuse these answers.');
          setProfileLoadState('ready');
        } catch (profileError) {
          logger.error('Failed to save profile memory', profileError);
          setProfileMessage('Profile could not be synced; strategy and quarters still work — sign in later to retry.');
          setProfileLoadState('error');
        }
      } else {
        setProfileLoadState('idle');
        setProfileMessage('Continuing as guest. Profile memory will sync after you sign in.');
      }

      localStorage.setItem('cmo-sim-state-v2', JSON.stringify(initialState));

      try {
        await saveSimulationSnapshot(hydratedContext, 'setup', 'in_progress');
      } catch (snapshotError) {
        logger.error('Failed to persist initial simulation snapshot', snapshotError);
      }

      trackStart({
        industry: scenario.industry,
        difficulty: mapPreferredDifficultyToRuntime(profileDraft.preferredDifficulty),
        timeHorizon: scenario.timeHorizon,
        totalBudget: scenario.budget,
      });
      trackMilestone('setup_complete', totalSteps, {
        scenarioId: scenario.id,
        companyNameLength: data.companyName.trim().length,
      });

      void recordSimulationEvent({
        runId,
        eventType: 'setup_completed',
        phase: 'setup',
        payload: {
          scenarioId: scenario.id,
          companyName: data.companyName.trim(),
          role: profileDraft.role,
          marketingMaturity: profileDraft.marketingMaturity,
          preferredDifficulty: profileDraft.preferredDifficulty,
        },
      });

      router.push('/sim/strategy');
    } catch (error) {
      logger.error('Error saving simulation', error);
      alert('Failed to initialize simulation. Please try again.');
    }
  };

  const launchGuidedDemo = () => {
    const runId = crypto.randomUUID();
    const demoScenario =
      SIMULATION_SCENARIOS.find((scenario) => scenario.id === 'challenger') || SIMULATION_SCENARIOS[0];
    const guidedDemoState: Partial<SimulationContext> = {
      simulationId: runId,
      startedAt: new Date(),
      scenarioId: demoScenario.id,
      strategy: {
        companyName: 'Guided Demo Co.',
        guidedDemo: true,
        industry: demoScenario.industry,
        logoStyle: 'monogram',
        targetAudience: 'Young Professionals (25-35)',
        brandPositioning: 'Innovation & Technology',
        primaryChannels: ['digital', 'social', 'content'],
        budgetAllocation: {
          brandAwareness: 35,
          leadGeneration: 40,
          conversionOptimization: 25,
        },
        marketLandscape: demoScenario.marketLandscape,
        timeHorizon: demoScenario.timeHorizon,
        difficulty: 'intermediate',
      },
      kpis: demoScenario.startingKPIs,
      totalBudget: demoScenario.budget,
      remainingBudget: demoScenario.budget,
    };
    const hydratedDemoContext = mergeSimulationContext(
      createInitialSimulationContext(),
      guidedDemoState as HydrationPatch,
    );

    localStorage.setItem('cmo-sim-state-v2', JSON.stringify(guidedDemoState));
    void (async () => {
      try {
        await saveSimulationSnapshot(hydratedDemoContext, 'setup', 'in_progress');
        await recordSimulationEvent({
          runId,
          eventType: 'guided_demo_started',
          phase: 'setup',
          payload: {
            scenarioId: demoScenario.id,
          },
        });
      } catch (error) {
        logger.error('Failed to persist guided demo setup', error);
      }
    })();
    router.push('/sim/strategy?demo=1');
  };

  const resumeSavedRun = () => {
    if (!savedRunContext) return;
    localStorage.setItem('cmo-sim-state-v2', JSON.stringify(savedRunContext));
    router.push(resolveSimulationPath(savedRunPhase));
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return data.scenarioId !== null;
      case 2:
        return data.companyName.trim().length >= 2;
      case 3:
        return budgetTotal === 100;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const updateBudgetAllocation = (key: keyof SetupData['budgetAllocation'], value: number) => {
    setData((current) => ({
      ...current,
      budgetAllocation: {
        ...current.budgetAllocation,
        [key]: value,
      },
    }));
  };

  const completedSteps = STEP_META.slice(0, step - 1);
  const canShowLogoOptions = data.companyName.trim().length >= 2;
  const budgetLeader = useMemo(() => {
    return [...BUDGET_GUIDANCE].sort((a, b) => data.budgetAllocation[b.key] - data.budgetAllocation[a.key])[0];
  }, [data.budgetAllocation]);

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-600">
              <Wrench className="h-3.5 w-3.5" />
              Executive calibration
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Diagnose the operating context before tactics</h1>
            <p className="mt-2 text-sm text-slate-600">
              Each step captures board pressure, identity, and capital posture — the inputs leadership teams argue about before campaigns ship. Only what this step needs is shown.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="border-slate-200 bg-white text-slate-700" onClick={launchGuidedDemo}>
              Start Guided Demo Run
            </Button>
            {hasSavedRun ? (
              <Button
                type="button"
                variant="outline"
                className="border-emerald-200 bg-emerald-50 text-emerald-900"
                onClick={resumeSavedRun}
                title="Restores your last cloud save and routes you to the saved phase (strategy or a quarter)."
              >
                Resume latest saved run
              </Button>
            ) : null}
          </div>
        </div>
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between text-sm font-semibold text-slate-800">
            <span>{stepMeta.label}</span>
            <span>Step {step} of {totalSteps}</span>
          </div>
          <Progress value={progress} className="mt-3 h-2.5 bg-slate-200" />
          <div className="mt-2 text-xs text-slate-500">{Math.round(progress)}% complete</div>
          <div className="mt-3 md:hidden">
            <Button type="button" variant="outline" className="w-full border-slate-200 bg-white text-slate-700" onClick={() => setReviewOpen(true)}>
              Open setup review
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-600">
              Profile Memory
            </div>
            <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">Anchor the run to a real decision-maker</h2>
            <p className="mt-2 text-sm text-slate-600">
              {user
                ? 'Stored with your account so future sessions and debriefs stay grounded in role, maturity, and stated goals — without changing how quarters execute.'
                : 'Used immediately for this playthrough. Sign in later if you want these answers synced across future runs and debriefs.'}
            </p>
          </div>
          <div className="text-xs font-medium text-slate-500">
            {profileLoadState === 'loading'
              ? 'Loading saved profile...'
              : profileLoadState === 'ready'
                ? 'Profile memory ready'
                : profileLoadState === 'error'
                  ? 'Profile memory needs attention'
                  : 'Profile memory idle'}
          </div>
        </div>
        <div className="mt-4">
          <Button type="button" variant="outline" className="border-slate-200 bg-white text-slate-700" onClick={() => setProfileExpanded((prev) => !prev)}>
            {profileExpanded ? 'Hide profile memory' : 'Open profile memory'}
          </Button>
        </div>

        {profileMessage ? (
          <p className={cn('mt-3 rounded-2xl px-4 py-3 text-sm', profileLoadState === 'error' ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-800')}>
            {profileMessage}
          </p>
        ) : null}

        {profileExpanded ? (
        <>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <Label htmlFor="profile-full-name" className="text-slate-700">Full name</Label>
            <Input
              id="profile-full-name"
              className="mt-2 bg-white border-slate-200 text-slate-900"
              value={profileDraft.fullName}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setProfileDraft((current) => ({ ...current, fullName: event.target.value }))
              }
              placeholder="Alex Morgan"
            />
          </div>

          <div>
            <Label htmlFor="profile-role" className="text-slate-700">Role / persona</Label>
            <select
              id="profile-role"
              className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900"
              value={profileDraft.role}
              onChange={(event) =>
                setProfileDraft((current) => ({ ...current, role: event.target.value as UserProfileFormState['role'] }))
              }
            >
              {PROFILE_ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="profile-maturity" className="text-slate-700">Marketing maturity</Label>
            <select
              id="profile-maturity"
              className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900"
              value={profileDraft.marketingMaturity}
              onChange={(event) =>
                setProfileDraft((current) => ({
                  ...current,
                  marketingMaturity: event.target.value as UserProfileFormState['marketingMaturity'],
                }))
              }
            >
              {MARKETING_MATURITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="profile-difficulty" className="text-slate-700">Preferred difficulty</Label>
            <select
              id="profile-difficulty"
              className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900"
              value={profileDraft.preferredDifficulty}
              onChange={(event) =>
                setProfileDraft((current) => ({
                  ...current,
                  preferredDifficulty: event.target.value as UserProfileFormState['preferredDifficulty'],
                }))
              }
            >
              {[
                { value: 'easy', label: 'Easy' },
                { value: 'medium', label: 'Medium' },
                { value: 'hard', label: 'Hard' },
              ].map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between gap-3">
            <Label className="text-slate-700">Primary goals</Label>
            <span className="text-xs text-slate-500">Pick one or more</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {SIMULATION_GOAL_OPTIONS.map((goal) => {
              const isSelected = profileDraft.selectedGoals.includes(goal.value);
              return (
                <button
                  key={goal.value}
                  type="button"
                  className={cn(
                    'rounded-full border px-3 py-2 text-sm font-medium transition-colors',
                    isSelected
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                  )}
                  onClick={() =>
                    setProfileDraft((current) => ({
                      ...current,
                      selectedGoals: toggleGoal(current.selectedGoals, goal.value),
                    }))
                  }
                >
                  {goal.label}
                </button>
              );
            })}
          </div>
        </div>
        </>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
            Keep this collapsed if you want the setup flow to stay tighter on mobile. Open it when you want the run tied to role, goals, and preferred difficulty.
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_320px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            {step === 1 && (
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
                <CardHeader className="border-b border-slate-200 bg-slate-50/80">
                  <CardTitle className="text-xl font-semibold tracking-tight text-slate-950">What operating context are you stepping into?</CardTitle>
                  <CardDescription className="mt-2 text-sm leading-6 text-slate-600">Recommended default first, then advanced scenario options if needed.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm font-semibold text-slate-900">Recommended: The Challenger Brand</div>
                    <p className="mt-2 text-sm text-slate-600">Balanced difficulty with a lean budget. Best default for first run-throughs.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        className="bg-slate-950 text-white hover:bg-slate-800"
                        onClick={() => commitScenarioAndAdvance('challenger')}
                      >
                        Use recommended default
                      </Button>
                      <Button type="button" variant="outline" className="border-slate-200" onClick={() => setShowAdvancedScenario((prev) => !prev)}>
                        {showAdvancedScenario ? 'Hide advanced choices' : 'Show advanced choices'}
                      </Button>
                    </div>
                  </div>
                  {showAdvancedScenario && (
                    <div className="mt-5 grid gap-5 lg:grid-cols-3">
                    {SIMULATION_SCENARIOS.map((scenario) => {
                      const Icon = SCENARIO_CARD_ICONS[scenario.iconKey];
                      const isSelected = data.scenarioId === scenario.id;

                      return (
                        <button
                          key={scenario.id}
                          type="button"
                          className={cn(
                            'group h-full rounded-3xl border p-5 text-left transition-all',
                            isSelected
                              ? 'border-slate-900 bg-slate-950 text-white shadow-[0_18px_40px_rgba(15,23,42,0.2)]'
                              : 'border-slate-200 bg-slate-50/70 text-slate-950 hover:border-slate-300 hover:bg-white',
                          )}
                          onClick={() => commitScenarioAndAdvance(scenario.id)}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className={cn('rounded-2xl border p-3', isSelected ? 'border-white/10 bg-white/10' : scenario.color)}>
                              <Icon className="h-6 w-6" />
                            </div>
                            <Badge
                              className={cn(
                                'border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]',
                                isSelected
                                  ? 'border-white/10 bg-white/10 text-white'
                                  : 'border-slate-200 bg-white text-slate-600',
                              )}
                            >
                              {scenario.difficulty}
                            </Badge>
                          </div>

                          <div className="mt-5">
                            <h3 className="text-xl font-semibold tracking-tight">{scenario.name}</h3>
                            <p className={cn('mt-3 text-sm leading-6', isSelected ? 'text-slate-200' : 'text-slate-600')}>
                              {scenario.description}
                            </p>
                          </div>

                          <div className={cn('mt-5 grid grid-cols-2 gap-3 rounded-2xl border p-4', isSelected ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white')}>
                            <div>
                              <div className={cn('text-[10px] font-semibold uppercase tracking-[0.18em]', isSelected ? 'text-slate-100' : 'text-slate-500')}>
                                Budget
                              </div>
                              <div className="mt-1 text-lg font-semibold">{formatBudget(scenario.budget)}</div>
                            </div>
                            <div>
                              <div className={cn('text-[10px] font-semibold uppercase tracking-[0.18em]', isSelected ? 'text-slate-100' : 'text-slate-500')}>
                                Horizon
                              </div>
                              <div className="mt-1 text-lg font-semibold">{scenario.timeHorizon}</div>
                            </div>
                          </div>

                          <div className={cn('mt-4 rounded-2xl border p-4 text-sm leading-6', isSelected ? 'border-amber-300/18 bg-amber-300/10 text-white' : 'border-slate-200 bg-white text-slate-600')}>
                            <div className={cn('text-[10px] font-semibold uppercase tracking-[0.18em]', isSelected ? 'text-amber-100' : 'text-slate-500')}>
                              Board mandate
                            </div>
                            <p className="mt-2">{scenario.executiveMandate}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  )}
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
                <CardHeader className="border-b border-slate-200 bg-slate-50/80">
                  <CardTitle className="text-xl font-semibold tracking-tight text-slate-950">What should this workspace be called?</CardTitle>
                  <CardDescription className="mt-2 text-sm leading-6 text-slate-600">Use the recommended name, or enter your own and reveal advanced identity controls.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm font-semibold text-slate-900">Recommended default name: Northstar Systems</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        className="bg-slate-950 text-white hover:bg-slate-800"
                        onClick={() => {
                          setData((current) => ({ ...current, companyName: 'Northstar Systems' }));
                          setShowAdvancedIdentity(true);
                        }}
                      >
                        Use recommended default
                      </Button>
                      <Button type="button" variant="outline" className="border-slate-200" onClick={() => setShowAdvancedIdentity((prev) => !prev)}>
                        {showAdvancedIdentity ? 'Hide advanced choices' : 'Show advanced choices'}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <Label htmlFor="company-name" className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Official company name
                    </Label>
                    <Input
                      id="company-name"
                      placeholder="e.g., Apex Health, Marketline Systems, Northstar Legal"
                      value={data.companyName}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setData((current) => ({ ...current, companyName: event.target.value }))}
                      className="h-14 border-slate-200 bg-white text-lg font-semibold text-slate-950 placeholder:text-slate-400"
                      autoFocus
                    />
                  </div>
                  {showAdvancedIdentity && canShowLogoOptions ? (
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
                      <div className="space-y-3">
                        <div className="text-sm font-semibold text-slate-900">Now choose the mark treatment:</div>
                        {LOGO_STYLE_OPTIONS.map((option) => {
                          const Icon = option.icon;
                          const isSelected = data.logoStyle === option.id;
                          return (
                            <button
                              key={option.id}
                              type="button"
                              className={cn(
                                'w-full rounded-2xl border p-4 text-left transition-all',
                                isSelected ? 'border-slate-900 bg-slate-950 text-white' : 'border-slate-200 bg-slate-50/70 text-slate-900 hover:border-slate-300 hover:bg-white',
                              )}
                              onClick={() => commitIdentityAndAdvance(option.id)}
                            >
                              <div className="flex items-center gap-3">
                                <Icon className="h-5 w-5" />
                                <div className="text-sm font-semibold">{option.label}</div>
                              </div>
                              <p className={cn('mt-2 text-sm', isSelected ? 'text-slate-200' : 'text-slate-600')}>{option.description}</p>
                            </button>
                          );
                        })}
                      </div>
                      <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Identity preview</div>
                        <div className="mt-4 flex justify-center">
                          <LogoGenerator companyName={data.companyName} industry={selectedScenario?.industry || 'saas'} style={data.logoStyle} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                      {showAdvancedIdentity ? 'Enter at least 2 characters to continue.' : 'Advanced identity controls are hidden.'}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {step === 3 && (
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
                <CardHeader className="border-b border-slate-200 bg-slate-50/80">
                  <CardTitle className="text-xl font-semibold tracking-tight text-slate-950">How should capital be weighted right now?</CardTitle>
                  <CardDescription className="mt-2 text-sm leading-6 text-slate-600">
                    Start with the recommended split, then reveal advanced controls only if needed.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 p-6">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm font-semibold text-slate-900">Recommended default split: 35% Brand / 40% Demand / 25% Conversion</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        className="bg-slate-950 text-white hover:bg-slate-800"
                        onClick={() =>
                          setData((current) => ({
                            ...current,
                            budgetAllocation: { brandAwareness: 35, leadGeneration: 40, conversionOptimization: 25 },
                          }))
                        }
                      >
                        Use recommended default
                      </Button>
                      <Button type="button" variant="outline" className="border-slate-200" onClick={() => setShowAdvancedBudget((prev) => !prev)}>
                        {showAdvancedBudget ? 'Hide advanced choices' : 'Show advanced choices'}
                      </Button>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Current leader: {budgetLeader.shortLabel}</p>
                  </div>

                  {showAdvancedBudget && BUDGET_GUIDANCE.map((item) => (
                    <div key={item.key} className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="max-w-2xl">
                          <div className="flex items-center gap-2">
                            <div className={cn('text-lg font-semibold tracking-tight text-slate-950', item.accent)}>
                              {item.label}
                            </div>
                            <InfoTooltip iconOnly content={item.detail} />
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                        </div>
                        <div className={cn('text-2xl font-semibold', item.accent)}>
                          {data.budgetAllocation[item.key]}%
                        </div>
                      </div>

                      <div className="mt-4">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={data.budgetAllocation[item.key]}
                          onChange={(event) => updateBudgetAllocation(item.key, parseInt(event.target.value, 10))}
                          className={cn('h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200', item.track)}
                        />
                      </div>
                    </div>
                  ))}

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Allocation status</div>
                    <div className="mt-1 text-2xl font-semibold text-slate-950">{budgetTotal}%</div>
                    <div className={cn('mt-1 text-xs', budgetTotal === 100 ? 'text-emerald-600' : 'text-rose-600')}>
                      {budgetTotal === 100 ? 'Balanced and ready for review' : 'Must total exactly 100%'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 4 && selectedScenario && (
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
                <CardHeader className="border-b border-slate-200 bg-slate-50/80 pb-6 text-center">
                  <div className="mx-auto flex w-full max-w-3xl flex-col items-center">
                    <LogoGenerator companyName={data.companyName} industry={selectedScenario.industry} style={data.logoStyle} />
                    <CardTitle className="mt-6 text-3xl font-semibold tracking-tight text-slate-950">Executive workspace brief</CardTitle>
                    <CardDescription className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                      Review the final operating context before handing the workspace into the strategy session.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 p-6">
                  <div className="grid gap-5 lg:grid-cols-2">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Campaign context</div>
                      <div className="mt-4 flex items-start gap-4">
                        <div className={cn('rounded-2xl border p-3', selectedScenario.color)}>
                          {SelectedScenarioIcon ? <SelectedScenarioIcon className="h-6 w-6" /> : null}
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold tracking-tight text-slate-950">{selectedScenario.name}</h3>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{selectedScenario.description}</p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Badge className="border border-slate-200 bg-white text-slate-700">{selectedScenario.timeHorizon}</Badge>
                            <Badge className="border border-slate-200 bg-white text-slate-700">{selectedScenario.difficulty}</Badge>
                            <Badge className="border border-slate-200 bg-white text-slate-700 capitalize">
                              {selectedScenario.industry.replace('-', ' ')}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Financial philosophy</div>
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                          <div>
                            <div className="text-sm font-semibold text-slate-600">Annual Budget</div>
                            <div className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
                              {formatBudget(selectedScenario.budget)}
                            </div>
                          </div>
                          <DollarSign className="h-8 w-8 text-emerald-600" />
                        </div>
                        <div className="mt-4 space-y-3">
                          {BUDGET_GUIDANCE.map((item) => (
                            <div key={item.key} className="flex items-center justify-between text-sm">
                              <span className="font-medium text-slate-600">{item.shortLabel}</span>
                              <span className="font-semibold text-slate-950">{data.budgetAllocation[item.key]}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700">CEO mandate</div>
                        <p className="mt-2 text-sm font-medium leading-6 text-amber-900">{selectedScenario.executiveMandate}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-950 px-5 py-4 text-white">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">What launches next</div>
                    <p className="mt-2 text-sm leading-6 text-slate-200">
                      Completing setup saves this workspace, opens the strategy session, and then unlocks the Q1 operating console once audience, positioning, and channels are defined.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>

        <aside className="hidden space-y-5 xl:block">
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold tracking-tight text-slate-950">Conversation Summary</CardTitle>
              <CardDescription>Only committed answers from each step.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Scenario</div>
                <div className="mt-2 text-sm font-semibold text-slate-950">
                  {selectedScenario ? selectedScenario.name : 'Awaiting selection'}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {selectedScenario ? `${formatBudget(selectedScenario.budget)} annual budget` : 'Choose a board context to continue.'}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Identity</div>
                <div className="mt-2 text-sm font-semibold text-slate-950">
                  {data.companyName.trim() || 'Name not approved yet'}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {LOGO_STYLE_OPTIONS.find((option) => option.id === data.logoStyle)?.label}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Budget posture</div>
                <div className="mt-2 space-y-2">
                  {BUDGET_GUIDANCE.map((item) => (
                    <div key={item.key} className="flex items-center justify-between text-sm text-slate-700">
                      <span>{item.shortLabel}</span>
                      <span className="font-semibold text-slate-950">{data.budgetAllocation[item.key]}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold tracking-tight text-slate-950">Step Rail</CardTitle>
              <CardDescription>Focused on the active decision only.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {STEP_META.map((item, index) => {
                const isComplete = index < step - 1;
                const isActive = index === step - 1;

                return (
                  <div
                    key={item.label}
                    className={cn(
                      'rounded-2xl border px-4 py-3',
                      isActive
                        ? 'border-slate-900 bg-slate-950 text-white'
                        : isComplete
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                          : 'border-slate-200 bg-slate-50/80 text-slate-600',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn('mt-0.5 rounded-full p-1', isActive ? 'bg-white/10' : isComplete ? 'bg-emerald-100' : 'bg-white')}>
                        <CircleCheckBig className={cn('h-4 w-4', isActive ? 'text-white' : isComplete ? 'text-emerald-700' : 'text-slate-400')} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{item.label}</div>
                        <div className={cn('mt-1 text-xs leading-5', isActive ? 'text-slate-200' : isComplete ? 'text-emerald-800' : 'text-slate-500')}>
                          {isActive ? item.nextAction : isComplete ? 'Completed and committed to the workspace brief.' : item.summary}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {completedSteps.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
                  No setup steps completed yet. Start with the operating scenario.
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>

      <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+88px)] z-30 flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm sm:static sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="ghost"
          onClick={handleBack}
          className={cn('justify-start px-0 text-slate-600 hover:bg-transparent hover:text-slate-950', step === 1 && 'pointer-events-none opacity-0')}
        >
          Go Back
        </Button>

        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <div className="text-sm text-slate-500">
            {canProceed()
              ? 'This step is complete and ready to advance.'
              : step === 3
                ? 'Budget allocation must equal 100% before you continue.'
                : 'Complete the current step to continue.'}
          </div>
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="h-12 rounded-xl bg-slate-950 px-6 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400"
          >
            {step === totalSteps ? (
              <span className="flex items-center gap-2">
                Commence Strategy Session
                <Rocket className="h-4 w-4" />
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Save answer and continue
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </div>
      </div>

      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="max-w-2xl border-slate-200 bg-white text-slate-950">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold tracking-tight">{stepMeta.popupTitle}</DialogTitle>
            <DialogDescription className="text-sm leading-6 text-slate-600">
              {stepMeta.popupDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Immediate next action</div>
              <p className="mt-2 text-sm font-semibold text-slate-950">{stepMeta.nextAction}</p>
            </div>

            <div className="space-y-3">
              {stepMeta.nextDetails.map((detail) => (
                <div key={detail} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                  <CircleCheckBig className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <p className="text-sm leading-6 text-slate-600">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <MobileSheet open={reviewOpen} onOpenChange={setReviewOpen}>
        <MobileSheetContent className="max-h-[82vh]">
          <MobileSheetHeader>
            <MobileSheetTitle>Setup review</MobileSheetTitle>
            <MobileSheetDismissButton />
          </MobileSheetHeader>
          <div className="space-y-4 overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+18px)]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Scenario</div>
              <div className="mt-2 text-sm font-semibold text-slate-950">{selectedScenario ? selectedScenario.name : 'Awaiting selection'}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Identity</div>
              <div className="mt-2 text-sm font-semibold text-slate-950">{data.companyName.trim() || 'Name not approved yet'}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Budget posture</div>
              <div className="mt-2 space-y-2">
                {BUDGET_GUIDANCE.map((item) => (
                  <div key={item.key} className="flex items-center justify-between text-sm text-slate-700">
                    <span>{item.shortLabel}</span>
                    <span className="font-semibold text-slate-950">{data.budgetAllocation[item.key]}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </MobileSheetContent>
      </MobileSheet>
    </div>
  );
}
