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

### Face analysis loader (v0.3.1)

The previously broken CDN `+esm` import is replaced with a MediaPipe ES bundle, matching WASM files and a BlazeFace model packaged inside the GitHub Pages site. The deployment workflow downloads these pinned components and performs a real Chromium smoke test with `FaceDetector.detect()` before publishing. Video frames are analyzed locally; only the required model assets are fetched. To prepare local development: `npm install`, `npm run vendor:faces`, then `npm start`. CDN fallback remains available if local assets are not present; the app reports errors for each attempted source. Verify deployed assets under `vendor/mediapipe/`.


### Face analysis decoded-frame fix (v0.3.2)

The scanner now waits for a decoded video frame with usable native width/height rather than using `loadedmetadata` alone. Canvas dimensions are validated before MediaPipe sees a frame, with a bounded resolution for portrait and landscape video. Invalid ROI/MediaPipe frame failures are reported with source timestamps and retried by recreating the detector; repeated failures produce an actionable video-conversion error rather than pretending analysis succeeded. Deployment now tests full landscape and portrait **video scanning**, not just one synthetic canvas frame.


### Long-form streaming audio decoder (v0.4)

The app uses a pinned Mediabunny audio demuxer and WebCodecs decoder to request small audio windows from uploaded media, rather than loading or decoding the complete video in memory. Mediabunny is MPL-2.0 licensed; its published bundle is packaged locally by GitHub Actions and deployed at `vendor/mediabunny/mediabunny.mjs`. WAV/MP3/AAC/Opus decoding depends on browser support; unsupported audio formats produce a clear error. The transcription pipeline supports incremental checkpoints and resume. For local development run `npm install && npm run vendor:audio`.


### Subtitle styling and large-source safety (v0.4)

In the Settings workspace, under **Caption and branding**, configure font, size, text color, active-word highlight, stroke color and thickness, background color, horizontal and vertical position, chunk length, and max lines. Dynamic captions highlight the currently spoken word. Rendering uses binary-search active word lookup to avoid scanning the entire transcript every preview frame. Imported recordings larger than 256 MiB are not automatically duplicated in IndexedDB; after reloading, relink the original file by importing it again (same name and size) and use **Resume from** in the Transcript tab. Audio is decoded in bounded windows, with text-only checkpoints stored periodically.


### Live Whisper captions and Director reliability (v0.4.1)

Whisper results now show in Transcript → Live Whisper subtitles as each recognition window finishes (usually 8–29 seconds, as configured), and update the burned-in captions in the video preview immediately. Enable **Follow newly recognized captions in video preview** to seek to the latest recognized source time; turn it off to keep reviewing another position while Whisper runs. Saved transcription checkpoints still persist every 3 windows. Long projects do not rebuild the full transcript UI per audio chunk.

The remote AI Director retries temporary provider HTTP 503, 429, and similar failures with bounded backoff and then offers *clearly labeled local fallback clips* if the provider remains unavailable. HTTP 401/403 are not retried. The Director key may be remembered across sessions through an explicit on-device checkbox and **Forget stored key** control. It is stored **unencrypted in this browser's localStorage** for the GitHub Pages origin, not in the repository or exported project data. Avoid remembering keys on shared devices. An API key sent directly to a remote provider from a browser may be accessible to scripts from that same origin; revoke compromised keys at the provider.

 
### Complete recording discovery (v0.5)

**AI Director → Scan entire recording · Find ALL distinct shorts** searches all transcript times instead of picking the same globally highest-scoring eight snippets. It generates up to 500 distinct candidate shorts per batch and spreads them across five-minute sections of every transcribed source, preserving source timestamps. Each new batch appends proposals and avoids existing candidates and a persistent discovery history. Clear cards **does not** forget which moments were previously used; use **Reset duplicate history** only if you want to revisit old sections. Select a source hour, then use Show more to browse candidates without rendering hundreds of cards simultaneously. You can adjust shorter or longer lengths, modes, thresholds, and generate more until no new qualifying footage remains.

