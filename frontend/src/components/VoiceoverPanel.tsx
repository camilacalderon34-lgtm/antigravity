'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import SlideToApprove from './SlideToApprove';

interface Props {
  jobId: string;
  approved: boolean;
  onApprove: () => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

const BARS = 64;

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function VoiceoverPanel({ jobId, approved, onApprove, onRegenerate, isRegenerating }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioUrl = `/api/jobs/${jobId}/voice`;

  // Pseudo-random waveform seeded by bar index
  const waveform = useMemo(() =>
    Array.from({ length: BARS }, (_, i) => {
      const v = Math.abs(Math.sin(i * 2.3) * 0.4 + Math.sin(i * 0.9) * 0.35 + Math.cos(i * 1.5) * 0.25);
      return Math.max(0.12, Math.min(1, v));
    }),
  []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onLoaded = () => setDuration(audio.duration || 0);
    const onEnd = () => setPlaying(false);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('ended', onEnd);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  };

  const handleRegenerate = () => {
    const audio = audioRef.current;
    if (audio) { audio.pause(); setPlaying(false); }
    onRegenerate();
  };

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h3 className="font-semibold text-[#e6edf3] text-sm uppercase tracking-wider">Voiceover</h3>
        <button
          onClick={handleRegenerate}
          disabled={approved || isRegenerating}
          title="Regenerate voiceover"
          className="text-[#8b949e] hover:text-[#e6edf3] transition-colors disabled:opacity-40 disabled:cursor-not-allowed p-1"
        >
          {isRegenerating ? (
            <span className="inline-block w-4 h-4 border-2 border-[#8b949e] border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path fillRule="evenodd" d="M1.705 8.005a.75.75 0 0 1 .834.656 5.5 5.5 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.002 7.002 0 0 1 1.05 8.84a.75.75 0 0 1 .656-.834ZM8 2.5a5.487 5.487 0 0 0-4.131 1.869l1.204 1.204A.25.25 0 0 1 4.896 6H1.25A.25.25 0 0 1 1 5.75V2.104a.25.25 0 0 1 .427-.177l1.38 1.38A7.002 7.002 0 0 1 14.95 7.16a.75.75 0 0 1-1.49.178A5.5 5.5 0 0 0 8 2.5Z"/>
            </svg>
          )}
        </button>
      </div>

      <div className="flex-1 min-h-0 rounded-xl border border-[#21262d] bg-[#0d1117] p-5 flex flex-col gap-5">
        {/* Waveform */}
        <div className="flex items-center gap-0.5 h-24 flex-shrink-0">
          {waveform.map((h, i) => {
            const barProgress = i / BARS;
            const isPlayed = barProgress <= progress;
            return (
              <div
                key={i}
                className="flex-1 rounded-sm transition-colors"
                style={{
                  height: `${h * 100}%`,
                  backgroundColor: isPlayed ? 'rgb(139 92 246)' : '#21262d',
                }}
              />
            );
          })}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <button
            onClick={togglePlay}
            className="w-12 h-12 rounded-full bg-brand hover:bg-brand-dark flex items-center justify-center text-white transition-colors flex-shrink-0 shadow-lg"
          >
            {playing ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M6 3.5a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5zm4 0a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5z"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M11.596 8.697l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
              </svg>
            )}
          </button>
          <div className="text-xs text-[#484f58] tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        <audio ref={audioRef} src={audioUrl} preload="metadata" />
      </div>

      {/* Approve slider */}
      <div className="mt-4 flex-shrink-0">
        <SlideToApprove
          label="Slide to approve voiceover"
          onApprove={onApprove}
          approved={approved}
        />
      </div>
    </div>
  );
}
