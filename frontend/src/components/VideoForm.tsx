'use client';

import { useState, useEffect } from 'react';
import { VideoFormat, VideoType, GenerateRequest, Voice } from '@/types';
import { getVoices } from '@/lib/api';
import VoiceModal from './VoiceModal';

interface Props {
  onSubmit: (req: GenerateRequest) => void;
  isLoading: boolean;
}

const VIDEO_TYPES: { value: VideoType; label: string; icon: string }[] = [
  { value: 'documentary', label: 'Documentary', icon: '🎥' },
  { value: 'top10',       label: 'Top 10',       icon: '🏆' },
  { value: 'mystery',     label: 'Mystery',       icon: '🔍' },
  { value: 'news',        label: 'News',          icon: '📰' },
  { value: 'educational', label: 'Educational',   icon: '📚' },
];

const PROMPT_PLACEHOLDER = `Example:
Create a 10-minute investigative documentary about The Grand Ethiopian Renaissance Dam.

Historical Context:
- Colonial-era treaties gave Egypt control over Nile waters
- Ethiopia began construction in 2011, Africa's largest hydroelectric project

The Water Conflict:
- Egypt fears reduced water flow threatens 100 million citizens
- Sudan caught between flood control benefits and risks

Future Implications:
- Sets precedent for upstream nations controlling rivers
- Could trigger regional water wars or cooperation

Tone: Serious investigative journalism`;

const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel fallback

export default function VideoForm({ onSubmit, isLoading }: Props) {
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(10);
  const [format, setFormat] = useState<VideoFormat>('16:9');
  const [videoType, setVideoType] = useState<VideoType>('documentary');
  const [language, setLanguage] = useState('en');
  const [bgMusic, setBgMusic] = useState(true);
  const [captions, setCaptions] = useState(false);

  const [voices, setVoices] = useState<Voice[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [voiceId, setVoiceId] = useState(DEFAULT_VOICE_ID);
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  // Fetch voices once on mount
  useEffect(() => {
    setVoicesLoading(true);
    getVoices()
      .then(list => {
        setVoices(list);
        // Pick the default voice from loaded list
        const def = list.find(v => v.id === DEFAULT_VOICE_ID) ?? list[0] ?? null;
        if (def) { setSelectedVoice(def); setVoiceId(def.id); }
      })
      .catch(() => { /* fallback: keep empty, user can open modal */ })
      .finally(() => setVoicesLoading(false));
  }, []);

  const handleVoiceSelect = (voice: Voice) => {
    setSelectedVoice(voice);
    setVoiceId(voice.id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !prompt.trim()) return;
    onSubmit({
      title: title.trim(),
      prompt: prompt.trim(),
      voice_id: voiceId,
      target_duration: duration,
      video_format: format,
      video_type: videoType,
      language,
      add_background_music: bgMusic,
      add_captions: captions,
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="label">Video Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. The Grand Ethiopian Renaissance Dam"
            className="input"
            required
          />
        </div>

        {/* Prompt */}
        <div>
          <label className="label">
            Prompt{' '}
            <span className="text-[#484f58] font-normal">(VidRush format — talking points, tone, style)</span>
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={PROMPT_PLACEHOLDER}
            rows={12}
            className="input resize-none font-mono text-sm"
            required
          />
        </div>

        {/* Type + Format + Duration in a row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Video Type</label>
            <div className="grid grid-cols-1 gap-1.5">
              {VIDEO_TYPES.map((vt) => (
                <button
                  key={vt.value}
                  type="button"
                  onClick={() => setVideoType(vt.value)}
                  className={`text-left px-3 py-2 rounded-lg border text-sm transition-all flex items-center gap-2 ${
                    videoType === vt.value
                      ? 'border-brand bg-brand/10 text-brand-light'
                      : 'border-[#30363d] bg-[#161b22] hover:border-[#484f58] text-[#8b949e]'
                  }`}
                >
                  <span>{vt.icon}</span>
                  <span>{vt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {/* Duration */}
            <div>
              <label className="label">Duration: {duration} min</label>
              <input
                type="range"
                min={3}
                max={30}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full accent-brand"
              />
              <div className="flex justify-between text-xs text-[#484f58] mt-1">
                <span>3m</span><span>30m</span>
              </div>
            </div>

            {/* Format */}
            <div>
              <label className="label">Format</label>
              <div className="flex gap-2">
                {(['16:9', '9:16'] as VideoFormat[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormat(f)}
                    className={`flex-1 py-2 rounded-lg border text-sm transition-all ${
                      format === f
                        ? 'border-brand bg-brand/10 text-brand-light'
                        : 'border-[#30363d] bg-[#161b22] text-[#8b949e] hover:border-[#484f58]'
                    }`}
                  >
                    {f === '16:9' ? '📺 YouTube' : '📱 Shorts'}
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div>
              <label className="label">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="input"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="pt">Portuguese</option>
              </select>
            </div>

            {/* Options */}
            <div className="space-y-2">
              <label className="label">Options</label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-[#8b949e]">
                <input
                  type="checkbox"
                  checked={bgMusic}
                  onChange={(e) => setBgMusic(e.target.checked)}
                  className="accent-brand"
                />
                Background music
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-[#8b949e]">
                <input
                  type="checkbox"
                  checked={captions}
                  onChange={(e) => setCaptions(e.target.checked)}
                  className="accent-brand"
                />
                Captions (SRT)
              </label>
            </div>
          </div>
        </div>

        {/* Voice selector row */}
        <div>
          <label className="label">Voice</label>
          <button
            type="button"
            onClick={() => setShowVoiceModal(true)}
            className="w-full text-left px-4 py-3 rounded-lg border border-[#30363d] bg-[#0d1117] hover:border-[#484f58] transition-all flex items-center gap-3"
          >
            {voicesLoading ? (
              <span className="text-sm text-[#484f58]">Loading voices…</span>
            ) : selectedVoice ? (
              <>
                <span className="text-base flex-shrink-0">🎙️</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[#e6edf3] text-sm">{selectedVoice.name}</div>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {[selectedVoice.gender, selectedVoice.accent, selectedVoice.description, selectedVoice.use_case]
                      .filter(Boolean)
                      .map((t, i) => (
                        <span key={i} className="text-xs text-[#484f58]">{t}</span>
                      ))
                      .reduce((acc, el, i) => (
                        i === 0 ? [el] : [...acc, <span key={`dot-${i}`} className="text-xs text-[#30363d]">·</span>, el]
                      ), [] as React.ReactNode[])}
                  </div>
                </div>
                <span className="text-xs text-[#484f58] flex-shrink-0">Change →</span>
              </>
            ) : (
              <>
                <span className="text-base">🎙️</span>
                <span className="text-sm text-[#8b949e]">Select a voice</span>
                <span className="text-xs text-[#484f58] ml-auto">Browse →</span>
              </>
            )}
          </button>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || !title.trim() || !prompt.trim()}
          className="w-full py-3 px-6 rounded-xl font-semibold text-white transition-all
            bg-brand hover:bg-brand-dark disabled:opacity-40 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-[#0d1117]"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating…
            </span>
          ) : (
            '🚀 Generate Video'
          )}
        </button>
      </form>

      {/* Voice Modal */}
      {showVoiceModal && (
        <VoiceModal
          voices={voices}
          selectedId={voiceId}
          onSelect={handleVoiceSelect}
          onClose={() => setShowVoiceModal(false)}
          isLoading={voicesLoading}
        />
      )}
    </>
  );
}