**Coverage warning:** Uploading a three-hour video is not the same as transcribing it. The panel shows both the total file duration and the number of five-minute blocks with transcript, plus the Whisper processing timestamp. If transcription contains only the opening minutes, the AI cannot make meaningful clips from later hours. Resume Whisper through the entire recording first or import an SRT containing all hours.

**Different from finished video exports:** The Director builds editable clip sequences; choose Preview or Open in editor and use Export for a rendered file. Generating hundreds of candidate shorts does not render hundreds of finished MP4s automatically. A fully automated render queue still requires additional implementation. Local fallback selection includes text/topic heuristics rather than a guarantee of comedy or storytelling quality; review source context and continuity.

Remote AI mode analyzes a configured number of transcript windows with the external provider and supplements proposals with clips drawn from the **entire** local transcript. This avoids discarding recording hours merely because of request limits or provider overload. More API calls may increase cost.

 
### Video preview and source relinking (v0.5.1)

Source transcripts and subtitle words are saved separately from the original video. For large imports (over 256 MiB), the browser deliberately does not duplicate the entire video into IndexedDB. When the project is reopened, the source may say **Relink file**. The program monitor now shows a prominent **Relink original video** button rather than silently displaying a black canvas with subtitles. Import the **same original video** with the same filename and file size to reconnect it to existing edits, source IDs, and transcription. Do not create a new project or retranscribe.

The player now recognizes when the blob URL changes after relinking, including when the stable source ID is unchanged. The playback clock waits for a decoded video frame before advancing through a new distant source timestamp, avoiding skipping an entire short while the browser is still seeking. Source decode or codec problems show an actionable error. Supported browser video codecs depend on ChromeOS; H.264/AAC MP4 or VP8/Opus WebM are reliable fallbacks for unsupported MKV/HEVC recordings. An added Chromium end-to-end test checks missing-media UI, relinking, and playback after jumping between source timestamps.


The **Relink original video** control now accepts the same recording **or a converted replacement with a different filename or file size**. It replaces the linked video in place without changing source IDs, transcripts, timeline cuts, or Director proposals. If the replacement duration differs from the original by more than two seconds, it asks for confirmation because cut/subtitle timestamps could be misaligned. Source replacement is an explicit action; ordinary +Import still adds new files to the media library. The Chromium smoke test covers both paths.

 
### Call of Duty PvP highlight Director (v0.6)

**The previous transcript-only selection could clip out the actual fight.** The CoD PvP mode is separate from general transcript discovery. Click **🎮 Analyze actual gameplay audio + video** first, or choose **🎮 Find PvP action · keep full fights + reactions** to automatically scan missing sources. The locally-run analysis reads only about 24 seconds of audio at a time (no three-hour PCM allocation), detects possible action bursts using signal intensity/transients, then samples real decoded video frames for movement around promising moments. It combines evidence from full source timestamps with Whisper callouts mentioning enemies, fighting, downs/eliminations, revives, clutch moments, funny reactions, and trash talk.

The editor generates **continuous source video** with a pre-fight lead-in and reaction tail; it does not stitch unrelated quotes together while omitting gunfire. Creative Direction influences the LOCAL scoring for funny banter, revives, clutch and active gameplay. You can change **PvP action quality threshold** to favor quality versus quantity. A separate remote-language-model setting optionally critiques clip humor/setup/payoff using transcript and sensor metadata, but does not change the continuous clip cuts. A temporarily overloaded AI provider cannot erase the locally generated gameplay edits.

**Limits:** audio transients and frame motion alone do not tell whether a particular kill, enemy, revive, or death was visually confirmed. Tags such as 'downed' are based on the spoken transcript; 'possible combat audio' is only a hint. Video frame samples are coarse, not full object detection, HUD OCR, or accurate kill recognition. Some game recordings with no decode-supported audio/video will require conversion. The generated proposals should be reviewed before posting. Actual multi-hour scans can take time; scan metadata is saved periodically.


### Subtitles out of sync after refreshing and relinking (v0.6.1)

The imported subtitle words belong to the **original recording timestamp**, even when you rearrange clips in the editor. An SRT exported by ShortForm Studio belongs to the **edited project timeline**. Previously those two time bases were confused on reimport. Transcript → **SRT timing refers to** now explicitly distinguishes source-time SRTs from edited-timeline SRTs, and can map edited timeline cues back to original video source times without rewriting source cuts. Subtitle drawing waits until the relinked video's decoded timestamp matches the timeline seek; it does not show a caption over an out-of-date frame.

