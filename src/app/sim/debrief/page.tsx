'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { pdf } from '@react-pdf/renderer';
import { logger } from '@/lib/logger';
import { ConfettiEffect } from '@/components/simulation/ConfettiEffect';
import { EnhancedDebrief } from '@/components/simulation/EnhancedDebrief';
import { ImmersiveLayout } from '@/components/simulation/ImmersiveLayout';
import { SimulationDebriefPdf } from '@/components/simulation/SimulationDebriefPdf';
import {
  MobileSheet,
  MobileSheetContent,
  MobileSheetDismissButton,
  MobileSheetHeader,
  MobileSheetTitle,
} from '@/components/ui/mobile-sheet';
import { useSimulation } from '@/hooks/useSimulation';
import { deriveSimulationRecommendations, buildSimulationScoreBreakdowns } from '@/lib/simulationIntelligence';
import { calculateGrade, calculateOverallScore } from '@/lib/simulationInsights';
import {
  formatAuthErrorMessage,
  getSimAuthSession,
  normalizePersonName,
  signInSimAuth,
  signUpSimAuth,
  type SimAuthSession,
} from '@/lib/simAuth';
import { buildDebriefProfileHint } from '@/lib/debriefPersonalization';
import { exportSimulationScorecardImage } from '@/lib/scorecardImage';
import { saveSimulationSnapshot } from '@/lib/saveSimulationSnapshot';
import { buildSimulationDebriefReport } from '@/lib/simulationReport';
import { recordSimulationEvent } from '@/lib/simulationTelemetry';

/**
 * Debrief runs in guest-first mode; account actions are unlocked only when needed.
 * Authoritative save identity flows through `getSimAuthSession()` inside
 * `saveSimulationSnapshot` and still matches POST `/api/simulations/save` checks.
 */
