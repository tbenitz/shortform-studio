# ShortForm Studio — Complete Product Specification

This document captures the intended **finished** product, not just capabilities implemented in the current alpha. See README for the live implementation status. Never expose planned-only controls as though they are operational.

## Product promise

Turn long-form recordings and multi-camera productions into strong, **source-faithful** short videos. The Director finds themes and payoff moments from separate locations in the timeline, assembles complete narrative candidates, and allows the user to override every decision.

## Source intake / workspace

- Multiple videos, audios, images, cameras, folders, local file relinking, upload validation, duplicate detection, drag-and-drop, metadata and media health reports.
- MP4, MOV, WebM, MKV and common audio codecs via compatibility detection, progressive proxies, safe codec conversion; read video files directly where supported.
- Snapshotable projects, complete cross-device portable bundles (media optional), original-source immutability, automatic checkpointing, undo history, media cache eviction and restart after interruption.
- Multi-project workspace, nested collections, tags, custom sort, search, favourites, watch/review status, source timecode references.

## Transcription and speech accuracy

- Local Whisper tiny/base/small or user-selected compatible models; optional server engine and model download/cache management.
- Word-level timestamps, multilingual ASR, punctuation, diarization with speaker merge/split, manual speaker names, overlapping speakers and active-speaker probabilities.
- Coverage map for every second of original audio; overlapping audio windows; speech activity detection; detect missing head/tail/chunks, silence, low-volume content and uncertainty.
- One-click retry of **all** unresolved gaps; quality comparison of models; transcript version history; confidence markers and reviewer approvals.
- Import/export SRT, VTT, TXT, JSON; search, replace, filter by speaker, transcript-only editing, transcript/media side-by-side.

## Multimodal analysis and indexing

- Hierarchical content map: utterance, scene, topic, speaker, visual actions, faces, music, emotional cues, comic setups, contradiction, payoff and callbacks.
- Visual shot-change detection, automatic thumbnails and embeddings, speaker camera focus, object mentions aligned to footage, licensed B-roll suggestions and match scoring.
- Cross-recording semantic search, evidence timestamps and relationship graphs, duplicate-interest suppression and recency-aware novelty scores.

## AI Director

- Modes: comedy, narrative, gaming, learning, how-to, facts, debate, surprise, interviews, reviews, highlights, emotional, inspiration, drama, before/after and custom briefs.
- Independent candidate shorts assembled from *distant timestamps* and even separate files. Structure includes hook, setup, development, payoff and satisfying ending.
- Generate alternate cuts, compare hooks, identify callbacks, find supporting reactions without faking chronology, provide context-preserving narrations, suggest precise transition/sound/caption choices.
- Creative custom instruction panel, user locked cuts, speaker and time exclusions, preferred tone, clip diversity controls, minimum quality policy, bounded agentic revision passes.
- Transparent source provenance, rationale per scene, confidence, factual/context QA and optional approval for chronology changes.
- Editable candidate board with drafts, selected, rejected, revised, rendered, scheduled states. Feedback learning remains local unless explicitly shared.

## Full nonlinear editor

- Video, music, voice-over, SFX, images, shapes and subtitle tracks; multi-cam sync, frame-accurate edits, trim, split, slip, slide, roll, ripple, splice, stretch, crop, speed ramps, reverse and freeze-frame.
- Snap to frames/words/beats/markers, keyframe timeline, grouped edits, magnetic alignment, proxy playback, dual-source monitors, audio waveforms, intelligent cut cleanup.
- Source vs program inspector, clip edit attributes, event/keyboard accessibility, history snapshots, clipboard, multi-select and split/lock controls.
- Basic normal/fade transitions plus future sophisticated dissolves, wipes, match cuts, motion blur and contextual transitions.
- Picture-in-picture, speaker splits, active-camera cut automation, focus-aware vertical reframing, smooth crop transitions, tracked face/objects and motion graphics.
- Layer filters, masking, backgrounds, color matching, grade, LUT, noise/sharpen, subtitles safe zones, brand presets and logos.

## Captions and metadata

- Transcript-synced word, phrase, sentence, karaoke, comedy punctuation and expressive templates; optional speaker-specific colors.
- Word corrections, per-word timing, emotes, custom fonts, outlines, shadows, background blocks, animations, contrast checks, 9:16 UI safe zones.
- Title and thumbnail options, first-line hooks, draft descriptions, platform-specific hashtags and responsible contextual titles.

## Voice-over and audio mastering

