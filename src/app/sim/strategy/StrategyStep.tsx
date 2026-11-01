'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, type ChangeEvent } from 'react';
import { useSimulation } from '@/hooks/useSimulation';
import { useSimulationTracking } from '@/hooks/useAnalytics';
import { recordSimulationEvent } from '@/lib/simulationTelemetry';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  DollarSign,
  Megaphone,
  Target,
  Users,
} from 'lucide-react';

import {
  STRATEGY_AUDIENCE_PRESETS,
  STRATEGY_CHANNEL_OPTIONS,
  STRATEGY_POSITIONING_PRESETS,
} from '@/lib/config/strategySessionOptions';
import { ImmersiveLayout } from '@/components/simulation/ImmersiveLayout';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

type StrategyFormData = {
  targetAudience: string;
  brandPositioning: string;
  primaryChannels: string[];
  customAudience: string;
  customPositioning: string;
};

export function StrategyStep({ stayOnPlay = false }: { stayOnPlay?: boolean } = {}) {
  const router = useRouter();
  const { context, setStrategy, completeStrategySession, startSimulation, send } = useSimulation();
  const { trackMilestone } = useSimulationTracking();
  const { guidedDemo, targetAudience, brandPositioning, primaryChannels } = context.strategy;

  const [formData, setFormData] = useState<StrategyFormData>({
    targetAudience: targetAudience || '',
    brandPositioning: brandPositioning || '',
    primaryChannels: primaryChannels || [],
    customAudience: '',
    customPositioning: '',
  });
  const [mobileStep, setMobileStep] = useState<1 | 2 | 3>(1);
  const [channelDetailsId, setChannelDetailsId] = useState<string | null>(null);

  const selectedChannel = channelDetailsId ? STRATEGY_CHANNEL_OPTIONS.find((c) => c.id === channelDetailsId) ?? null : null;

  const handleChannelToggle = (channelId: string) => {
    const nextChannels = formData.primaryChannels.includes(channelId)
      ? formData.primaryChannels.filter((id) => id !== channelId)
      : [...formData.primaryChannels, channelId];

    setFormData((current) => ({ ...current, primaryChannels: nextChannels }));
    setStrategy({ primaryChannels: nextChannels });
  };

  const handleAudienceSelect = (audience: string) => {
    setFormData((current) => ({ ...current, targetAudience: audience }));
    setStrategy({ targetAudience: audience });
    setMobileStep(2);
  };

  const handlePositioningSelect = (positioning: string) => {
    setFormData((current) => ({ ...current, brandPositioning: positioning }));
    setStrategy({ brandPositioning: positioning });
    setMobileStep(3);
  };

  const handleCustomAudience = () => {
    if (formData.customAudience.trim()) {
      handleAudienceSelect(formData.customAudience.trim());
      setFormData((current) => ({ ...current, customAudience: '' }));
    }
  };

  const handleCustomPositioning = () => {
    if (formData.customPositioning.trim()) {
      handlePositioningSelect(formData.customPositioning.trim());
      setFormData((current) => ({ ...current, customPositioning: '' }));
    }
  };

  const handleComplete = () => {
    trackMilestone('strategy_complete', formData.primaryChannels.length, {
      audienceSelected: Boolean(formData.targetAudience),
      positioningSelected: Boolean(formData.brandPositioning),
    });
    void recordSimulationEvent({
      runId: context.simulationId ?? '',
      eventType: 'strategy_completed',
      phase: 'strategy',
      payload: {
        audienceSelected: Boolean(formData.targetAudience),
        positioningSelected: Boolean(formData.brandPositioning),
        primaryChannels: formData.primaryChannels,
      },
    });
    startSimulation();
    completeStrategySession();
    if (stayOnPlay) {
      send({ type: 'SET_PLAY_STEP', playStep: 'q1-plan' });
      return;
    }
    router.push('/sim/q1');
  };

  const canComplete = Boolean(
    formData.targetAudience && formData.brandPositioning && formData.primaryChannels.length > 0
  );
  const canAdvanceStep =
    (mobileStep === 1 && Boolean(formData.targetAudience))
    || (mobileStep === 2 && Boolean(formData.brandPositioning))
    || mobileStep === 3;

  useEffect(() => {
    trackMilestone('strategy_step_view', mobileStep, { step: mobileStep });
  }, [mobileStep, trackMilestone]);

  useEffect(() => {
    const guidedDemoReady =
      guidedDemo && targetAudience && brandPositioning && (primaryChannels?.length || 0) > 0;

    if (guidedDemoReady) {
      void recordSimulationEvent({
        runId: context.simulationId ?? '',
        eventType: 'guided_demo_transitioned',
        phase: 'strategy',
        payload: {
          targetAudience,
          brandPositioning,
          primaryChannels,
        },
      });
      startSimulation();
      completeStrategySession();
      if (stayOnPlay) {
        send({ type: 'SET_PLAY_STEP', playStep: 'q1-plan' });
        return;
      }
      router.replace('/sim/q1');
    }
  }, [brandPositioning, completeStrategySession, context.simulationId, guidedDemo, primaryChannels, router, send, startSimulation, stayOnPlay, targetAudience]);

  return (
    <ImmersiveLayout
      title="Strategic foundation — executive hypothesis"
      subtitle="Translate calibration into a testable GTM thesis: who you serve, how you show up, and which lanes get priority before budget hits the quarterly console."
      quarter="Strategy Session"
      hideHeader={stayOnPlay}
    >
      <div className="max-w-5xl mx-auto space-y-10 pb-20">
        {/* Strategy Controls */}
        {!stayOnPlay ? <GlassCard className="border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_55%,#f1f5f9_100%)]">
          <div className="p-6 md:p-8">
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-700">
                  Strategy diagnostics
                </div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-950 md:text-xl">
                  Lock the thesis the operating quarters must defend
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-slate-700">
                  These answers shape tactic eligibility, alignment scoring, and how pressure shows up in-quarter — they are not cosmetic flavor text.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600">What unlocks next</div>
                  <div className="mt-2 text-sm font-semibold text-slate-950">Quarter operating console</div>
                  <div className="mt-1 text-sm leading-6 text-slate-700">
                    Q1 opens only after this thesis is explicit — budget deployment follows, not precedes, the narrative.
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600">Required inputs</div>
                  <div className="mt-2 text-sm font-semibold text-slate-950">Audience · stance · channels</div>
                  <div className="mt-1 text-sm leading-6 text-slate-700">
                    Each selection feeds alignment scoring and mentor cues across Q1–Q4 (same completion rules as before).
                  </div>
                </div>
              </div>
            </div>
          </div>
        </GlassCard> : null}

        <div className={stayOnPlay ? "" : "rounded-2xl border border-slate-200 bg-white p-4"}>
          <div className={stayOnPlay ? "flex items-center justify-between text-sm text-[#6b6b6b]" : "flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"}>
            <span>{stayOnPlay ? "This decision" : "Strategy flow"}</span>
            <span className={stayOnPlay ? "font-mono tabular-nums text-[#0a0a0a]" : ""}>{mobileStep} / 3</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[1, 2, 3].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setMobileStep(s as 1 | 2 | 3)}
                className={cn(
                  'rounded-xl border px-2 py-2 text-xs font-semibold',
                  mobileStep === s ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-600',
                )}
              >
                {s === 1 ? 'Audience' : s === 2 ? 'Positioning' : 'Channels'}
              </button>
            ))}
          </div>
        </div>

        {/* Budget Overview */}
        {stayOnPlay ? (
          <p className="text-sm text-[#6b6b6b]">
            Year budget{" "}
            <span className="font-mono text-[30px] font-medium tabular-nums text-[#0a0a0a]">
              ${context.totalBudget.toLocaleString()}
            </span>
          </p>
        ) : (
        <GlassCard className="border-slate-200 bg-white">
          <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-full bg-slate-50 border border-slate-200">
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-950 mb-1">Annual marketing envelope</h3>
                <p className="text-slate-600 text-sm">Scenario-defined capital you will deploy across four quarters — pillar split from setup still applies.</p>
              </div>
            </div>
            <div className="text-4xl sm:text-5xl font-semibold tracking-tight text-slate-950">
              ${context.totalBudget.toLocaleString()}
            </div>
          </div>
        </GlassCard>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Target Audience */}
          <GlassCard className={cn("h-full", mobileStep !== 1 && 'hidden', stayOnPlay && "border-0 bg-transparent p-0 shadow-none")}>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-950">
                  <Users className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-semibold">Target Audience</h3>
                  <InfoTooltip iconOnly content="Your audience focus informs tactic selection, market response, and how efficiently different channels convert." />
                </div>
                <p className="text-slate-600 text-sm">
                  Who is your primary customer segment?
                </p>
              </div>

              <div className="grid gap-3">
                {STRATEGY_AUDIENCE_PRESETS.map((audience) => (
                  <Button
                    key={audience}
                    variant="outline"
                    className={cn(
                      "justify-start h-auto p-4 transition-all duration-300",
                      formData.targetAudience === audience 
                        ? "border-slate-900 bg-slate-900 text-white shadow-sm" 
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    )}
                    onClick={() => handleAudienceSelect(audience)}
                  >
                    {audience}
                  </Button>
                ))}
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-200">
                <Label htmlFor="custom-audience" className="text-slate-900 font-semibold">Custom Audience</Label>
                <div className="flex gap-2">
                  <Input
                    id="custom-audience"
                    placeholder="Define your own..."
                    className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                    value={formData.customAudience}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setFormData((current) => ({ ...current, customAudience: e.target.value }))
                    }
                  />
                  <Button 
                    onClick={handleCustomAudience} 
                    disabled={!formData.customAudience.trim()}
                    className="bg-slate-900 hover:bg-slate-800 text-white"
                  >
                    Add
                  </Button>
                </div>
              </div>

              {formData.targetAudience && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-slate-50 rounded-xl border border-slate-200"
                >
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Selected Focus</p>
                  <p className="text-slate-950 font-semibold text-lg">{formData.targetAudience}</p>
                </motion.div>
              )}
            </div>
          </GlassCard>

          {/* Brand Positioning */}
          <GlassCard className={cn("h-full", mobileStep !== 2 && 'hidden', stayOnPlay && "border-0 bg-transparent p-0 shadow-none")}>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-950">
                  <Target className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-semibold">Brand Positioning</h3>
                  <InfoTooltip iconOnly content="Positioning frames your market stance and influences how brand and demand investments are interpreted later in the simulation." />
                </div>
                <p className="text-slate-600 text-sm">
                  How do you want to be perceived in the market?
                </p>
              </div>

              <div className="grid gap-3">
                {STRATEGY_POSITIONING_PRESETS.map((positioning) => (
                  <Button
                    key={positioning}
                    variant="outline"
                    className={cn(
                      "justify-start h-auto p-4 transition-all duration-300",
                      formData.brandPositioning === positioning 
                        ? "border-slate-900 bg-slate-900 text-white shadow-sm" 
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    )}
                    onClick={() => handlePositioningSelect(positioning)}
                  >
                    {positioning}
                  </Button>
                ))}
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-200">
                <Label htmlFor="custom-positioning" className="text-slate-900 font-semibold">Custom Positioning</Label>
                <div className="flex gap-2">
                  <Input
                    id="custom-positioning"
                    placeholder="Define your own..."
                    className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                    value={formData.customPositioning}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setFormData((current) => ({ ...current, customPositioning: e.target.value }))
                    }
                  />
                  <Button 
                    onClick={handleCustomPositioning} 
                    disabled={!formData.customPositioning.trim()}
                    className="bg-slate-900 hover:bg-slate-800 text-white"
                  >
                    Add
                  </Button>
                </div>
              </div>

              {formData.brandPositioning && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-slate-50 rounded-xl border border-slate-200"
                >
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Market Stance</p>
                  <p className="text-slate-950 font-semibold text-lg">{formData.brandPositioning}</p>
                </motion.div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Primary Channels */}
        <GlassCard className={cn(mobileStep !== 3 && 'hidden', stayOnPlay && "border-0 bg-transparent p-0 shadow-none")}>
          <div className="p-8 space-y-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-950">
                <Megaphone className="h-6 w-6 text-primary" />
                <h3 className="text-xl font-semibold">Primary Marketing Channels</h3>
                <InfoTooltip iconOnly content="These are the operating lanes you expect to emphasize first. They provide the starting logic for tactical planning in Q1." />
              </div>
              <p className="text-slate-600 text-sm">
                Select 2-4 channels that align with your strategy (minimum 1 required)
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {STRATEGY_CHANNEL_OPTIONS.map((channel) => {
                const selected = formData.primaryChannels.includes(channel.id);
                return (
                  <div
                    key={channel.id}
                    className={cn(
                      buttonVariants({ variant: 'outline', size: 'default' }),
                      'flex h-auto flex-col items-stretch gap-3 whitespace-normal p-4 text-left transition-all duration-300',
                      selected
                        ? 'scale-[1.02] border-slate-900 bg-slate-900 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                    )}
                  >
                    <button
                      type="button"
                      className={cn(
                        'flex flex-col items-start gap-3 rounded-md border-0 bg-transparent p-0 text-left outline-none ring-offset-background',
                        'transition-colors hover:bg-transparent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        selected ? 'text-white' : 'text-slate-700',
                      )}
                      onClick={() => handleChannelToggle(channel.id)}
                      aria-pressed={selected}
                    >
                      <ChannelIcon icon={channel.icon} selected={selected} />
                      <div className="min-w-0 w-full">
                        <div className="break-words text-[12px] font-black uppercase tracking-[0.12em] leading-4">
                          {channel.name}
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      className={cn(
                        'inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                        selected
                          ? 'border-white/15 bg-white/10 text-white hover:bg-white/15'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100',
                      )}
                      onClick={() => setChannelDetailsId(channel.id)}
                    >
                      Learn more
                    </button>
                  </div>
                );
              })}
            </div>

            {formData.primaryChannels.length > 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-6 p-6 bg-slate-50 rounded-2xl border border-slate-200"
              >
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-4">Tactical Matrix Channels</p>
                <div className="flex flex-wrap gap-3">
                  {formData.primaryChannels.map((channelId: string) => {
                    const channel = STRATEGY_CHANNEL_OPTIONS.find(c => c.id === channelId);
                    return (
                      <Badge key={channelId} variant="secondary" className="bg-white text-slate-700 border-slate-200 px-3 py-1 text-sm font-semibold">
                        {channel?.name}
                      </Badge>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>
        </GlassCard>

        {/* Action Button */}
        <div className="flex flex-col items-center gap-4 pt-10">
          {stayOnPlay ? null : (
          <Button
            size="lg"
            onClick={handleComplete}
            disabled={!canComplete}
            className={cn(
              "px-12 py-8 text-xl font-black rounded-full transition-all duration-500",
              canComplete 
                ? "bg-slate-900 hover:bg-slate-800 text-white shadow-sm" 
                : "bg-slate-200 text-slate-400"
            )}
          >
            Launch Q1 Operations
            <ArrowRight className="ml-3 h-6 w-6" />
          </Button>
          )}
          
          {!canComplete && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-slate-500 font-medium italic"
            >
              Strategize your foundation to unlock the command center
            </motion.p>
          )}
        </div>

        <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+88px)] z-30 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:hidden">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-slate-200"
              disabled={mobileStep === 1}
              onClick={() => setMobileStep((prev) => (prev === 1 ? 1 : ((prev - 1) as 1 | 2 | 3)))}
            >
              Back
            </Button>
            {mobileStep < 3 ? (
              <Button
                type="button"
                className="flex-1 bg-slate-900 text-white hover:bg-slate-800"
                disabled={!canAdvanceStep}
                onClick={() => setMobileStep((prev) => (prev === 3 ? 3 : ((prev + 1) as 1 | 2 | 3)))}
              >
                Continue
              </Button>
            ) : stayOnPlay ? null : (
              <Button type="button" className="flex-1 bg-slate-900 text-white hover:bg-slate-800" disabled={!canComplete} onClick={handleComplete}>
                Launch Q1
              </Button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={Boolean(channelDetailsId)} onOpenChange={(open) => { if (!open) setChannelDetailsId(null); }}>
        <DialogContent className="max-w-xl border-slate-200 bg-white text-slate-950">
          {selectedChannel ? (
            <DialogHeader>
              <DialogTitle className="text-slate-950">{selectedChannel.name}</DialogTitle>
              <DialogDescription className="text-slate-600">
                What this channel means inside the simulator.
              </DialogDescription>
            </DialogHeader>
          ) : null}
          {selectedChannel ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                {selectedChannel.description}
              </div>
              <div className="text-xs text-slate-600">
                Tip: Select 2-4 channels total. This just sets the starting lanes for Q1 planning.
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </ImmersiveLayout>
  );
}

export default StrategyStep;

function ChannelIcon({ icon: Icon, selected }: { icon: LucideIcon; selected: boolean }) {
  return (
    <div className={cn("rounded-xl border p-2.5", selected ? "border-white/10 bg-white/10" : "border-slate-200 bg-slate-50")}>
      <Icon className="h-5 w-5" />
    </div>
  );
}
