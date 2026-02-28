"""Pipeline Orchestrator — phased execution with approval gates.

Phase 1: Steps 1-2  (Analysis + Script)      → pauses, waits for script approval
Phase 2: Step 3     (Voice Generation)        → pauses, waits for voice approval
Phase 3: Steps 4-7  (Footage → Export)        → runs to completion
"""

import asyncio
from concurrent.futures import ThreadPoolExecutor

from config import config
from models import GenerateRequest, JobResult, Script
from job_store import store

from pipeline.analyzer import analyze_prompt
from pipeline.script_gen import generate_script, modify_script
from pipeline.tts_gen import generate_tts
from pipeline.footage import source_footage
from pipeline.blueprint import build_blueprint
from pipeline.editor import assemble_video
from pipeline.exporter import export_deliverables

_executor = ThreadPoolExecutor(max_workers=2)


async def _run_in_thread(fn, *args, **kwargs):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, lambda: fn(*args, **kwargs))


# ── Phase 1: Analysis + Script ────────────────────────────────────────────────

async def run_pipeline_phase1(job_id: str, req: GenerateRequest):
    """Steps 1-2. Stops after script is ready and waits for user approval."""
    job_dir = config.TEMP_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    target_duration = req.target_duration or 10

    try:
        store.start_step(job_id, 1, "Analysing prompt with Claude…")
        analysis = await _run_in_thread(
            analyze_prompt,
            req.title, req.prompt, req.video_type.value, target_duration, req.language,
        )
        store.set_pipeline_data(job_id, "analysis", analysis.model_dump())
        store.set_pipeline_data(job_id, "req", req.model_dump())
        store.complete_step(job_id, 1,
            f"Extracted {len(analysis.talking_points)} talking points | tone: {analysis.tone}")

        store.start_step(job_id, 2, "Writing narration script…")
        script = await _run_in_thread(generate_script, req.title, analysis, target_duration)
        store.set_pipeline_data(job_id, "script", script.model_dump())
        store.complete_step(job_id, 2,
            f"{len(script.scenes)} scenes | ~{script.total_word_count} words")

        # ← PAUSE: pipeline waits here for /approve-script

    except Exception as e:
        import traceback; traceback.print_exc()
        job = store.get(job_id)
        store.fail_job(job_id, f"{type(e).__name__}: {e}", step=job.current_step if job else 1)


async def run_pipeline_script_edit(job_id: str, current_script: Script, instruction: str, _req: GenerateRequest):
    """Re-run step 2 with a modification, then pause again for re-approval."""
    try:
        store.start_step(job_id, 2, "Regenerating script with modifications…")
        new_script = await _run_in_thread(modify_script, current_script, instruction)
        store.set_pipeline_data(job_id, "script", new_script.model_dump())
        store.complete_step(job_id, 2,
            f"{len(new_script.scenes)} scenes | ~{new_script.total_word_count} words")

        # ← PAUSE again for re-approval

    except Exception as e:
        import traceback; traceback.print_exc()
        store.fail_job(job_id, f"{type(e).__name__}: {e}", step=2)


# ── Phase 2: Voice Generation ─────────────────────────────────────────────────

async def run_pipeline_phase2(job_id: str):
    """Step 3 only. Stops after voice is ready and waits for user approval."""
    job_dir = config.TEMP_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    script_data = store.get_pipeline_data(job_id, "script")
    req_data    = store.get_pipeline_data(job_id, "req")
    if not script_data or not req_data:
        store.fail_job(job_id, "Missing pipeline data for phase 2", step=3)
        return

    script  = Script(**script_data)
    gen_req = GenerateRequest(**req_data)

    try:
        store.start_step(job_id, 3, f"Generating voiceover…")
        tts_result = await _run_in_thread(generate_tts, script, gen_req.voice_id, job_dir)
        store.complete_step(job_id, 3, f"Audio ready: ~{tts_result.total_duration_seconds:.0f}s")

        # ← PAUSE: pipeline waits here for /approve-voice

    except Exception as e:
        import traceback; traceback.print_exc()
        store.fail_job(job_id, f"{type(e).__name__}: {e}", step=3)