- Record voice-over, import audio, on-device TTS when feasible, consent-based custom voice matching, optional remote generation and translation/dubbing.
- Preview voices, estimate generation duration using measured throughput, stream or chunk generated audio for early playback and smooth buffering, regenerate sentence sections only.
- Silence reduction, room tone, gain normalization, LUFS analysis, EQ, noise reduction, compressor/de-esser, ducking, crossfades, sound effect timing and music beat synchronization.
- Auto-detect clipped audio, clipped words, speech overlap and speaker changes, sync inspection, channel balance, clean transitions.

## AI review / preflight

- Independent reviewers evaluate hook, clarity, payoff, relevance, pacing, source context, context-faithful chronology, caption visibility, audio peaks, framing, codec support and platform safety zones.
- User-facing scores are editing heuristics, **not predictions of viral performance**. Explanation required for each score and edit suggestion.
- Render sample first; inspect first 30 sec and last 30 sec, black frames, silent chunks, long pauses, cut-off words, low-confidence scenes.
- Automatic bounded retry only for recoverable steps, caches intermediate results, avoids repetitive model downloads.

## Rendering / export / delivery

- Realtime browser capture for compatibility and immediate previews; production-grade optional native FFmpeg/WebCodecs renderer for deterministic offline frame-exact MP4/H.264/AAC, HEVC where licensed/supported, WebM/VP9/AV1 where feasible.
- 9:16, 16:9, 1:1, 4:5; preset resolutions/framerates/bitrates, separate caption files and burned-in captions, chroma/reprojection settings, quality/loss limits.
- Batch exports by candidate, platform and resolution; draft previews, rendering queue, progress measured from frames and normalized audio tasks, pause/resume/cancel, render logs and error reports.
- Metadata, thumbnails, editable EDL, project JSON/archive, source license records, naming patterns, content calendar and reuse warnings.

## High-level settings taxonomy

| Area | Settings |
| --- | --- |
| Source | Auto-link media, file types, project scratch size, proxy policy, duplicate strategy |
| Processing | Local/hybrid/cloud mode, device selection, memory budget, concurrency, background processing |
| ASR | Model, language, chunk overlap, speaker count hints, minimum speech confidence, retry gaps, word time precision |
| Director | Clips count, min/max duration, categories, narrative structure, nonlinear degree, tone, creativity, quality floor, revision cap, disallowed topics/words |
| Source fidelity | Chronology constraints, recontextualization warnings, minimum context, provenance display, speaker identity approval |
| Timeline | Framerate, snap behavior, default transition, ripple edits, undo retention, preview quality |
| Smart crop | Aspect, face priorities, framing margin, auto zoom speed, split speaker behavior, crop easing |
| Captions | Style, font, shadow, outline, word emphasis, line limits, per-speaker color, safe areas, proofreading |
| Narration | Language, model, voice, prosody, volume, speed, consent, auto bridging, voice-over intensity |
| Audio | Music library, licensing, volume and LUFS target, ducking, limiter, EQ, denoising, fades, profanity masking |
| Visual | Filters, logo, intro, outro, transitions, color grade, LUT, overlays, SFX library |
| Export | Platform presets, aspect, resolution, FPS, encoding format, bitrate, caption mode, batch naming, preview checks |
| Storage | Autosave, caches, memory quota, OPFS/IndexedDB, purge rules, export/import, offline capability |
| Accessibility | UI scale, font contrast, keyboard mapping, reduced motion, caption preview controls |
| Privacy | Local-only default, external provider opt-in, key management, user-controlled data deletion |

## Suggested release sequence

**Alpha (current)**: local source editing, transcript import/manual editing, experimental Whisper, local clip candidates, remote AI adapter, caption preview, voice recording, real-time browser export, project persistence, preflight.

**Beta**: reliable streaming media demuxer, audio coverage QA, 2-hour source processing, robust backend-independent project references, deterministic render service, stronger story retrieval and better multi-track ergonomics.

**1.0**: multimodal indexing, robust scene assembly with provenance checks, responsive reframing, quality/revision engine, batch render and delivery, polished feature-complete audio/subtitles, export guarantees.

## Non-goals and guardrails

- No fake placeholder buttons, no invented engagement metrics, no promises of guaranteed virality.
- No silent sharing of media or transcripts, no embedded provider secrets, no unlicensed music distributed with the editor.
- AI can propose dramatic edits, but the application must not imply that a reaction is contemporaneous when it was not; reviewer must be able to inspect original timestamps.
