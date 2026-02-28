'use client';

import { PipelineStep, JobStatus } from '@/types';

interface Props {
  steps: PipelineStep[];
  jobStatus: JobStatus;
  currentStep: number;
  error: string | null;
  sidebar?: boolean;
}

const statusIcon = (s: PipelineStep['status']) => {
  if (s === 'completed') return <span className="text-green-400 text-sm">✓</span>;
  if (s === 'failed')    return <span className="text-red-400 text-sm">✗</span>;
  if (s === 'running')
    return <span className="inline-block w-3 h-3 border-2 border-brand border-t-transparent rounded-full animate-spin" />;
  return <span className="w-3 h-3 rounded-full border border-[#484f58] inline-block" />;
};

const stepColor = (s: PipelineStep['status']) => {
  if (s === 'completed') return 'text-green-300';
  if (s === 'failed')    return 'text-red-300';
  if (s === 'running')   return 'text-brand-light';
  return 'text-[#484f58]';
};

export default function PipelineStatus({ steps, jobStatus, currentStep, error, sidebar }: Props) {
  const completed = steps.filter((s) => s.status === 'completed').length;
  const progress = (completed / Math.max(steps.length, 1)) * 100;

  if (sidebar) {
    return (
      <div className="flex flex-col gap-1">
        <div className="h-0.5 bg-[#21262d] rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-gradient-to-r from-brand to-brand-light transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        {steps.map((step) => (
          <div
            key={step.step}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all ${
              step.status === 'running'
                ? 'bg-brand/5 border border-brand/20'
                : step.status === 'completed'
                ? 'bg-green-400/5 border border-green-400/10'
                : step.status === 'failed'
                ? 'bg-red-400/5 border border-red-400/10'
                : 'border border-transparent'
            }`}
          >
            <div className="flex-shrink-0 w-4 flex items-center justify-center">
              {statusIcon(step.status)}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium truncate ${stepColor(step.status)}`}>
                <span className="text-[#484f58] mr-1">{String(step.step).padStart(2, '0')}</span>
                {step.name}
              </p>
              {(step.status === 'running' || step.status === 'completed') && step.message && (
                <p className="text-xs text-[#484f58] truncate mt-0.5">{step.message}</p>
              )}
            </div>
          </div>
        ))}
        {error && (
          <div className="mt-2 rounded-lg border border-red-400/30 bg-red-400/5 p-2">
            <p className="text-xs text-red-400 break-all">{error}</p>
          </div>
        )}
        {jobStatus === 'completed' && (
          <div className="mt-2 rounded-lg border border-green-400/30 bg-green-400/5 p-2 text-center">
            <p className="text-xs text-green-300 font-medium">Complete!</p>
          </div>
        )}
      </div>
    );
  }

  // Default layout
  return (
    <div className="space-y-4">
      <div className="h-1.5 bg-[#21262d] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-brand to-brand-light transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="space-y-2">
        {steps.map((step) => (
          <div
            key={step.step}
            className={`rounded-lg border px-4 py-3 transition-all ${
              step.status === 'completed' ? 'border-green-400/30 bg-green-400/5'
              : step.status === 'failed'    ? 'border-red-400/30 bg-red-400/5'
              : step.status === 'running'   ? 'border-brand/40 bg-brand/5'
              : 'border-[#30363d] bg-[#161b22]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-5 flex items-center justify-center">
                {statusIcon(step.status)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#484f58] font-mono">{String(step.step).padStart(2, '0')}</span>
                  <span className={`text-sm font-medium ${stepColor(step.status)}`}>{step.name}</span>
                </div>
                {step.message && (
                  <p className="text-xs text-[#6e7681] mt-0.5 truncate">{step.message}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {error && (
        <div className="rounded-lg border border-red-400/30 bg-red-400/5 p-3">
          <p className="text-sm text-red-300 font-medium">Pipeline failed</p>
          <p className="text-xs text-red-400 mt-1 font-mono break-all">{error}</p>
        </div>
      )}
      {jobStatus === 'completed' && (
        <div className="rounded-lg border border-green-400/30 bg-green-400/5 p-3 text-center">
          <p className="text-green-300 font-medium">Video generation complete!</p>
        </div>
      )}
    </div>
  );
}