# ── Phase 3: Footage → Export ─────────────────────────────────────────────────

async def run_pipeline_phase3(job_id: str):
    """Steps 4-7. Runs to completion after voice is approved."""
    job_dir     = config.TEMP_DIR / job_id
    output_base = config.OUTPUT_DIR

    script_data   = store.get_pipeline_data(job_id, "script")
    req_data      = store.get_pipeline_data(job_id, "req")
    analysis_data = store.get_pipeline_data(job_id, "analysis")
    if not script_data or not req_data:
        store.fail_job(job_id, "Missing pipeline data for phase 3", step=4)
        return

    script  = Script(**script_data)
    gen_req = GenerateRequest(**req_data)
    tone  = analysis_data.get("tone",  "neutral")  if analysis_data else "neutral"
    style = analysis_data.get("style", "standard") if analysis_data else "standard"

    # Rebuild tts_result from the saved audio file
    from models import TTSResult
    wav_path = str(job_dir / "voiceover.wav")
    import soundfile as sf
    from pathlib import Path as P
    wav = P(wav_path)
    if wav.exists():
        data, sr = sf.read(wav_path)
        duration = len(data) / sr
    else:
        duration = 0.0

    tts_result = TTSResult(
        audio_path=wav_path,
        total_duration_seconds=duration,
        scenes=[{"scene_id": s.scene_id, "start_time": 0, "end_time": duration / max(len(script.scenes),1) * (i+1),
                 "duration": duration / max(len(script.scenes),1)}
                for i, s in enumerate(script.scenes)],
    )

    try:
        store.start_step(job_id, 4, "Searching and downloading footage from Pexels…")
        footage_result = await _run_in_thread(
            source_footage, script, tts_result, job_dir, gen_req.video_format.value)
        found = sum(1 for s in footage_result.scenes if s.primary_asset)
        store.complete_step(job_id, 4, f"Assets found for {found}/{len(footage_result.scenes)} scenes")

        store.start_step(job_id, 5, "Planning edit timeline…")
        blueprint = await _run_in_thread(
            build_blueprint, gen_req.title, script, tts_result, footage_result,
            gen_req.video_format.value, tone, style)
        store.complete_step(job_id, 5, f"Blueprint ready for {len(blueprint.scenes)} scenes")

        store.start_step(job_id, 6, "Assembling video with MoviePy…")
        edit_result = await _run_in_thread(
            assemble_video, blueprint, tts_result.audio_path, job_dir, gen_req.add_background_music)
        store.complete_step(job_id, 6, f"Video assembled: {edit_result.duration_seconds:.0f}s")

        store.start_step(job_id, 7, "Exporting deliverables…")
        export_result = await _run_in_thread(
            export_deliverables, job_id, gen_req.title, script, tts_result,
            footage_result, blueprint, edit_result, output_base)
        store.complete_step(job_id, 7, "All deliverables ready!")

        store.complete_job(job_id, JobResult(
            final_video=f"/api/download/{job_id}/final_video.mp4",
            script_file=f"/api/download/{job_id}/script.txt",
            voiceover_file=f"/api/download/{job_id}/voiceover.mp3",
            asset_list_file=f"/api/download/{job_id}/assets.json",
            timeline_file=f"/api/download/{job_id}/timeline.json",
            duration_seconds=export_result.duration_seconds,
        ))

    except Exception as e:
        import traceback; traceback.print_exc()
        job = store.get(job_id)
        store.fail_job(job_id, f"{type(e).__name__}: {e}", step=job.current_step if job else 4)


# ── Legacy aliases used by edit/regenerate endpoints ─────────────────────────

async def run_pipeline_from_script_edit(job_id, current_script, instruction, req):
    await run_pipeline_script_edit(job_id, current_script, instruction, req)

async def run_pipeline_from_step3(job_id, _script, _req):
    await run_pipeline_phase2(job_id)
