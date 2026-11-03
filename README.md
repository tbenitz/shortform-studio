# ShortForm Studio

**Local-first, browser-based video editor** with transcript editing, local Whisper transcription, AI Director clip proposals, nonlinear story assembly, captions, multitrack audio, mic narration recording, and real-time export. Built as a static HTML/CSS/JS progressive web application. No account, build step, or database server required.

> **Project status: functional alpha.** This is a real editor foundation with working workflows, not a promise that every professional production feature has been implemented. Please read the [Feature status](#feature-status) and [Limitations](#limitations) sections before using it for important content.

## Start using it

* Deploy on GitHub Pages via the included workflow. In your repository's Settings → Pages set Source to **GitHub Actions**, then push `main` (Actions may need enabling first).
* Or serve locally with Python: `python3 -m http.server 8080` and open `http://localhost:8080` in Chrome. **Do not open `index.html` as a `file://` URL**; ES modules and browser APIs can be blocked by local-file security restrictions.
* Import video/audio, select a source and time range, and choose **Add source excerpt**. Repeat to assemble your clip. Click **Transcript** to import SRT or transcribe with Whisper. Click **AI Director** to generate cross-timestamp clip proposals. Open a proposal in the Editor, adjust cuts, and export.

## Working workflows (v0.2)

1. **Multi-source media** — Import videos, audio, and images; select precise source excerpts; scene-boundary analysis with frame differences, and browser-cache relinking.
2. **Transcription with coverage review** — Local Whisper (WebGPU preference, WASM fallback), overlapping transcription windows, word reconciliation, audio-energy gap flags, *retry all flagged gaps*, editable transcript, subtitles and speaker labels. Very long, compressed videos can exceed browser RAM/codec compatibility. **Timestamp compatibility:** Automatically tries Whisper word alignment, then segment timestamps, then plain transcription for ONNX exports without cross-attention outputs. Segment/plain modes estimate word boundaries; this is clearly flagged for caption review. You can choose Segment or Plain mode under Settings → Transcription.
3. **AI Director** — Fast local keyword assembly, optional true local sentence-embedding similarity using MiniLM, or opt-in windowed HTTPS language-model analysis; all produce editable source-verified cuts. Alternative opener and context/chronology review are included.
4. **Scene/faces** — MediaPipe model-based on-device face detection over sampled video frames, optional interpolated face-aware crops; manual focus point, zoom, start/end framing keyframes, visual filters, and local shot-change detection. The app does **not** identify individual people or objects.
5. **Editing** — Sequenced cut timeline, trim/split/duplicate/reorder, variable speed, title overlays, dead-air trimming, start/end pan/zoom keyframes, timeline undo/redo, fade/dissolve-held-frame/wipe/slide/zoom transitions. This is not a complete multicamera NLE.
6. **Narration** — Microphone voice recording; browser speech-synthesis *preview*; optional HTTPS-compatible speech generation that creates a real editable audio overlay. Automatic bridge text suggestions based on time gaps require editorial review. Speech API keys are memory-only.
7. **Speaker workflows** — Manual speaker correction and merging; optional user-consented HTTPS hosted diarization endpoint and timestamp-to-word alignment. There is **no production-quality on-device speaker identity engine**.
8. **Audio and captions** — Independent audio overlays, basic compression/mixing and music-volume ducking, SRT/VTT support, burned-in caption styles/colors/position.
9. **Export** — Local real-time browser MediaRecorder where supported; **optional native Python + FFmpeg renderer** for longer projects, native MP4 H.264/AAC output, subtitle burn-in, audio overlay mixing, and multi-candidate batch rendering.
10. **Projects and QC** — IndexedDB save/reload with quota limitations, project JSON, editorial risk warnings and structural preflight, source timestamp inspection, tests and GitHub Pages deployment.

## Feature status and expectations

| Feature | Status | Important qualification |
| --- | --- | --- |
| Timeline, cuts, trims, captions, source editability | Implemented | Basic sequence editor, not a professional NLE |
| Multi-timestamp story suggestions | Implemented | Heuristic, optional local embeddings, optional hosted language model; humans must review context |
| Long-video transcript analysis | Improved, experimental | Overlap and gap-retry tools; browser audio decoding still requires significant RAM |
| Local semantic topic retrieval | Implemented adapter | Requires model download and compute; first run needs internet |
| Auto scene-boundary analysis | Implemented | Visual frame difference is not semantic scene understanding |
| Face-aware reframing | Implemented adapter | MediaPipe detects faces, not persistent people/active speakers; sampling can miss fast changes |
| Speaker diarization | Optional provider integration | External HTTPS service, consent and API required; no default hosted service |
| Voice generation | Optional provider integration | HTTPS speech endpoint; browser voice only previews and cannot export its output |
| Transitions | Implemented basic effects | Dissolve blends with previous held frame, not true dual-stream crossfade |
| Pan/zoom keyframes and visual looks | Implemented in browser | Native FFmpeg export does not reproduce every preview animation or transition |
| Native rendering / batch clip export | Implemented command-line renderer | FFmpeg and source files required on a machine; not executed by GitHub Pages |
| Actual AI joke comprehension, visual B-roll matching | Partial | AI textual analysis, scene differences; not reliable human-equivalent multimodal reasoning |
| Offline generative TTS, automatic language dubbing | Not yet integrated | Requires locally runnable speech models and alignment |
| Multi-cam sync, masks, motion tracking, LUTs | Not yet integrated | Advanced editing pipeline needed |
| Publishing calendar, upload/scheduling integrations | Not yet integrated | Would require provider auth and APIs |
| Automated music licensing library | Not included | Bring music you have rights to use |

### Native rendering (FFmpeg)

The optional native renderer does not require any online service. Export **Project JSON** from the website and place the original media files in one folder. Run on a system with Python 3 and FFmpeg installed:

```bash
python3 tools/render_project.py project.json --media-dir ./source-media --out short.mp4
```

Render every AI candidate into a separate MP4:

```bash
python3 tools/render_project.py project.json --media-dir ./source-media --out ./exports/short.mp4 --all-candidates
```

This is a separate native command-line path, not a feature that GitHub Pages runs remotely. The native renderer currently handles cuts, speed, static focal-point zoom, basic color adjustment, subtitles and audio overlays. Some browser effects are deliberately not yet represented in its export pipeline. The encoder can take significant time and disk space for very long projects.

## Practical limitations and constraints

* The PWA can be fully used without cloud APIs; **Whisper downloads from Hugging Face and the Transformers.js library downloads from jsDelivr the first time**. Connectivity is required for first-time setup; model caching is managed by the library/browser and may be evicted. The service worker caches the app shell only, not large models or uploaded videos.
* Codec support depends on your Chrome/Chromium build. MP4 export is not guaranteed; fallback is WebM. `.mkv` files may be listed but not decoded; convert externally or provide compatible MP4/WebM. `decodeAudioData` may not decode the audio from some video containers; for those, import a separate extracted audio file for transcription.
* Huge source files may exceed browser RAM/disk quota. Choose small Whisper Tiny to start on an 8 GB system. The current decoder loads a full decoded audio file into memory, even though recognition uses overlapping windows. Two-hour recordings may still exhaust browser memory. For substantial sources, use extracted audio or an external native processing workflow.
* The offline clip selector is a heuristic **suggestion engine**, not a fully autonomous creative video agent. It may splice moments that are topically related but belong to different contexts. Always review the original footage and final chronology.
* Any external AI request sends source transcripts to the configured endpoint. API keys remain in memory until the tab is closed; direct browser calls may fail due to provider CORS rules. For production use, implement a secure backend proxy and credentials management.
* Project JSON contains media *references*, not binary source files. To reopen on another device, you must reimport your source files. On the same browser, media survives reload only if it was stored successfully in IndexedDB.
* Browser video exports play the timeline in real time and record it; unlike native offline encoding they are susceptible to decoder/seek pauses. Check audio sync and duration before posting. For longer projects, use the included FFmpeg renderer and source cut list.
* All media stays local unless you explicitly choose remote AI. No tracking or analytics are included.

## Keyboard shortcuts

* Space = play/pause
* Left/right = jump 5 seconds
* Delete/Backspace = remove selected clip
* Ctrl+Z / Ctrl+Shift+Z = undo/redo
* Ctrl+S = save project metadata

## Architecture

* `index.html` — Application shell and editing workspace
* `src/styles.css` — Responsive dark editor interface
* `src/main.js` — State, inspector panels, timeline and commands
* `src/model.js` — Project data model, SRT parsing, source/clip time mapping
* `src/director.js` — Local candidate-generation algorithm + remote JSON AI adapter
* `src/asr.js` — Transformers.js Whisper adapter, overlap and transcript gap auditing
* `src/renderer.js` — Canvas playback compositor, audio routing, MediaRecorder export
* `src/quality.js` / `src/review.js` — Preflight, editorial context review, and alternate openers
* `src/faces.js` / `src/scenes.js` — Sampled face analysis and shot-boundary detection
* `src/speakers.js` / `src/voice.js` — Speaker review, opt-in diarization, speech preview and generation
* `tools/render_project.py` — Optional native FFmpeg batch exporter
* `src/storage.js` — IndexedDB project and media caches
* `sw.js` — Offline app-shell cache
* `.github/workflows/deploy-pages.yml` — GitHub Pages Actions deployment
* `tests/` — Unit / smoke tests

## Remaining production-level roadmap

1. Decode audio and video in streaming chunks through a demuxer + WebCodecs; implement accurate gap checks and timestamp reconciliation.
2. Extend the included native FFmpeg CLI to a full export companion matching every browser effect, animation, and caption style.
3. Build a multimodal indexing pipeline (scene/action/face/audio signals) and embedding-based cross-video retrieval with opt-in small on-device models.
4. Add fully local validated speaker-embedding diarization, dedup, and frame-safe caption placement beyond existing manual/external-provider workflows.
5. Integrate offline TTS and better voice-over caching, audio denoising, loudness compliance and other broadcast-grade sound checks.
6. Extend the initial keyframes, transitions and native batch exports to proper dual-stream crossfades, multicam, masks, LUTs, branded templates and an authorized stock media library.
7. Use an agentic planner to compare multiple coherent, source-faithful storyboards and editable suggestions with provenance for each clip.

## Privacy and safety

This project contains no built-in third-party analytics. When source media is stored in IndexedDB, it remains available to other scripts running on the same site origin, so host the app only where you trust the deployed code. Use consent for voice recordings and be careful that rearranged dialogue, reactions, and captions do not falsely imply events or statements.

## License

MIT. The optional Transformers.js package and downloaded model weights have separate licenses; consult their upstream projects before redistribution.

### v0.3: full-source editor and safe Whisper timestamps
New videos are automatically inserted on the full-length timeline using their actual media metadata (not 15 seconds). Source preview and In/Out markers allow selections anywhere in the source. Use Split, drag reorder, zoom in/out, Fit, speed and trim in the Editor workspace.
Whisper Auto mode now requests segment timestamps, then plain transcription; only explicit Advanced Word mode requests model cross-attention outputs. Word timestamps are approximate in normal mode and should be reviewed before caption export. If browser decoding of video audio fails, extract WAV audio and import it for transcription. HTML/JS assets load network-first to prevent stale service worker caches.
