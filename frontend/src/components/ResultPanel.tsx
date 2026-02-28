'use client';

import { JobResult } from '@/types';

interface Props {
  result: JobResult;
  jobId: string;
}

function DownloadRow({ label, url, ext }: { label: string; url: string | null; ext: string }) {
  if (!url) return null;
  return (
    <a
      href={url}
      download
      className="flex items-center justify-between px-4 py-3 rounded-lg border border-[#30363d] bg-[#161b22] hover:border-brand/50 hover:bg-brand/5 transition-all group"
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{extIcon(ext)}</span>
        <div>
          <p className="text-sm font-medium text-[#e6edf3] group-hover:text-brand-light transition-colors">
            {label}
          </p>
          <p className="text-xs text-[#484f58]">.{ext}</p>
        </div>
      </div>
      <span className="text-[#484f58] group-hover:text-brand-light transition-colors text-sm">
        ↓ Download
      </span>
    </a>
  );
}

function extIcon(ext: string) {
  const icons: Record<string, string> = {
    mp4: '🎬',
    mp3: '🎙️',
    txt: '📝',
    json: '📋',
    srt: '💬',
  };
  return icons[ext] ?? '📄';
}

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

export default function ResultPanel({ result, jobId }: Props) {
  return (
    <div className="space-y-4">
      {/* Duration badge */}
      {result.duration_seconds && (
        <div className="flex items-center gap-2 text-sm text-[#8b949e]">
          <span>⏱</span>
          <span>Total duration: {formatDuration(result.duration_seconds)}</span>
        </div>
      )}

      {/* Main video */}
      {result.final_video && (
        <div className="rounded-xl border border-brand/40 bg-brand/5 p-4">
          <p className="text-brand-light font-semibold text-sm mb-3">Final Video</p>
          <DownloadRow label="final_video" url={result.final_video} ext="mp4" />
        </div>
      )}

      {/* Other deliverables */}
      <div className="space-y-2">
        <p className="text-xs text-[#484f58] uppercase tracking-wider">All Deliverables</p>
        <DownloadRow label="Narration Script" url={result.script_file} ext="txt" />
        <DownloadRow label="Voiceover Audio" url={result.voiceover_file} ext="mp3" />
        <DownloadRow label="Asset List" url={result.asset_list_file} ext="json" />
        <DownloadRow label="Edit Timeline" url={result.timeline_file} ext="json" />
        {result.subtitles_file && (
          <DownloadRow label="Subtitles" url={result.subtitles_file} ext="srt" />
        )}
      </div>
    </div>
  );
}
