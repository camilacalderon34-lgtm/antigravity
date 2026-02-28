# 🎬 AutoVideo — AI-Powered Video Generation

> Turn a text prompt into a fully produced video in minutes. No editing skills needed.

AutoVideo is an end-to-end automated video production pipeline powered by **Claude AI**, **ElevenLabs**, and **Pexels**. You write the idea — it writes the script, records the voiceover, sources the footage, and assembles the final video.

---

## ✨ What it does

1. 🧠 **Analyzes your prompt** — Claude extracts talking points, tone, pacing, and visual cues
2. 📝 **Writes a full script** — structured by scenes, ready for narration
3. ✏️ **You review & approve** — edit the script with AI assistance, or approve as-is
4. 🎙️ **Generates voiceover** — ElevenLabs converts the script to natural-sounding speech (choose from 1000+ voices)
5. 🔊 **You review the audio** — listen, regenerate, or approve
6. 🎥 **Sources HD footage** — Pexels provides relevant video clips per scene
7. 🗓️ **Plans the timeline** — automatic pacing and clip timing
8. ✂️ **Assembles the video** — MoviePy syncs footage + voiceover into the final MP4
9. 📦 **Exports everything** — video, script, audio, timeline, subtitles

---

## 🖥️ Interface

| Panel | Description |
|-------|-------------|
| 📋 **Pipeline Sidebar** | Real-time step status — see exactly what's running |
| 📝 **Script Panel** | Read, copy, or AI-edit the generated script |
| 🎙️ **Voiceover Panel** | Play the audio, regenerate, or approve |
| 🎤 **Voice Library** | 1000+ ElevenLabs voices with search, filters & preview |
| 📦 **Results Panel** | Download video, audio, script, timeline |

### Approval Gates
The pipeline **pauses** and waits for your approval at two key moments:
- After the script is generated → review before voice is recorded
- After the voiceover is ready → listen before the video is assembled

No more wasted API calls on footage you don't need.

---

## 🛠️ Tech Stack

### Backend
- **[FastAPI](https://fastapi.tiangolo.com/)** — async REST API
- **[Anthropic Claude](https://anthropic.com/)** — prompt analysis, script writing, AI edits
- **[ElevenLabs](https://elevenlabs.io/)** — text-to-speech (API-based, no GPU needed)
- **[Pexels API](https://www.pexels.com/api/)** — HD stock footage
- **[MoviePy](https://zulko.github.io/moviepy/)** — video assembly

### Frontend
- **[Next.js 14](https://nextjs.org/)** (App Router)
- **[Tailwind CSS](https://tailwindcss.com/)**
- TypeScript

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- API keys for: [Anthropic](https://console.anthropic.com/), [ElevenLabs](https://elevenlabs.io/), [Pexels](https://www.pexels.com/api/)

### 1. Clone the repo
```bash
git clone https://github.com/camilacalderon34-lgtm/antigravity.git
cd antigravity
```

### 2. Backend setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt

cp .env.example .env
# Fill in your API keys in .env
```

### 3. Frontend setup
```bash
cd frontend
npm install
```

### 4. Run

**Terminal 1 — Backend:**
```bash
cd backend
venv\Scripts\activate
python main.py
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** 🎉

---

## ⚙️ Environment Variables

Create `backend/.env` from the example:

```env
ANTHROPIC_API_KEY=your_key_here
ELEVENLABS_API_KEY=your_key_here
PEXELS_API_KEY=your_key_here
OUTPUT_DIR=outputs
TEMP_DIR=temp
```

---

## 🗂️ Project Structure

```
antigravity/
├── backend/
│   ├── main.py              # FastAPI app & routes
│   ├── config.py            # Config & voice list
│   ├── models.py            # Pydantic models
│   ├── job_store.py         # In-memory job state
│   ├── requirements.txt
│   └── pipeline/
│       ├── orchestrator.py  # Phased pipeline runner
│       ├── analyzer.py      # Prompt analysis (Claude)
│       ├── script_gen.py    # Script writing (Claude)
│       ├── tts_gen.py       # Voiceover (ElevenLabs)
│       ├── footage.py       # Video sourcing (Pexels)
│       ├── blueprint.py     # Timeline planning
│       ├── editor.py        # Video assembly (MoviePy)
│       └── exporter.py      # Final export
│
└── frontend/
    └── src/
        ├── app/
        │   └── page.tsx         # Main layout & state
        ├── components/
        │   ├── VideoForm.tsx     # Input form
        │   ├── PipelineStatus.tsx
        │   ├── ScriptPanel.tsx
        │   ├── VoiceoverPanel.tsx
        │   ├── VoiceModal.tsx    # Full voice catalog
        │   ├── SlideToApprove.tsx
        │   ├── EditScriptModal.tsx
        │   └── ResultPanel.tsx
        ├── lib/api.ts            # Backend API calls
        └── types/index.ts        # TypeScript types
```

---

## 🎤 Voice Library

AutoVideo pulls the full ElevenLabs voice catalog dynamically — over 1,000 voices with:

- 🔍 **Search** by name, accent, or description
- 🏷️ **Filters**: gender, category, accent
- ▶️ **Preview** any voice before selecting
- ♥️ **Favorites** saved to your browser

---

## 📋 Supported Video Types

| Type | Icon |
|------|------|
| Documentary | 🎥 |
| Top 10 | 🏆 |
| Mystery | 🔍 |
| News | 📰 |
| Educational | 📚 |

Formats: `16:9` (YouTube) · `9:16` (Shorts/Reels)

---

## 🔐 Security

- API keys are loaded from `.env` and never exposed to the frontend
- `.env` is gitignored — never committed
- Voice previews play directly from ElevenLabs CDN

---

## 📄 License

MIT — free to use, modify, and distribute.

---

<p align="center">Built with 🤖 Claude · 🎙️ ElevenLabs · 🎥 Pexels</p>
