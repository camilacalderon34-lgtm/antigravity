'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Job, GenerateRequest } from '@/types';
import { generateVideo, getJob, getScript, editScript, regenerateVoice, approveScript, approveVoice } from '@/lib/api';
import VideoForm from '@/components/VideoForm';
import PipelineStatus from '@/components/PipelineStatus';
import ResultPanel from '@/components/ResultPanel';
import ScriptPanel from '@/components/ScriptPanel';
import VoiceoverPanel from '@/components/VoiceoverPanel';

interface ScriptData {
  text: string;
  total_word_count: number;
  scenes: number;
}

type ContentView = 'loading' | 'script' | 'voice' | 'result';

export default function Home() {
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Script & voice state
  const [scriptData, setScriptData] = useState<ScriptData | null>(null);
  const [scriptApproved, setScriptApproved] = useState(false);
  const [voiceApproved, setVoiceApproved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Determine what to show in content area
  const getContentView = (): ContentView => {
    if (!activeJob) return 'loading';
    if (activeJob.status === 'completed') return 'result';
    const step2Done = activeJob.steps.find(s => s.step === 2)?.status === 'completed';
    const step3Done = activeJob.steps.find(s => s.step === 3)?.status === 'completed';
    if (scriptApproved && step3Done) return 'voice';
    if (step2Done && scriptData) return 'script';
    return 'loading';
  };

  const contentView = activeJob ? getContentView() : 'loading';

  // Fetch script when step 2 completes
  const fetchScript = useCallback(async (jobId: string) => {
    const data = await getScript(jobId);
    if (data) setScriptData(data);
  }, []);

  // Poll active job
  useEffect(() => {
    if (!activeJob) return;
    if (activeJob.status === 'completed' || activeJob.status === 'failed') {
      if (pollRef.current) clearInterval(pollRef.current);
      setIsLoading(false);
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const updated = await getJob(activeJob.job_id);
        setActiveJob(updated);

        // Fetch script once step 2 completes
        const step2 = updated.steps.find(s => s.step === 2);
        if (step2?.status === 'completed' && !scriptData) {
          fetchScript(updated.job_id);
        }
        // Re-fetch script after edit (step 2 running again)
        if (step2?.status === 'running') {
          setScriptData(null);
          setScriptApproved(false);
          setVoiceApproved(false);
        }

        if (updated.status === 'completed' || updated.status === 'failed') {
          clearInterval(pollRef.current!);
          setIsLoading(false);
          // Fetch final script if available
          if (!scriptData) fetchScript(updated.job_id);
        }
      } catch {
        // ignore transient errors
      }
    }, 2500);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeJob?.job_id, activeJob?.status, scriptData, fetchScript]);

  const handleSubmit = async (req: GenerateRequest) => {
    setSubmitError(null);
    setIsLoading(true);
    setActiveJob(null);
    setScriptData(null);
    setScriptApproved(false);
    setVoiceApproved(false);
    try {
      const { job_id } = await generateVideo(req);
      const job = await getJob(job_id);
      setActiveJob(job);
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Unknown error');
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setActiveJob(null);
    setScriptData(null);
    setScriptApproved(false);
    setVoiceApproved(false);
    setIsLoading(false);
    setSubmitError(null);
    setIsEditing(false);
    setIsRegenerating(false);
    if (pollRef.current) clearInterval(pollRef.current);
  };

  const handleApproveScript = async () => {
    if (!activeJob) return;
    setScriptApproved(true);
    await approveScript(activeJob.job_id);
  };

  const handleApproveVoice = async () => {
    if (!activeJob) return;
    setVoiceApproved(true);
    await approveVoice(activeJob.job_id);
  };

  const handleEditScript = async (instruction: string) => {
    if (!activeJob) return;
    setIsEditing(true);
    try {
      await editScript(activeJob.job_id, instruction);
      setScriptData(null);
      setScriptApproved(false);
      setVoiceApproved(false);
    } finally {
      setIsEditing(false);
    }
  };

  const handleRegenerateVoice = async () => {
    if (!activeJob) return;
    setIsRegenerating(true);
    try {
      await regenerateVoice(activeJob.job_id);
      setVoiceApproved(false);
    } finally {
      setIsRegenerating(false);
    }
  };

  // ── No active job: show form ───────────────────────────────────────────────
  if (!activeJob) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full p-6 gap-6">
          {/* Form */}
          <div className="lg:w-[55%] rounded-xl border border-[#21262d] bg-[#161b22] p-6">
            <h2 className="font-semibold text-[#e6edf3] mb-6">New Video</h2>
            {submitError && (
              <div className="mb-4 px-4 py-3 rounded-lg border border-red-400/30 bg-red-400/5 text-sm text-red-300">
                {submitError}
              </div>
            )}
            <VideoForm onSubmit={handleSubmit} isLoading={isLoading} />
          </div>

          {/* How it works */}
          <div className="lg:w-[45%] space-y-6">
            <div className="rounded-xl border border-[#21262d] bg-[#161b22] p-6 flex flex-col items-center justify-center min-h-[300px] text-center">
              <span className="text-4xl mb-4">🎬</span>
              <p className="text-[#8b949e] text-sm">Your pipeline status will appear here</p>
              <p className="text-[#484f58] text-xs mt-2">Fill in the form and click Generate Video to start</p>
            </div>
            <div className="rounded-xl border border-[#21262d] bg-[#161b22] p-6">
              <h3 className="font-semibold text-[#e6edf3] mb-4 text-sm">How it works</h3>
              <ol className="space-y-3">
                {[
                  ['🧠', 'Prompt Analysis', 'Claude extracts your talking points, tone & visual cues'],
                  ['📝', 'Script Writing', 'Full narration script segmented by scenes'],
                  ['🎙️', 'Voice Generation', 'Qwen3-TTS (local AI) converts script to natural speech'],
                  ['🎥', 'Footage Sourcing', 'Pexels provides HD video clips per scene'],
                  ['🗓️', 'Edit Blueprint', 'Timeline & pacing planned automatically'],
                  ['✂️', 'Video Assembly', 'MoviePy syncs clips + voice into final video'],
                  ['📦', 'Export', 'Download video, script, audio & timeline'],
                ].map(([icon, title, desc], i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="text-base">{icon}</span>
                    <div>
                      <span className="font-medium text-[#e6edf3]">{title}</span>
                      <span className="text-[#484f58] ml-2">{desc}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Active job: pipeline sidebar + content area ────────────────────────────
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex max-w-7xl mx-auto w-full p-6 gap-6 min-h-0">

        {/* Pipeline Sidebar */}
        <div className="w-64 flex-shrink-0 flex flex-col gap-4">
          <div className="rounded-xl border border-[#21262d] bg-[#161b22] p-4 flex-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider">Pipeline</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                activeJob.status === 'completed' ? 'bg-green-400/10 text-green-300'
                : activeJob.status === 'failed'  ? 'bg-red-400/10 text-red-300'
                : 'bg-brand/10 text-brand-light'
              }`}>
                {activeJob.status}
              </span>
            </div>
            <PipelineStatus
              steps={activeJob.steps}
              jobStatus={activeJob.status}
              currentStep={activeJob.current_step}
              error={activeJob.error}
              sidebar
            />
          </div>
          <button
            onClick={handleReset}
            className="text-xs text-[#8b949e] hover:text-[#e6edf3] px-3 py-2 rounded-lg border border-[#30363d] hover:border-[#484f58] transition-all"
          >
            ← New Video
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {contentView === 'loading' && (
            <div className="h-full rounded-xl border border-[#21262d] bg-[#161b22] flex flex-col items-center justify-center gap-4 text-center p-8">
              <span className="inline-block w-10 h-10 border-3 border-brand border-t-transparent rounded-full animate-spin" />
              <div>
                <p className="text-[#e6edf3] font-medium">
                  {activeJob.status === 'failed' ? 'Pipeline failed' : 'Generating…'}
                </p>
                <p className="text-[#484f58] text-sm mt-1">
                  {activeJob.status === 'failed'
                    ? activeJob.error
                    : 'Script will appear here once ready'}
                </p>
              </div>
            </div>
          )}

          {contentView === 'script' && scriptData && (
            <div className="h-full rounded-xl border border-[#21262d] bg-[#161b22] p-6 flex flex-col">
              <ScriptPanel
                text={scriptData.text}
                wordCount={scriptData.total_word_count}
                approved={scriptApproved}
                onApprove={handleApproveScript}
                onEdit={handleEditScript}
                isEditing={isEditing}
              />
            </div>
          )}

          {contentView === 'voice' && (
            <div className="h-full rounded-xl border border-[#21262d] bg-[#161b22] p-6 flex flex-col">
              {/* Script approved badge */}
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-[#21262d] flex-shrink-0">
                <span className="text-green-400 text-sm">✓</span>
                <span className="text-xs text-green-300">Script approved</span>
              </div>
              <div className="flex-1 min-h-0">
                <VoiceoverPanel
                  jobId={activeJob.job_id}
                  approved={voiceApproved}
                  onApprove={handleApproveVoice}
                  onRegenerate={handleRegenerateVoice}
                  isRegenerating={isRegenerating}
                />
              </div>
            </div>
          )}

          {contentView === 'result' && activeJob.result && (
            <div className="h-full rounded-xl border border-[#21262d] bg-[#161b22] p-6 overflow-y-auto">
              <h2 className="font-semibold text-[#e6edf3] mb-4">Deliverables</h2>
              <ResultPanel result={activeJob.result} jobId={activeJob.job_id} />
            </div>
          )}

          {contentView === 'result' && !activeJob.result && (
            <div className="h-full rounded-xl border border-[#21262d] bg-[#161b22] flex items-center justify-center">
              <p className="text-[#484f58] text-sm">Loading results…</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-[#21262d] px-6 py-4 flex items-center gap-3 flex-shrink-0">
      <span className="text-2xl">🎬</span>
      <div>
        <h1 className="text-lg font-bold text-[#e6edf3]">AutoVideo</h1>
        <p className="text-xs text-[#484f58]">AI-powered end-to-end video generation</p>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs text-[#484f58]">Powered by</span>
        <span className="text-xs px-2 py-0.5 rounded bg-[#21262d] text-[#8b949e]">Claude</span>
        <span className="text-xs px-2 py-0.5 rounded bg-[#21262d] text-[#8b949e]">Qwen3-TTS</span>
        <span className="text-xs px-2 py-0.5 rounded bg-[#21262d] text-[#8b949e]">Pexels</span>
      </div>
    </header>
  );
}