For a constant timing mismatch, use **Transcript → Subtitle synchronization** for the affected source and adjust the offset. Positive offsets make captions appear later, negative offsets earlier. The editor also offers **Align selected line to current video frame**: select a transcript line, pause the video at the start of the same spoken line, and apply. This saves a non-destructive per-source offset across refreshes, affects preview and exported subtitles, and leaves raw Whisper/SRT word timestamps unchanged. Verify synchronization near both the beginning and end of long recordings. If drift grows over time, it may indicate a replacement video with different speed, missing introduction or non-identical footage rather than a constant offset. Relinking now warns when source duration changes by more than 0.35 s or the replacement filename/size differs; it never guesses timing alignment.


### Restoring missing gameplay audio (v0.6.2)
The preview uses a shared HTML video element routed through Web Audio to both the speakers and the exported video. Video image/caption smoke tests previously did not measure its audible audio signal. The new playback meter tests an actual decoded audio waveform in Chromium. Preview exposes a clear Mute toggle, video volume slider and **Restore sound** control. Restore sound only unmutes preview and resets the active segment's audio level and global video level; it does **not** alter source video, SRT words, Director proposals, or transcript timestamps. If the meter remains silent during gameplay while the native Media source preview has sound, inspect the audio context state and codec. If both are silent, the relinked/converted file may lack the original audio track.


### Creative direction must change which clips are selected (v0.7)

Creative Direction is now parsed into **source-grounded editorial topics**, including enemy proximity-chat cues, teammate banter, trolling/baiting/pranks, trash talk, funny reactions, revives, clutch plays, downs and combat. Explicit instructions such as **ONLY**, **avoid**, and **no** now filter candidate clips (where matching speech/action evidence exists), instead of weakly nudging a score. A request for ONLY enemy proximity-chat trolling will not be filled with random combat footage. Only gameplay/audio/speech evidence is available to the local Director: it cannot prove which player spoke or whether an opponent participated, cannot read actual opponent mindsets, and should not invent trolling if the transcript lacks it. If your recording contains trolling but Whisper didn't recognize the exchange, correct or import its transcript first.

**Previous bug:** PvP generation redrew the UI before capturing the user's typed prompt, and results from many past searches were mixed together chronologically. The latest typed text is now captured first. Changing the creative direction starts a *new named search batch* and re-evaluates the same original recording, even when its footage appeared in a previous search. Results from earlier batches are retained, with a **Compare saved creative-direction searches** selector. The active view displays the current batch only, ordered by relevance. **Find more for SAME direction** keeps avoiding previously used moments *within that batch*. The Quick PvP focus selector supplies useful examples but is optional. A locally chosen category is a heuristic, not a vision-language understanding of the complete video. With a configured Remote AI provider, the optional editorial review can critique the transcript and action metadata for coherence and humor; it still does not receive actual video images. The full local action scan can be reused across directions without rescanning unchanged footage. No SRT, audio-routing, relink, or exported video changes are involved.


### Multi-POV VOD sync (v0.8)

Import two separate original VODs into Media. Transcribe each recording with Whisper, or import its SRT using source timestamps. Under AI Director, choose POV A (the reference match clock) and POV B, then press Match POVs by shared spoken phrases. This compares distinctive five-word sequences spoken in both recordings and estimates both a fixed offset and a small clock-rate difference. Verification warnings appear when matches are sparse or localized. Enter a manual offset if transcripts have no shared phrases. Check common events near the beginning and end of long recordings.

Create synced multi-POV highlights uses each source's original audio-event, video-motion and transcript evidence to propose cuts that switch between the two perspectives. Segments map onto a single shared match timeline but retain their respective original source IDs and timestamps. Clips open in the existing editor for adjustment and export. Sync metadata is saved with the project; earlier transcripts and single-POV edits are not rewritten. Activity can indicate a likely useful perspective but cannot establish who got a kill without HUD/kill-feed recognition or a game-specific visual model. Verify the proposed viewpoint switches before posting.