export default function DebriefPage() {
  const router = useRouter();
  const { context, completeDebrief, restartSimulation } = useSimulation();
  const [showConfetti, setShowConfetti] = useState(false);
  const [authSession, setAuthSession] = useState<SimAuthSession | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [firstNameInput, setFirstNameInput] = useState('');
  const [lastNameInput, setLastNameInput] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [profileRow, setProfileRow] = useState<Record<string, unknown> | null>(null);
  const [showFullDebrief, setShowFullDebrief] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [shareAlias, setShareAlias] = useState('');
  const [leaderboardOptIn, setLeaderboardOptIn] = useState(true);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isPublishingShare, setIsPublishingShare] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const scoreBreakdowns = buildSimulationScoreBreakdowns(context);
  const recommendations = deriveSimulationRecommendations(context, scoreBreakdowns);
  const overallScore = calculateOverallScore(context);
  const finalGrade = calculateGrade(overallScore);

  useEffect(() => {
    setShowConfetti(true);
    completeDebrief();
    void (async () => {
      const session = await getSimAuthSession();
      setAuthSession(session);
      if (session?.email) {
        setShareAlias(session.email.split('@')[0] || '');
      }
    })();
  }, [completeDebrief]);

  useEffect(() => {
    if (!authSession) {
      setProfileRow(null);
      return;
    }
    const ac = new AbortController();
    void (async () => {
      try {
        const response = await fetch('/api/profile', { signal: ac.signal });
        if (!response.ok) return;
        const data = await response.json();
        if (!ac.signal.aborted) {
          setProfileRow(data?.profile && typeof data.profile === 'object' ? data.profile : null);
        }
      } catch {
        if (!ac.signal.aborted) setProfileRow(null);
      }
    })();
    return () => ac.abort();
  }, [authSession]);

  useEffect(() => {
    if (!authSession || !context.simulationId) {
      setShareUrl(null);
      return;
    }

    const ac = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`/api/simulations/share?runId=${encodeURIComponent(context.simulationId ?? '')}`, {
          signal: ac.signal,
        });
        if (!response.ok) return;
        const data = await response.json();
        if (ac.signal.aborted) return;
        const share = data?.share;
        if (!share || share.is_public !== true || typeof share.share_slug !== 'string') {
          setShareUrl(null);
          return;
        }
        if (typeof share.alias === 'string' && share.alias.trim().length > 0) {
          setShareAlias(share.alias);
        }
        if (typeof share.leaderboard_opt_in === 'boolean') {
          setLeaderboardOptIn(share.leaderboard_opt_in);
        }
        setShareUrl(`${window.location.origin}/scorecard/${share.share_slug}`);
      } catch {
        if (!ac.signal.aborted) setShareUrl(null);
      }
    })();

    return () => ac.abort();
  }, [authSession, context.simulationId]);

  const requireAuth = async (): Promise<SimAuthSession | null> => {
    const session = await getSimAuthSession();
    if (!session) {
      setStatusMessage('Sign in with your email to save this run, export the PDF briefing, or compare against saved runs.');
      return null;
    }
    return session;
  };

  const handleSignIn = async () => {
    const email = emailInput.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setStatusMessage('Enter a valid email to continue.');
      return;
    }
    if (passwordInput.trim().length < 8) {
      setStatusMessage('Enter a password with at least 8 characters.');
      return;
    }

    setIsSigningIn(true);
    setStatusMessage(null);
    try {
      const session = await signInSimAuth(email, passwordInput);
      setAuthSession(session);
      setStatusMessage('Signed in. Save run and export briefing are enabled for this account.');
    } catch {
      const given = normalizePersonName(firstNameInput);
      const family = normalizePersonName(lastNameInput);
      if (!given.length || !family.length) {
        setStatusMessage('Enter your first and last name to create a new account.');
        return;
      }
      try {
        await signUpSimAuth(email, passwordInput, given, family);
        setStatusMessage('Account created. Check your inbox to confirm, then sign in.');
      } catch (signUpErr) {
        setStatusMessage(formatAuthErrorMessage(signUpErr));
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSaveRun = async () => {
    const session = await requireAuth();
    if (!session) return;

    setIsSaving(true);
    setStatusMessage(null);
    try {
      const result = await saveSimulationSnapshot(context, 'debrief', 'completed');

      if (!result.ok || !result.persisted) {
        setStatusMessage(
          !result.persisted
            ? 'Session not ready to save yet — refresh or retry save from the header.'
            : 'Could not save this run. Check the save status in the header and try Retry.',
        );
        return;
      }

      setStatusMessage('Run saved to your account. Pick it up anytime from Setup → Resume latest saved run.');
      void recordSimulationEvent({
        runId: context.simulationId ?? '',
        eventType: 'debrief_saved',
        phase: 'debrief',
        payload: {
          overallScore: calculateOverallScore(context),
          grade: calculateGrade(calculateOverallScore(context)),
        },
      });
    } catch (error) {
      logger.error('Error saving simulation run', error);
      setStatusMessage('Could not save this run. Try again in a moment.');
    } finally {
      setIsSaving(false);
    }
  };

  const ensureCompletedRunSaved = async (): Promise<boolean> => {
    const result = await saveSimulationSnapshot(context, 'debrief', 'completed');
    if (!result.ok || !result.persisted) {
      setStatusMessage(
        !result.persisted
          ? 'Session not ready to save yet — refresh or retry save from the header.'
          : 'Could not save this run. Check the save status in the header and try Retry.',
      );
      return false;
    }
    return true;
  };

  const handleExportPDF = async () => {
    try {
      const session = await requireAuth();
      if (!session) return;

      const report = buildSimulationDebriefReport(context, {
        email: session.email,
      });
      const blob = await pdf(<SimulationDebriefPdf report={report} />).toBlob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `cmo-simulation-report-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setStatusMessage('PDF briefing downloaded. Keep it alongside any saved run in your account.');
    } catch (error) {
      logger.error('Error exporting PDF', error);
      setStatusMessage('Failed to export report.');
    }
  };

  const handleExportScorecardImage = async () => {
    setIsExportingImage(true);
    try {
      await exportSimulationScorecardImage(context);
      setStatusMessage('Scorecard image downloaded. Post it with your share URL for replay invites.');
    } catch (error) {
      logger.error('Error exporting scorecard image', error);
      setStatusMessage('Failed to export scorecard image.');
    } finally {
      setIsExportingImage(false);
    }
  };

  const handlePublishScorecard = async () => {
    const session = await requireAuth();
    if (!session) return;
    if (!context.simulationId) {
      setStatusMessage('Run ID missing. Restart this run and save once before publishing.');
      return;
    }
    const alias = shareAlias.trim();
    if (alias.length < 3 || alias.length > 32) {
      setStatusMessage('Alias must be 3-32 characters.');
      return;
    }

    setIsPublishingShare(true);
    setStatusMessage(null);
    try {
      const saved = await ensureCompletedRunSaved();
      if (!saved) return;

      const response = await fetch('/api/simulations/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId: context.simulationId,
          alias,
          leaderboardOptIn,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatusMessage(typeof data?.error === 'string' ? data.error : 'Failed to publish scorecard.');
        return;
      }

      const slug = typeof data?.share?.share_slug === 'string' ? data.share.share_slug : null;
      const relativeUrl =
        typeof data?.share?.share_url === 'string' && data.share.share_url.length > 0
          ? data.share.share_url
          : slug
            ? `/scorecard/${slug}`
            : null;

      if (!relativeUrl) {
        setStatusMessage('Scorecard published, but share link was unavailable. Retry once.');
        return;
      }

      const absoluteUrl = `${window.location.origin}${relativeUrl}`;
      setShareUrl(absoluteUrl);
      setStatusMessage(
        leaderboardOptIn
          ? 'Public scorecard is live and added to the leaderboard.'
          : 'Public scorecard is live. Leaderboard opt-in is off for this run.',
      );
    } catch (error) {
      logger.error('Error publishing scorecard', error);
      setStatusMessage('Failed to publish scorecard.');
    } finally {
      setIsPublishingShare(false);
    }
  };

  const handleDisablePublicShare = async () => {
    const session = await requireAuth();
    if (!session) return;
    if (!context.simulationId) {
      setStatusMessage('Run ID missing. Nothing to disable.');
      return;
    }

    setIsPublishingShare(true);
    setStatusMessage(null);
    try {
      const response = await fetch('/api/simulations/share', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId: context.simulationId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatusMessage(typeof data?.error === 'string' ? data.error : 'Failed to disable public scorecard.');
        return;
      }
      setShareUrl(null);
      setLeaderboardOptIn(false);
      setStatusMessage('Public scorecard disabled. Leaderboard entry removed.');
    } catch (error) {
      logger.error('Error disabling public scorecard', error);
      setStatusMessage('Failed to disable public scorecard.');
    } finally {
      setIsPublishingShare(false);
    }
  };

  const handleCopyShareLink = async () => {
    if (!shareUrl) {
      setStatusMessage('Publish your scorecard first to generate a share link.');
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setStatusMessage('Share URL copied to clipboard.');
    } catch (error) {
      logger.error('Failed to copy share URL', error);
      setStatusMessage('Could not copy link. Copy it manually from the field.');
    }
  };

  const handleCompareRuns = async () => {
    const session = await requireAuth();
    if (!session) return;
    router.push('/sim/simulations');
  };

  const handleRestart = () => {
    restartSimulation();
    router.push('/sim/strategy');
  };

  const handleShare = () => {
    if (navigator.share) {
      void navigator.share({
        title: 'CMO Simulation Results',
        text: 'Check out my marketing simulation results!',
        url: shareUrl ?? window.location.href,
      });
    }
  };

  const profileHint = buildDebriefProfileHint(profileRow);
  const debriefSubtitle = [
    'Executive decision lab: rubric, benchmarks vs a synthetic cohort, and replay experiments. Save/export stay optional until you sign in.',
    profileHint,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <ImmersiveLayout
      title="Debrief"
      quarter="CRM View"
      subtitle={debriefSubtitle}
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <ConfettiEffect trigger={showConfetti} />
        {!authSession && (
          <div className="mx-auto max-w-5xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Save / export stays optional</h2>
            <p className="mt-2 text-sm text-slate-600">
              The result screen and full debrief work locally right away. Open account actions only when you want a durable cloud save or PDF export.
            </p>
          </div>
        )}
        {statusMessage && (
          <div className="mx-auto max-w-5xl rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800" role="status">
            {statusMessage}
          </div>
        )}
        <section className="mx-auto max-w-5xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-6 py-6 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Annual result</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Your board-facing result is ready</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              See the score first, then open the full annual debrief when you want the detailed report and replay guidance.
            </p>
          </div>
          <div className="grid gap-4 px-6 py-6 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-center">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Composite score</div>
              <div className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">{overallScore}</div>
              <div className="text-sm text-slate-600">Out of 100</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-center">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Grade</div>
              <div className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">{finalGrade}</div>
              <div className="text-sm text-slate-600">Teaching grade</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-center">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Next move</div>
              <div className="mt-2 text-base font-semibold text-slate-950">Open the annual debrief</div>
              <div className="mt-1 text-sm text-slate-600">Then save, export, or replay from the account actions surface.</div>
            </div>
          </div>
          <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-5 sm:flex-row sm:justify-center">
            <button
              type="button"
              className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800"
              onClick={() => setShowFullDebrief(true)}
            >
              View annual debrief
            </button>
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => setActionsOpen(true)}
            >
              Save / share / account
            </button>
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              onClick={handleRestart}
            >
              Replay from strategy
            </button>
          </div>
        </section>
        {showFullDebrief ? (
          <EnhancedDebrief
            context={context}
            scoreBreakdowns={scoreBreakdowns}
            recommendations={recommendations}
            onExportPDF={handleExportPDF}
            onSaveRun={handleSaveRun}
            saveDisabled={!authSession || isSaving}
            onRestart={handleRestart}
            onShare={handleShare}
            showUtilityActions={false}
          />
        ) : null}
      </div>
      <MobileSheet open={actionsOpen} onOpenChange={setActionsOpen}>
        <MobileSheetContent className="max-h-[88vh]">
          <MobileSheetHeader>
            <div>
              <MobileSheetTitle>Account actions</MobileSheetTitle>
            </div>
            <MobileSheetDismissButton />
          </MobileSheetHeader>
          <div className="space-y-4 overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+18px)]">
            {!authSession ? (
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-600">
                  Sign in only when you want to save this run or export the PDF briefing.
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    spellCheck={false}
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400"
                    placeholder="Work email"
                    value={emailInput}
                    onChange={(event) => setEmailInput(event.target.value)}
                  />
                  <input
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400"
                    placeholder="Password (min 8 chars)"
                    value={passwordInput}
                    onChange={(event) => setPasswordInput(event.target.value)}
                  />
                  <input
                    name="given-name"
                    type="text"
                    autoComplete="given-name"
                    spellCheck={false}
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400"
                    placeholder="First name (for new accounts)"
                    value={firstNameInput}
                    onChange={(event) => setFirstNameInput(event.target.value)}
                  />
                  <input
                    name="family-name"
                    type="text"
                    autoComplete="family-name"
                    spellCheck={false}
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400"
                    placeholder="Last name (for new accounts)"
                    value={lastNameInput}
                    onChange={(event) => setLastNameInput(event.target.value)}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  New accounts require first and last name. Existing users can leave those blank when signing in.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      setActionsOpen(false);
                      setStatusMessage(
                        'Continuing in-session. Sign in anytime from this page to save or export — resume later via Setup → Resume latest saved run.',
                      );
                    }}
                  >
                    Continue as guest
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-slate-900 px-3 py-2 font-semibold text-white hover:bg-slate-800"
                    onClick={() => void handleSignIn()}
                    disabled={isSigningIn}
                  >
                    {isSigningIn ? 'Working...' : 'Unlock Save/Share'}
                  </button>
                </div>
              </div>
            ) : null}
            <div className="grid gap-2">
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                onClick={() => void handleSaveRun()}
                disabled={isSaving}
              >
                {isSaving ? 'Saving run…' : 'Save run to account'}
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => void handleExportPDF()}
              >
                Export PDF briefing
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => void handleCompareRuns()}
              >
                Compare against saved runs
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                onClick={() => void handleExportScorecardImage()}
                disabled={isExportingImage}
              >
                {isExportingImage ? 'Exporting image…' : 'Export scorecard image (PNG)'}
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => router.push('/sim/leaderboard')}
              >
                Open public leaderboard
              </button>
            </div>
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Public scorecard share</h3>
                <p className="mt-1 text-xs text-slate-600">
                  Publish an alias-only scorecard URL. Opt in to include this run on the scenario/difficulty leaderboard.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  name="share-alias"
                  type="text"
                  spellCheck={false}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400"
                  placeholder="Alias (3-32 chars)"
                  value={shareAlias}
                  onChange={(event) => setShareAlias(event.target.value)}
                />
                <label className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={leaderboardOptIn}
                    onChange={(event) => setLeaderboardOptIn(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Include this run on leaderboard
                </label>
              </div>
              {shareUrl ? (
                <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                  {shareUrl}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-md bg-slate-900 px-3 py-2 font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  onClick={() => void handlePublishScorecard()}
                  disabled={isPublishingShare}
                >
                  {isPublishingShare ? 'Publishing…' : 'Publish scorecard URL'}
                </button>
                <button
                  type="button"
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => void handleCopyShareLink()}
                >
                  Copy share link
                </button>
                <button
                  type="button"
                  className="rounded-md border border-rose-200 bg-white px-3 py-2 font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                  onClick={() => void handleDisablePublicShare()}
                  disabled={isPublishingShare}
                >
                  Disable public share
                </button>
              </div>
            </div>
          </div>
        </MobileSheetContent>
      </MobileSheet>
    </ImmersiveLayout>
  );
}
