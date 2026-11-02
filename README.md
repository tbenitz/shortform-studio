# ShortForm Studio

**Local-first, browser-based video editor** with transcript editing, local Whisper transcription, AI Director clip proposals, nonlinear story assembly, captions, multitrack audio, mic narration recording, and real-time export. Built as a static HTML/CSS/JS progressive web application. No account, build step, or database server required.

> **Project status: functional alpha.** This is a real editor foundation with working workflows, not a promise that every professional production feature has been implemented. Please read the [Feature status](#feature-status) and [Limitations](#limitations) sections before using it for important content.

## Start using it

* Deploy on GitHub Pages via the included workflow. In your repository's Settings → Pages set Source to **GitHub Actions**, then push `main` (Actions may need enabling first).
* Or serve locally with Python: `python3 -m http.server 8080` and open `http://localhost:8080` in Chrome. **Do not open `index.html` as a `file://` URL**; ES modules and browser APIs can be blocked by local-file security restrictions.
* Import video/audio, select a source and time range, and choose **Add source excerpt**. Repeat to assemble your clip. Click **Transcript** to import SRT or transcribe with Whisper. Click **AI Director** to generate cross-timestamp clip proposals. Open a proposal in the Editor, adjust cuts, and export.

## Working workflows

1. **Media** — Import multiple videos or audio files; retrieve metadata, add source excerpts, preserve media across reload in IndexedDB when quotas allow; relink by file name, size and modification time.
2. **Transcription** — Local Whisper transcription with selectable model, WebGPU attempt with WASM fallback, speech chunk progress, editable text/speaker labels, SRT/VTT import, SRT export, full transcript search.
3. **AI Director** — Offline topic-based/heuristic candidate assembly using non-consecutive moments, adjustable mode/length/quantity/score, preview and edit; optional OpenAI-compatible text AI that returns references to real indexed utterances (API key held in memory only).
4. **Video editor** — Sequential clip timeline with reordering, split, trim, duplicate, transcript-based dead-air reduction, speed adjustment, source-level volume, zoom, fade-in, text titles, undo/redo, aspect ratio, and a canvas preview.
5. **Audio** — Additional audio tracks, mic narration recording, source gain, basic compression, optional lowering of music track gain, preview and mixed export.
6. **Captions** — SRT import/export, adjustable text size, words per group, uppercasing, position, colors, dynamic/minimal/boxed styles burned into program preview/export.
7. **Quality control** — Project preflight checks for missing media, excessive speed, very short cuts, caption status, and chronology warnings.
8. **Export** — Local real-time Canvas capture / Web Audio mixing / MediaRecorder, MP4 when supported or WebM fallback; editable cut-list and project JSON export; GitHub Pages deployment.
9. **Persistence** — IndexedDB project state, optional IndexedDB media files, undo/redo snapshots, service worker application shell caching.

## Feature status

| Feature | Status | Reality |
| --- | --- | --- |
| Multi-source project import | Implemented | Playback limited to codecs the browser can decode |
| Nonlinear/multi-timestamp clip assembly | Implemented, heuristic | Relatedness is lexical/topic based, not full understanding of jokes or context |
| Optional text-AI Director | Implemented adapter | Requires user key/provider; subject to CORS; no built-in secure proxy |
| Local Whisper audio transcription | Implemented adapter, experimental | Requires downloadable model and browser-decodable audio; long videos can exceed RAM |
| Word timestamps | Model-dependent | Exact precision is not guaranteed; edit manually |
| Transcript / speaker editor | Implemented | Manual speaker labels only, **not automatic diarization** |
| Intelligent joke/callback/story identification | Heuristic baseline | No semantic video understanding or guaranteed cohesive narratives |
| NLE clip reorder / trim / split / speed | Implemented | Preview seeks and media decoding can stall on certain formats |
| Captions / aspect crop / color adjustments | Implemented | Basic rendering, no face tracking |
| Title overlays | Implemented | Single title per clip; no full animation/keyframe engine |
| Narration voice recording | Implemented | Uses microphone; no synthesized TTS voice output yet |
| Background music overlays | Implemented | Requires user's own audio file, not a built-in licensed library |
| Mix/normalize audio | Partial | Adjustable gains and compressor; no advanced noise removal or LUFS analysis |
| Fade and hard-cut transitions | Implemented | Advanced transitions and cross-dissolves not yet available |
| Local export | Implemented, experimental | **Real-time** MediaRecorder capture; browser codecs only; may produce drift/stalls |
| AI visual understanding / B-roll / face tracking | Planned | Not yet implemented |
| Automatic diarization / speech gap QA | Planned | Not yet implemented |
| Native FFmpeg / frame-accurate export | Planned | Not included in static PWA |
| Local TTS/voice cloning and dubbing | Planned | Not included; mic recording works |
| Multicam synchronization and keyframes | Planned | Not included |
| Content scheduling / automatic publishing | Planned | Not included |
| Full professional effects, masks, LUTs | Planned | Not included |

## Practical limitations and constraints

* The PWA can be fully used without cloud APIs; **Whisper downloads from Hugging Face and the Transformers.js library downloads from jsDelivr the first time**. Connectivity is required for first-time setup; model caching is managed by the library/browser and may be evicted. The service worker caches the app shell only, not large models or uploaded videos.
* Codec support depends on your Chrome/Chromium build. MP4 export is not guaranteed; fallback is WebM. `.mkv` files may be listed but not decoded; convert externally or provide compatible MP4/WebM. `decodeAudioData` may not decode the audio from some video containers; for those, import a separate extracted audio file for transcription.
* Huge source files may exceed browser RAM/disk quota. Choose small Whisper Tiny to start on an 8 GB system. The current decoder loads a full decoded audio file into memory; it is **not suitable for unattended two-hour transcription** without refactoring to stream chunks from a demuxer.
* The offline clip selector is a heuristic **suggestion engine**, not a fully autonomous creative video agent. It may splice moments that are topically related but belong to different contexts. Always review the original footage and final chronology.
* Any external AI request sends source transcripts to the configured endpoint. API keys remain in memory until the tab is closed; direct browser calls may fail due to provider CORS rules. For production use, implement a secure backend proxy and credentials management.
* Project JSON contains media *references*, not binary source files. To reopen on another device, you must reimport your source files. On the same browser, media survives reload only if it was stored successfully in IndexedDB.
* Video exports play the timeline in real time and record it; unlike offline encoding they are susceptible to decoder/seek pauses. Check audio sync and duration before posting. The source clip cut list is exported in JSON for future native-renderer support.
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
* `src/asr.js` — Optional Transformers.js Whisper speech-recognition adapter
* `src/renderer.js` — Canvas playback compositor, audio routing, MediaRecorder export
* `src/quality.js` — Preflight analysis and optional dead-air removal
* `src/storage.js` — IndexedDB project and media caches
* `sw.js` — Offline app-shell cache
* `.github/workflows/deploy-pages.yml` — GitHub Pages Actions deployment
* `tests/` — Unit / smoke tests

## Roadmap to the complete production studio

1. Decode audio and video in streaming chunks through a demuxer + WebCodecs; implement accurate gap checks and timestamp reconciliation.
2. Add a high-quality native FFmpeg service or trusted client helper for deterministic offline render, codec conversion, transitions and overlays; keep the browser UI the same.
3. Build a multimodal indexing pipeline (scene/action/face/audio signals) and embedding-based cross-video retrieval with opt-in small on-device models.
4. Add consent-based speaker diarization, dedup and manual review; caption segmentation and frame-safe placement.
5. Implement local or securely hosted TTS rendering, voice-over caching, professional multitrack editing and automated audio QC.
6. Add crossfade/edit decision list (EDL), keyframe effects, multicam, animated subtitle templates, licensed stock media, brand presets, production QC and batch exports.
7. Use an agentic planner to compare multiple coherent, source-faithful storyboards and editable suggestions with provenance for each clip.

## Privacy and safety

This project contains no built-in third-party analytics. When source media is stored in IndexedDB, it remains available to other scripts running on the same site origin, so host the app only where you trust the deployed code. Use consent for voice recordings and be careful that rearranged dialogue, reactions, and captions do not falsely imply events or statements.

## License

MIT. The optional Transformers.js package and downloaded model weights have separate licenses; consult their upstream projects before redistribution.
