'use client';

import { useState, useEffect, useRef } from 'react';
import { Voice } from '@/types';

interface Props {
  voices: Voice[];
  selectedId: string;
  onSelect: (voice: Voice) => void;
  onClose: () => void;
  isLoading: boolean;
}

export default function VoiceModal({ voices, selectedId, onSelect, onClose, isLoading }: Props) {
  const [search, setSearch] = useState('');
  const [filterGender, setFilterGender] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterAccent, setFilterAccent] = useState('all');
  const [showFavs, setShowFavs] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load favorites from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('voice_favorites');
    if (stored) {
      try { setFavorites(new Set(JSON.parse(stored))); } catch { /* ignore */ }
    }
  }, []);

  // Cleanup audio on unmount
  useEffect(() => () => { audioRef.current?.pause(); }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const toggleFav = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem('voice_favorites', JSON.stringify([...next]));
      return next;
    });
  };

  const togglePlay = (e: React.MouseEvent, voice: Voice) => {
    e.stopPropagation();
    if (!voice.preview_url) return;
    if (playing === voice.id) {
      audioRef.current?.pause();
      setPlaying(null);
    } else {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.onended = null; }
      audioRef.current = new Audio(voice.preview_url);
      audioRef.current.play().catch(() => { /* ignore autoplay block */ });
      audioRef.current.onended = () => setPlaying(null);
      setPlaying(voice.id);
    }
  };

  // Derived filter options
  const accents = [...new Set(voices.map(v => v.accent).filter(Boolean))].sort();

  // Filtered list
  const filtered = voices.filter(v => {
    if (showFavs && !favorites.has(v.id)) return false;
    if (filterGender !== 'all' && v.gender !== filterGender) return false;
    if (filterCategory !== 'all' && v.category !== filterCategory) return false;
    if (filterAccent !== 'all' && v.accent !== filterAccent) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        v.name.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q) ||
        v.accent.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[80vh] bg-[#161b22] border border-[#30363d] rounded-xl flex flex-col mx-4 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#21262d] flex-shrink-0">
          <h3 className="font-semibold text-[#e6edf3]">Voice Library</h3>
          <button
            onClick={onClose}
            className="text-[#8b949e] hover:text-[#e6edf3] transition-colors w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#21262d]"
          >
            ✕
          </button>
        </div>

        {/* Search + Filters */}
        <div className="px-5 py-3 border-b border-[#21262d] flex-shrink-0 space-y-3">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, description, accent…"
            className="w-full px-3 py-2 rounded-lg border border-[#30363d] bg-[#0d1117] text-[#e6edf3] text-sm placeholder-[#484f58] focus:outline-none focus:border-brand"
            autoFocus
          />
          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={filterGender}
              onChange={e => setFilterGender(e.target.value)}
              className="text-xs px-2 py-1.5 rounded-lg border border-[#30363d] bg-[#0d1117] text-[#8b949e] focus:outline-none focus:border-[#484f58]"
            >
              <option value="all">All genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="neutral">Neutral</option>
            </select>

            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="text-xs px-2 py-1.5 rounded-lg border border-[#30363d] bg-[#0d1117] text-[#8b949e] focus:outline-none focus:border-[#484f58]"
            >
              <option value="all">All categories</option>
              <option value="premade">Premade</option>
              <option value="cloned">Cloned</option>
              <option value="generated">Generated</option>
              <option value="professional">Professional</option>
            </select>

            {accents.length > 0 && (
              <select
                value={filterAccent}
                onChange={e => setFilterAccent(e.target.value)}
                className="text-xs px-2 py-1.5 rounded-lg border border-[#30363d] bg-[#0d1117] text-[#8b949e] focus:outline-none focus:border-[#484f58]"
              >
                <option value="all">All accents</option>
                {accents.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            )}

            <button
              onClick={() => setShowFavs(!showFavs)}
              className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                showFavs
                  ? 'border-red-500/50 bg-red-500/10 text-red-400'
                  : 'border-[#30363d] text-[#8b949e] hover:border-[#484f58]'
              }`}
            >
              ♥ Favorites
            </button>
          </div>
        </div>

        {/* Voice List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-0">
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <span className="inline-block w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <p className="text-center text-[#484f58] text-sm py-16">No voices match your filters</p>
          )}

          {!isLoading && filtered.map(v => (
            <button
              key={v.id}
              onClick={() => { onSelect(v); onClose(); }}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-all flex items-center gap-3 ${
                v.id === selectedId
                  ? 'border-brand bg-brand/10'
                  : 'border-[#21262d] hover:border-[#30363d] bg-[#0d1117] hover:bg-[#161b22]'
              }`}
            >
              {/* Favorite button */}
              <span
                onClick={(e) => toggleFav(e, v.id)}
                role="button"
                className={`text-sm flex-shrink-0 transition-colors cursor-pointer ${
                  favorites.has(v.id) ? 'text-red-400' : 'text-[#30363d] hover:text-red-400'
                }`}
              >
                ♥
              </span>

              {/* Voice info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-[#e6edf3] text-sm">{v.name}</span>
                  {v.id === selectedId && (
                    <span className="text-xs text-brand-light bg-brand/20 px-1.5 py-0.5 rounded">selected</span>
                  )}
                  {favorites.has(v.id) && (
                    <span className="text-xs text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">fav</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {[v.gender, v.accent, v.age, v.description, v.use_case]
                    .filter(Boolean)
                    .map((label, i) => (
                      <span key={i} className="text-xs text-[#484f58] bg-[#21262d] px-1.5 py-0.5 rounded">
                        {label}
                      </span>
                    ))}
                  {v.category && v.category !== 'premade' && (
                    <span className="text-xs text-brand-light/60 bg-brand/5 px-1.5 py-0.5 rounded border border-brand/20">
                      {v.category}
                    </span>
                  )}
                </div>
              </div>

              {/* Preview button */}
              {v.preview_url && (
                <button
                  onClick={(e) => togglePlay(e, v)}
                  className={`flex-shrink-0 w-7 h-7 rounded-full border flex items-center justify-center text-xs transition-all ${
                    playing === v.id
                      ? 'border-brand text-brand-light bg-brand/20 animate-pulse'
                      : 'border-[#30363d] text-[#8b949e] hover:border-brand hover:text-brand-light'
                  }`}
                  title="Preview voice"
                >
                  {playing === v.id ? '■' : '▶'}
                </button>
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#21262d] flex-shrink-0 flex items-center justify-between">
          <span className="text-xs text-[#484f58]">
            {filtered.length} of {voices.length} voices
          </span>
          <span className="text-xs text-[#484f58]">
            Click a voice to select · ▶ to preview
          </span>
        </div>
      </div>
    </div>
  );
}
