"""FastAPI backend for the Automated Video Editor."""

import time as _time
from pathlib import Path
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import httpx

from config import config, AVAILABLE_VOICES
from models import GenerateRequest, GenerateResponse, Script
from job_store import store
from pipeline.orchestrator import (
    run_pipeline_phase1,
    run_pipeline_phase2,
    run_pipeline_phase3,
    run_pipeline_script_edit,
)

# Voice cache (avoids repeated API calls)
_voices_cache: list = []
_voices_cache_ts: float = 0.0

config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
config.TEMP_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="AutoVideo API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class EditScriptRequest(BaseModel):
    instruction: str


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/voices")
async def get_voices():
    global _voices_cache, _voices_cache_ts
    now = _time.time()
    if _voices_cache and now - _voices_cache_ts < 300:  # 5-minute cache
        return {"voices": _voices_cache}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(
                "https://api.elevenlabs.io/v1/voices",
                headers={"xi-api-key": config.ELEVENLABS_API_KEY},
            )
        r.raise_for_status()
        raw = r.json().get("voices", [])
        voices = []
        for v in raw:
            labels = v.get("labels") or {}
            voices.append({
                "id": v["voice_id"],
                "name": v["name"],
                "category": v.get("category", "premade"),
                "gender": labels.get("gender", ""),
                "accent": labels.get("accent", ""),
                "age": labels.get("age", ""),
                "description": labels.get("description", ""),
                "use_case": labels.get("use case", labels.get("use_case", "")),
                "preview_url": v.get("preview_url", ""),
            })
        _voices_cache = voices
        _voices_cache_ts = now
        return {"voices": voices}
    except Exception as e:
        print(f"[voices] ElevenLabs fetch failed: {e} — using fallback")
        return {"voices": AVAILABLE_VOICES}


@app.post("/api/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest, background_tasks: BackgroundTasks):
    if not config.ANTHROPIC_API_KEY:
        raise HTTPException(500, "ANTHROPIC_API_KEY not configured")
    if not config.PEXELS_API_KEY:
        raise HTTPException(500, "PEXELS_API_KEY not configured")

    job = store.create_job(req.model_dump())
    background_tasks.add_task(run_pipeline_phase1, job.job_id, req)
    return GenerateResponse(job_id=job.job_id)


@app.get("/api/jobs/{job_id}")
def get_job(job_id: str):
    job = store.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return job


@app.get("/api/jobs")
def list_jobs():
    jobs = sorted(store.all(), key=lambda j: j.created_at, reverse=True)
    return {"jobs": jobs}


@app.get("/api/jobs/{job_id}/script")
def get_script(job_id: str):
    if not store.get(job_id):
        raise HTTPException(404, "Job not found")
    script_data = store.get_pipeline_data(job_id, "script")
    if not script_data:
        raise HTTPException(404, "Script not ready yet")
    return {
        "text": script_data.get("full_text", ""),
        "total_word_count": script_data.get("total_word_count", 0),
        "scenes": len(script_data.get("scenes", [])),
    }


@app.post("/api/jobs/{job_id}/approve-script")
async def approve_script(job_id: str, background_tasks: BackgroundTasks):
    """User approved the script — start voice generation (phase 2)."""
    if not store.get(job_id):
        raise HTTPException(404, "Job not found")
    if not store.get_pipeline_data(job_id, "script"):
        raise HTTPException(400, "Script not ready")
    store.reset_steps_from(job_id, 3)
    background_tasks.add_task(run_pipeline_phase2, job_id)
    return {"ok": True}


@app.post("/api/jobs/{job_id}/approve-voice")
async def approve_voice(job_id: str, background_tasks: BackgroundTasks):
    """User approved the voiceover — start footage + final assembly (phase 3)."""
    if not store.get(job_id):
        raise HTTPException(404, "Job not found")
    store.reset_steps_from(job_id, 4)
    background_tasks.add_task(run_pipeline_phase3, job_id)
    return {"ok": True}


@app.post("/api/jobs/{job_id}/script/edit")
async def edit_script(job_id: str, edit_req: EditScriptRequest, background_tasks: BackgroundTasks):
    """Modify script with a user instruction, then pause again for re-approval."""
    if not store.get(job_id):
        raise HTTPException(404, "Job not found")
    script_data = store.get_pipeline_data(job_id, "script")
    req_data    = store.get_pipeline_data(job_id, "req")
    if not script_data or not req_data:
        raise HTTPException(400, "Script not available yet")

    current_script = Script(**script_data)
    gen_req = GenerateRequest(**req_data)
    store.reset_steps_from(job_id, 2)
    background_tasks.add_task(run_pipeline_script_edit, job_id, current_script, edit_req.instruction, gen_req)
    return {"ok": True}


@app.post("/api/jobs/{job_id}/voice/regenerate")
async def regenerate_voice(job_id: str, background_tasks: BackgroundTasks):
    """Re-run TTS (phase 2) and pause again for re-approval."""
    if not store.get(job_id):
        raise HTTPException(404, "Job not found")
    if not store.get_pipeline_data(job_id, "script"):
        raise HTTPException(400, "Script not available")
    store.reset_steps_from(job_id, 3)
    background_tasks.add_task(run_pipeline_phase2, job_id)
    return {"ok": True}


@app.get("/api/jobs/{job_id}/voice")
def get_voice(job_id: str):
    temp_path = config.TEMP_DIR / job_id / "voiceover.wav"
    if temp_path.exists():
        return FileResponse(str(temp_path), media_type="audio/wav")
    output_path = config.OUTPUT_DIR / job_id / "voiceover.mp3"
    if output_path.exists():
        return FileResponse(str(output_path), media_type="audio/mpeg")
    raise HTTPException(404, "Voice not ready yet")


@app.get("/api/download/{job_id}/{filename}")
def download_file(job_id: str, filename: str):
    safe_name = Path(filename).name
    file_path = config.OUTPUT_DIR / job_id / safe_name
    if not file_path.exists():
        raise HTTPException(404, "File not found")
    media_types = {
        ".mp4": "video/mp4", ".mp3": "audio/mpeg",
        ".txt": "text/plain", ".json": "application/json", ".srt": "text/plain",
    }
    media_type = media_types.get(file_path.suffix.lower(), "application/octet-stream")
    return FileResponse(str(file_path), media_type=media_type, filename=safe_name)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