### v0.8.1 — edited stories across both synced POVs

The previous multi-POV tool segmented a single continuous source interval and could keep one POV throughout; cards then misleadingly displayed a single reference file. The new default **Build edited multi-POV STORIES (A + B)** intentionally assembles **separate, nonadjacent moments** into a sequence of source-time edits. It selects a hook/setup, combat/callout, turning point or alternate angle, and outcome/reaction when supported by the source. It requires at least three segments, a real jump cut, and **both original POV source IDs**; otherwise it does not label the candidate a two-POV story. It fills quiet gaps with jump cuts rather than leaving a single continuous clip. Stronger audio, motion and speech evidence guide camera choice; if the alternate camera lacks verified action, that cut is honestly labeled a context-only alternate angle. It cannot reliably determine who made the kill without game-specific vision/HUD analysis.

Result cards show POV A and B filenames, jump-cut and source counts, and an expanded ordered storyboard of every shot and its original timestamps. Click **Open in editor** to load the entire arranged multi-segment timeline. Use Play to review the full montage, then make fine edits and export. Previous v0.8 single-scene proposals remain saved under their original search batch; the new story generator uses a separate named search batch. Both source recordings must remain linked for playback/export. v0.8.1 includes automated cut/story validation and a two-VOD Chromium integration test checking that the editor receives multiple actual source segments.


### v0.8.2 — fix the 500 × “1 cuts” trap for imported dual POVs

When **two original video recordings** are present, **AI Director defaults to ASSEMBLED MULTI-POV STORIES**, not raw single-video highlight discovery. The ordinary **Search PvP using MY creative direction**, **Search entire source**, **Find more**, and dedicated **Build edited multi-POV** buttons now all use story assembly by default. An explicit **Director output** selector lets the user switch back to **RAW single-camera moments (one cut each)** for individual moment discovery. The results panel defaults to ONLY saved assembled stories, even when the previous active search contained 500 one-cut `cod-pvp` excerpts. The old 500 candidates are kept intact and can be inspected via **ALL old RAW single-camera moments**. A one-cut candidate is clearly labeled **NOT a montage**.

If POV sync has not been saved, the story generator now attempts to find multiple independent shared phrases from the two original-timestamp transcripts and calculate the reference-to-target time mapping automatically. It refuses weak or inconsistent matches, does not silently assume a zero-second offset, and does NOT fall back to fake one-cut or unsynchronized cross-camera outputs. On failed matching, the UI explains to use **Match POVs by shared spoken phrases** or manually align the same game event. Recordings of 3h and 12h can be aligned only if they contain the *same real gameplay interval*; different sessions cannot be combined into one supposedly synchronized encounter. Multi-POV clips still require 3+ timeline segments, actual use of both source IDs and temporal jump cuts; exported storytelling decisions remain heuristic, not confirmed kill attribution.

Browser regression exercises a saved project with **500 raw one-cut proposals**, **no alignment**, and two separate video files, presses the ordinary Generate button, and verifies new editable A+B stories are produced while the 500 old moments remain saved and hidden from the active story view. Previous video/audio/SRT pipelines were not modified in this change.


### v0.8.3 — long creative briefs should not silently produce zero stories

Long narrative prompts (such as a 2000-word filmmaking checklist) are **not** executable freeform instructions for Quick local topic assembly. Earlier, the keyword parser accidentally treated editorial prohibitions like *reject random footage* as filters requiring that each encounter contain every listed event. That made multi-POV result sets empty. The story path now recognizes long-form instructions as a **soft editorial brief**, extracts any explicit `POV A hh:mm:ss–hh:mm:ss` scouting windows, and selects up to five diverse story candidates from those windows first. It never promises that the selected edits are 80/100 or visually verified. Long action-audio bursts can now contribute shots up to ~70 seconds instead of being arbitrarily cropped to seven seconds, with an increased maximum duration for detailed story briefs. The user interface clearly warns that Quick local topic assembly is a heuristic, not an LLM editor; Remote mode still does not provide real video understanding in the multi-POV workflow. Existing SRTs, source alignment, cuts, and audio controls remain unchanged.
