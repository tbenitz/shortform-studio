# ShortForm Studio

**Local-first, browser-based video editor** with transcript editing, local Whisper transcription, AI Director clip proposals, nonlinear story assembly, captions, multitrack audio, mic narration recording, and real-time export. Built as a static HTML/CSS/JS progressive web application. No account, build step, or database server required.

> **Project status: functional alpha.** This is a real editor foundation with working workflows, not a promise that every professional production feature has been implemented. Please read the [Feature status](#feature-status) and [Limitations](#limitations) sections before using it for important content.

## Master feature checklist — OWNER APPROVAL REQUIRED

> **Acceptance status: 0 / 494 owner-approved.** This is a complete *desired-feature and verification backlog*, **not** a claim that 494 features are missing or broken. Features mentioned elsewhere as "implemented", "working", or "fixed" remain **unchecked here until the repository owner personally confirms acceptance**.

### Mandatory checkbox rules

1. **Only the repository owner (tbenitz) can authorize checking a feature.** This means the owner must explicitly approve that named feature/ID as working and acceptable. An assistant, coding agent, test suite, developer, CI workflow, PR author, or commit message may **never infer approval** from code changes, test passes, demos, or claims of completion.
2. **When adding functionality:** add a new `- [ ]` item if one does not already exist. Preserve existing IDs and statuses. Implementing or testing it does **not** authorize changing `[ ]` to `[x]`.
3. **When fixing or improving functionality:** leave the checkbox unchecked unless the owner personally re-approves the feature. Report the implementation and any tests separately from acceptance.
4. **When the owner reports a feature broken, incomplete, regressed, or not doing what was requested:** immediately set that item's checkbox to `- [ ]` (even if previously approved), add/update its entry in the **Open problems / re-review log**, and keep it unchecked until the owner expressly re-approves it after review.
5. **No bulk approval:** do not automatically check all items in a section or all features in a release. Each specific checkbox/ID needs an explicit approval from the owner. If the owner expressly approves a defined set of IDs, only those IDs may be checked.
6. **Do not delete or silently rename existing items:** keep stable IDs so bugs, acceptance decisions, and future feature requests can be tracked. New features get new unused IDs; never renumber earlier IDs.
7. **Testing and completion are separate:** record machine-test results, implementation claims, and unresolved risks in engineering logs or issue notes; `[x]` means **owner acceptance only**, not code present or test passing.
8. **If approval is ambiguous, leave unchecked and ask which feature IDs were approved.** Never assume approval from messages such as "go ahead", "deployed", "fixed it", or "looks better" unless an item is clearly accepted as complete.
9. **Do not change unrelated functioning code solely to make progress on the checklist.** The checklist is tracking, not permission for a feature rewrite.
10. **Re-evaluate accepted features after regressions.** If a user-reported bug affects an approved feature, revert to `[ ]` and log the reason immediately.

**Checkbox meanings:** `[ ]` = not yet personally accepted / pending review (may already exist in the app); `[x]` = owner explicitly accepted and no later breakage report has invalidated it. Reports that a feature is implemented, partly implemented, planned, experimental, failing, or untested should be written as notes, not used as checkbox substitutes.

**How to approve:** The owner may say, for example, **"I tested ASR-003 and EDIT-004; mark both complete."** An explicit owner instruction can authorize exactly those checkbox changes. If the owner later says **"ASR-003 is broken"**, return it to `[ ]` and document the problem.

### Implementation batch — available for YOUR review (2026-11-08)

**Owner-approved: 0 / 494.** The following changes have been added to the application code, but **NONE of their feature checkboxes have been marked complete**. Passing a test does not give an assistant permission to check any box. Some rows cover only part of a larger acceptance item.

| Review item | Implemented behavior to test manually | Related unchecked acceptance IDs | Limitation |
| --- | --- | --- | --- |
| R01 | New **Production Tools** tab with project summary and metadata warnings | IMP-020, REL-021 | Does not decode or inspect rendered video for faults |
| R02 | Named project-metadata snapshots, listing, restore after confirmation and delete | PRJ-010, PRJ-011 | Manual snapshots, not automatic periodic snapshots; source media not embedded |
| R03 | Timeline markers for chapter, note, review and to-do with labels and times | PRJ-019, EDIT-014 | No collaborative comments or advanced chapter card graphics |
| R04 | Marker pins on timeline ruler; click to jump to a timestamp | EDIT-014 | Time positions rely on the current timeline duration |
| R05 | Export timestamps for chapters as a text file | EDIT-014, CAP-015 | Timestamp text only, not rendered chapter cards |
| R06 | Search all imported source transcripts by word or contiguous phrase and jump to source range | ASR-020, PRJ-021 | Transcript search only, not natural-language visual understanding |
| R07 | Clip notes, saved along with the current project | PRJ-007, PRJ-019 | Notes apply to clips, not collaborative review threads |
| R08 | Trim the selected video clip to the playhead from the left or right | EDIT-005 | Playhead controls, not draggable edge handles |
| R09 | Move selected clip one place earlier or later in the sequence | EDIT-003 | Not a full ripple/roll/slip/slide editing system |
| R10 | One-frame backwards/forwards controls by project FPS | EDIT-016 | No J/K/L keyboard shuttle added in this batch |
| R11 | CSV cut sheet with source names, source/timeline times, speed, titles and notes | EXP-018, MC-026 | Not an EDL interchange file or a fully rendered export |
| R12 | Read-only JSON metadata audit and likely duplicate-name/size warnings | IMP-014, IMP-020, REL-021 | Does not establish content-level near-duplicates |
| R13 | New unit tests for audit, CSV safety, chapters, snapshots and transcript phrase matching | TEST-025 | Automated tests do not substitute for your browser acceptance |
| R14 | Cache-version update for the new module on supported GitHub Pages offline sessions | REL-020 | Offline model availability still depends on separate model caches |

**Where to find the new controls:** Open the site → **Production Tools**. Frame-step buttons are next to playback, while clip notes, trim, and move buttons are in **Editor** when a clip is selected.

**Owner review workflow:** Test an item, then tell me something like **"R03 and R05 work; you may approve the applicable feature IDs"**. I will only check a specific master feature ID if your approval clearly covers its full stated requirement. If you report an item broken, its related previously approved feature will be returned to unchecked and entered into the re-review log.

**Not part of this implementation batch:** full professional multitrack rendering, intelligent vision-based story editing, additional generative models, complete native codec support, or full real-world footage quality verification. Older app capabilities and claims are unaffected by this status report.

### Feature acceptance index

- [Workspace, navigation and accessibility](#1-workspace-navigation-and-accessibility) — UX (20 acceptance checks)
- [Projects, organization and versioning](#2-projects-organization-and-versioning) — PRJ (22 acceptance checks)
- [Import, formats and source inspection](#3-import-formats-and-source-inspection) — IMP (24 acceptance checks)
- [Media intelligence and universal search](#4-media-intelligence-and-universal-search) — IDX (23 acceptance checks)
- [Transcription and transcript editing](#5-transcription-and-transcript-editing) — ASR (26 acceptance checks)
- [Visual understanding and source evidence](#6-visual-understanding-and-source-evidence) — VIS (18 acceptance checks)
- [Multi-camera and multi-POV synchronization](#7-multi-camera-and-multi-pov-synchronization) — MC (27 acceptance checks)
- [AI Director: planning and execution](#8-ai-director-planning-and-execution) — DIR (29 acceptance checks)
- [AI quality control and source fidelity](#9-ai-quality-control-and-source-fidelity) — QA (20 acceptance checks)
- [Professional timeline and editing controls](#10-professional-timeline-and-editing-controls) — EDIT (27 acceptance checks)
- [Transitions, visual effects, and compositing](#11-transitions-visual-effects-and-compositing) — FX (24 acceptance checks)
- [Audio editing, mixing and restoration](#12-audio-editing-mixing-and-restoration) — AUD (24 acceptance checks)
- [Narration, dubbing, and voice generation](#13-narration-dubbing-and-voice-generation) — VO (16 acceptance checks)
- [Captions, subtitles and text-based graphics](#14-captions-subtitles-and-text-based-graphics) — CAP (21 acceptance checks)
- [Automatic reframing and aspect-ratio adaptation](#15-automatic-reframing-and-aspect-ratio-adaptation) — CROP (13 acceptance checks)
- [Short-form discovery and Content Factory](#16-short-form-discovery-and-content-factory) — SHORT (21 acceptance checks)
- [Generative media and responsible AI](#17-generative-media-and-responsible-ai) — GEN (12 acceptance checks)
- [Export, encoding, and delivery](#18-export-encoding-and-delivery) — EXP (26 acceptance checks)
- [Reliability, performance and resumability](#19-reliability-performance-and-resumability) — REL (25 acceptance checks)
- [Model, compute and cloud provider settings](#20-model-compute-and-cloud-provider-settings) — MODEL (20 acceptance checks)
- [Privacy, licensing and provenance](#21-privacy-licensing-and-provenance) — SEC (16 acceptance checks)
- [Test coverage, validation and quality gates](#22-test-coverage-validation-and-quality-gates) — TEST (25 acceptance checks)
- [Longer-term pro additions](#23-longer-term-pro-additions) — FUT (15 acceptance checks)

### 1. Workspace, navigation and accessibility

- [ ] **UX-001** Five connected workspaces: Quick Create, AI Director, Pro Editor, Multi-POV, and Content Factory
- [ ] **UX-002** Switch workspaces without losing the active project or timeline state
- [ ] **UX-003** Dark and light themes with readable, consistent visual hierarchy
- [ ] **UX-004** Resize, collapse, dock, undock, and reset editor panels
- [ ] **UX-005** Custom workspace layouts saved across sessions
- [ ] **UX-006** Media browser, source monitor, program monitor, inspector, Director, and timeline panels
- [ ] **UX-007** Global command palette for actions and media search
- [ ] **UX-008** Keyboard shortcut search, editing, customization, and export
- [ ] **UX-009** Undo/redo status visible in the main toolbar
- [ ] **UX-010** Full-screen and distraction-free playback modes
- [ ] **UX-011** Dual-monitor editing layouts where supported
- [ ] **UX-012** Small-screen and Chromebook-friendly adaptive layouts
- [ ] **UX-013** Touch and trackpad-friendly controls with precise pointer editing
- [ ] **UX-014** Accessible keyboard navigation and visible focus indicators
- [ ] **UX-015** Screen-reader names for important controls
- [ ] **UX-016** Adjustable UI scale and text size
- [ ] **UX-017** High-contrast mode and accessible color choices
- [ ] **UX-018** Reduced-motion option for animations
- [ ] **UX-019** Contextual help, tooltips, and searchable settings
- [ ] **UX-020** No inert buttons, simulated progress, or deceptive success messages

### 2. Projects, organization and versioning

- [ ] **PRJ-001** Create, rename, duplicate, archive, delete, and search projects
- [ ] **PRJ-002** Project dashboard with thumbnail, dates, duration, and analysis state
- [ ] **PRJ-003** Multiple timelines and sequences inside one project
- [ ] **PRJ-004** Timeline branching for alternate edits
- [ ] **PRJ-005** Project bins, nested folders, tags, favorites, filters, and sorting
- [ ] **PRJ-006** Save project settings independently of global defaults
- [ ] **PRJ-007** Persist all clip edits, tracks, markers, media references, and effects
- [ ] **PRJ-008** Keep original media immutable throughout editing
- [ ] **PRJ-009** Automatic project autosave after meaningful changes
- [ ] **PRJ-010** Periodic recovery snapshots with restore points
- [ ] **PRJ-011** Persistent undo history or saved version checkpoints
- [ ] **PRJ-012** Named versions and comparison between original, AI draft, and manual final
- [ ] **PRJ-013** Selective revert of individual AI changes
- [ ] **PRJ-014** Portable project export and import with optional source media
- [ ] **PRJ-015** Export editable timeline interchange data where supported (EDL/FCPXML/OTIO)
- [ ] **PRJ-016** Re-link missing media by identity, path, or verified metadata
- [ ] **PRJ-017** Show storage footprint for each project and cache category
- [ ] **PRJ-018** Project templates and reusable brand profiles
- [ ] **PRJ-019** Timestamp-anchored notes, comments, and review markers
- [ ] **PRJ-020** Optional collaboration, review links, and role permissions
- [ ] **PRJ-021** Project-wide search across clips, assets, transcripts, and comments
- [ ] **PRJ-022** Portable backup integrity check and restored-project verification

### 3. Import, formats and source inspection

- [ ] **IMP-001** Drag-and-drop import of multiple video, audio, and image files
- [ ] **IMP-002** Folder import and batch file selection where browser permissions allow
- [ ] **IMP-003** Compatibility detection for MP4, MOV, MKV, WebM, AVI, M4V, and TS
- [ ] **IMP-004** Compatible handling or conversion of H.264, H.265, VP9, AV1, and other available codecs
- [ ] **IMP-005** Audio import for WAV, MP3, M4A/AAC, FLAC, OGG, and Opus
- [ ] **IMP-006** Image import for JPG, PNG, WebP, GIF, SVG, TIFF, and supported RAW
- [ ] **IMP-007** Import existing SRT, VTT, ASS/SSA, TTML, TXT, and timestamped transcript data where supported
- [ ] **IMP-008** Import camera timecode and embedded media metadata where available
- [ ] **IMP-009** Read multiple audio tracks, channel layouts, and embedded subtitles
- [ ] **IMP-010** Identify resolution, pixel format, color space, HDR, frame rate, and variable frame rate
- [ ] **IMP-011** Warn about unsupported formats before attempting a large decode
- [ ] **IMP-012** Never silently substitute a different source or omit undecodable segments
- [ ] **IMP-013** Check media corruption, missing frames, silent tracks, and incomplete files
- [ ] **IMP-014** Find exact and near-duplicate media
- [ ] **IMP-015** Group recordings by recording time, name, camera, or matching event
- [ ] **IMP-016** Generate audio waveforms and seekable filmstrip thumbnails
- [ ] **IMP-017** Generate low-resolution proxies without altering original files
- [ ] **IMP-018** Allow source in/out selection before adding footage to timeline
- [ ] **IMP-019** Capture still frames from source material
- [ ] **IMP-020** Show source file properties and media health reports
- [ ] **IMP-021** Manual and automatic source re-linking after reopening a project
- [ ] **IMP-022** Random-access loading without decoding an entire long video into RAM
- [ ] **IMP-023** Preserve each source file's original timestamps and timebase
- [ ] **IMP-024** Optional ingest from supported recording devices and connected storage

### 4. Media intelligence and universal search

- [ ] **IDX-001** Build a searchable index of every imported source
- [ ] **IDX-002** Index shots and scene boundaries
- [ ] **IDX-003** Index transcript utterances and spoken keywords
- [ ] **IDX-004** Index distinct speakers and speaker corrections
- [ ] **IDX-005** Detect and index significant non-speech sound events
- [ ] **IDX-006** Detect and index faces, people, poses, and reactions where supported
- [ ] **IDX-007** Index visible objects, locations, actions, and screen text where supported
- [ ] **IDX-008** Extract and index camera movement and shot framing
- [ ] **IDX-009** Generate searchable visual and text embeddings
- [ ] **IDX-010** Connect visible events with corresponding audio and dialogue
- [ ] **IDX-011** Build event sequences rather than isolated keyword matches
- [ ] **IDX-012** Search source media with natural-language descriptions
- [ ] **IDX-013** Filter search by source file, speaker, date, duration, or event type
- [ ] **IDX-014** Return playable source thumbnails with precise timestamps
- [ ] **IDX-015** Display evidence and confidence for AI-identified events
- [ ] **IDX-016** Search for action followed by reaction or dialogue
- [ ] **IDX-017** Search for silence, black frames, clipping, or other defects
- [ ] **IDX-018** Find visually similar or repeated shots
- [ ] **IDX-019** Identify repeated content across multiple source files
- [ ] **IDX-020** Cache analyzed segments and skip unchanged content
- [ ] **IDX-021** Use coarse scanning followed by targeted high-detail inspection
- [ ] **IDX-022** Expose an editable hierarchical scene/event timeline
- [ ] **IDX-023** Export media index and evidence metadata as structured data

### 5. Transcription and transcript editing

- [ ] **ASR-001** Transcribe audio using a working on-device ASR engine
- [ ] **ASR-002** Support optional remote transcription with explicit media-upload consent
- [ ] **ASR-003** Choose model, language, quality level, and execution device
- [ ] **ASR-004** Show actual model download, load, and processing state
- [ ] **ASR-005** Support word-level timestamps when model capability permits
- [ ] **ASR-006** Clearly label approximate timestamps or plain/segment fallback
- [ ] **ASR-007** Preserve source timecodes throughout transcription and relinking
- [ ] **ASR-008** Transcribe long files in bounded, overlapping windows
- [ ] **ASR-009** Reconcile repeated words at chunk boundaries
- [ ] **ASR-010** Detect untranscribed opening, ending, and internal gaps
- [ ] **ASR-011** Show speech-coverage map including silence and uncertainty
- [ ] **ASR-012** Retry all failed or suspicious gaps without restarting completed work
- [ ] **ASR-013** Save incremental transcription checkpoints across sessions
- [ ] **ASR-014** Detect and display overlapping speech without discarding either speaker
- [ ] **ASR-015** Run speaker diarization using real supported models when configured
- [ ] **ASR-016** Manually name, merge, split, and correct speakers
- [ ] **ASR-017** Support speaker-count limits, confidence thresholds, and exceptions
- [ ] **ASR-018** Correct words without changing source video or edit decisions
- [ ] **ASR-019** Edit video from deliberate transcript selections as a separate action
- [ ] **ASR-020** Search, filter, replace, and jump to transcript phrases
- [ ] **ASR-021** Support manual transcription and imported subtitles when ASR fails
- [ ] **ASR-022** Custom vocabulary for names, slang, and technical terms
- [ ] **ASR-023** Side-by-side transcript, audio waveform, and preview playback
- [ ] **ASR-024** Caption timing proofing and transcript version history
- [ ] **ASR-025** Import/export SRT, VTT, TXT, and JSON transcripts
- [ ] **ASR-026** Flag uncertain words for review rather than fabricating certainty

### 6. Visual understanding and source evidence

- [ ] **VIS-001** Detect camera cuts and scene boundaries from decoded frames
- [ ] **VIS-002** Detect people and faces without falsely claiming reliable identity
- [ ] **VIS-003** Track visible subjects, objects, and motion across frames
- [ ] **VIS-004** Detect relevant visual actions from multiple supporting frames
- [ ] **VIS-005** Recognize scene text and HUD indicators with uncertainty flags
- [ ] **VIS-006** Distinguish visually observable actions from inferred outcomes
- [ ] **VIS-007** Identify frame quality issues, freeze frames, and black frames
- [ ] **VIS-008** Evaluate whether a source angle actually depicts claimed action
- [ ] **VIS-009** Connect action timestamps to corresponding original source frames
- [ ] **VIS-010** Show evidence thumbnails and original timestamps for AI conclusions
- [ ] **VIS-011** Allow user corrections to event labels and confidence
- [ ] **VIS-012** Respect custom minimum visual evidence requirements
- [ ] **VIS-013** Use detailed analysis around high-interest event windows
- [ ] **VIS-014** Avoid treating a single sampled image as proof of a complete event
- [ ] **VIS-015** Expose model limitations and decoder failures
- [ ] **VIS-016** Separate verified observations from AI hypotheses
- [ ] **VIS-017** Allow manual selection of visual analysis ranges
- [ ] **VIS-018** Reinspect contested source events at increased temporal sampling

### 7. Multi-camera and multi-POV synchronization

- [ ] **MC-001** Import and organize two or more independent camera/POV files
- [ ] **MC-002** Align sources using common dialogue and audio fingerprints
- [ ] **MC-003** Align sources using timecode or reliable metadata where available
- [ ] **MC-004** Align sources using game clocks, event logs, or visual event anchors where available
- [ ] **MC-005** Support user-created synchronization markers
- [ ] **MC-006** Show and correct sync offset and drift over long recordings
- [ ] **MC-007** Handle variable-frame-rate recordings and differing sample clocks
- [ ] **MC-008** Preserve master event time and individual source time mapping
- [ ] **MC-009** Display which source intervals overlap in original event time
- [ ] **MC-010** Limit expensive cross-POV comparison to verified overlap ranges
- [ ] **MC-011** Provide independent single-source analysis outside shared overlaps
- [ ] **MC-012** Identify events that genuinely appear in multiple recordings
- [ ] **MC-013** Flag uncertain or conflicting cross-source event matches
- [ ] **MC-014** Compare synchronized source monitors frame by frame
- [ ] **MC-015** Choose master dialogue/music/effects audio with manual overrides
- [ ] **MC-016** Avoid doubled dialogue, phase cancellation, and echo during POV switches
- [ ] **MC-017** Switch only when an angle adds relevant story or visual evidence
- [ ] **MC-018** Prioritize visible action over artificial alternating-camera patterns
- [ ] **MC-019** Maintain chronology and spatial continuity across edits
- [ ] **MC-020** Show setup, confrontation, action, reaction, and resolution for each event
- [ ] **MC-021** Keep gunfights/action sequences intact when relevant to the story
- [ ] **MC-022** Allow synchronized PiP, split screen, and reaction replay
- [ ] **MC-023** Offer smart angle-switch suggestions without forced automated cuts
- [ ] **MC-024** Allow manual source angle replacement without losing synchronization
- [ ] **MC-025** Detect unrelated camera shots and reject misleading switches
- [ ] **MC-026** Track source provenance for every selected camera interval
- [ ] **MC-027** Require user review when a meaningful event or outcome is uncertain

### 8. AI Director: planning and execution

- [ ] **DIR-001** Accept detailed natural-language creative briefs
- [ ] **DIR-002** Support comedy, gaming, action, documentary, interview, tutorial, podcast, trailer, and custom modes
- [ ] **DIR-003** Expose target audience, purpose, tone, and editing style controls
- [ ] **DIR-004** Set adaptive duration targets, hard limits, and story-completeness preference
- [ ] **DIR-005** Set automatic, target, and maximum number of desired outputs
- [ ] **DIR-006** Allow source, speaker, topic, and time-range exclusions
- [ ] **DIR-007** Allow locked clips and user-protected timeline sections
- [ ] **DIR-008** Identify story candidates from actual indexed evidence
- [ ] **DIR-009** Identify hook, setup, development, key moment, reaction, and payoff
- [ ] **DIR-010** Assemble complete coherent stories across distant source intervals
- [ ] **DIR-011** Preserve chronology unless explicitly approved to alter it
- [ ] **DIR-012** Avoid unrelated, fabricated, or repetitively recycled clips
- [ ] **DIR-013** Prefer quality over artificially meeting an output count
- [ ] **DIR-014** Show candidate board with quality notes and original-source links
- [ ] **DIR-015** Explain why each candidate is proposed or rejected
- [ ] **DIR-016** Support alternate hooks and multiple draft versions
- [ ] **DIR-017** Generate an edit plan with source-referenced clip ranges
- [ ] **DIR-018** Execute real timeline insert, split, trim, move, and replace operations
- [ ] **DIR-019** Add editable B-roll, captions, titles, and effects
- [ ] **DIR-020** Add audio and music only when selected or permitted
- [ ] **DIR-021** Preview proposed changes before irreversible actions
- [ ] **DIR-022** Review source-to-timeline evidence after executing edits
- [ ] **DIR-023** Prevent duplicate or unchanged AI output being presented as a new result
- [ ] **DIR-024** Avoid hardcoded sample stories, fixed timestamps, or placeholder videos
- [ ] **DIR-025** Allow a user to approve, reject, or revise each candidate
- [ ] **DIR-026** Retain manual overrides when AI Director runs again
- [ ] **DIR-027** Stop bounded revisions when further improvements are unproven
- [ ] **DIR-028** Save AI instructions, settings, and edit-rationale history
- [ ] **DIR-029** Support local, optional cloud, and hybrid analysis paths

### 9. AI quality control and source fidelity

- [ ] **QA-001** Separate measurable technical validation from subjective quality opinions
- [ ] **QA-002** Show explanations and evidence for each quality score
- [ ] **QA-003** Evaluate story clarity, setup, payoff, and completeness
- [ ] **QA-004** Detect missing context and misleading reordering
- [ ] **QA-005** Check visual relevance to spoken dialogue and claimed actions
- [ ] **QA-006** Check duplicate, recycled, and unrelated scene choices
- [ ] **QA-007** Check visible action and reaction timing
- [ ] **QA-008** Check abrupt audio cuts, dropped words, and bad crossfades
- [ ] **QA-009** Check silence, missing dialogue, clipping, and excessive peaks
- [ ] **QA-010** Detect black frames, frozen frames, and missing video
- [ ] **QA-011** Check subtitle accuracy, timing, readability, and safe areas
- [ ] **QA-012** Check cropped-off faces, subjects, gameplay HUD, and important text
- [ ] **QA-013** Check repeated or excessive transitions and visual effects
- [ ] **QA-014** Inspect rendered samples including opening and closing segments
- [ ] **QA-015** Link every identified issue to the exact timeline interval
- [ ] **QA-016** Allow accepting or dismissing individual proposed fixes
- [ ] **QA-017** Produce side-by-side before/after comparisons
- [ ] **QA-018** Never fabricate a score or claim guaranteed engagement
- [ ] **QA-019** Record verification results and unresolved issues with export
- [ ] **QA-020** Block misleading success states if verification did not actually run

### 10. Professional timeline and editing controls

- [ ] **EDIT-001** Support unlimited practical video/audio/title tracks within resource limits
- [ ] **EDIT-002** Show frame-accurate source/program timecodes
- [ ] **EDIT-003** Insert, overwrite, lift, extract, and reorder clips
- [ ] **EDIT-004** Split clips at playhead or selected positions
- [ ] **EDIT-005** Trim left/right edges with precise handles
- [ ] **EDIT-006** Ripple edit and automatic gap closure
- [ ] **EDIT-007** Roll edit at adjacent clip boundaries
- [ ] **EDIT-008** Slip edit while preserving timeline placement
- [ ] **EDIT-009** Slide edit while preserving surrounding total duration
- [ ] **EDIT-010** Move, duplicate, copy/paste, group, and ungroup clips
- [ ] **EDIT-011** Link and unlink video with associated audio
- [ ] **EDIT-012** Lock, hide, mute, solo, rename, and reorder tracks
- [ ] **EDIT-013** Snapping to frames, clip edges, markers, words, and music beats
- [ ] **EDIT-014** Editable markers, chapter points, and annotations
- [ ] **EDIT-015** Adjustable zoom, track height, filmstrips, and waveform density
- [ ] **EDIT-016** Keyboard shuttle playback and frame-step editing
- [ ] **EDIT-017** Source in/out markers and source patching
- [ ] **EDIT-018** Variable-speed playback, reverse, freeze frames, and speed ramps
- [ ] **EDIT-019** Trim dead air without truncating meaningful reactions
- [ ] **EDIT-020** Nested sequences and compound clips
- [ ] **EDIT-021** Adjustment layers and reusable effect stacks
- [ ] **EDIT-022** Real-time or optimized proxy playback where supported
- [ ] **EDIT-023** Manual and automatic camera selection on synchronized tracks
- [ ] **EDIT-024** Multi-select, clipboard actions, and robust undo/redo
- [ ] **EDIT-025** Editable keyframes with Bézier/easing graph curves
- [ ] **EDIT-026** Preview render caching for expensive effects
- [ ] **EDIT-027** Non-destructive AI adjustments exposed as regular editable controls

### 11. Transitions, visual effects, and compositing

- [ ] **FX-001** Clean cuts and standard audio/video crossfades
- [ ] **FX-002** Fade, dissolve, wipe, push, slide, zoom, spin, and whip-pan transitions
- [ ] **FX-003** Transition duration, alignment, direction, easing, and intensity controls
- [ ] **FX-004** Apply transitions without unexpectedly shortening source context
- [ ] **FX-005** Position, scale, rotation, anchor, crop, skew, and perspective
- [ ] **FX-006** Stabilization, horizon correction, and motion blur
- [ ] **FX-007** Speed interpolation and optical-flow slow motion where supported
- [ ] **FX-008** Keyframed pan, zoom, and subject-following camera motion
- [ ] **FX-009** Brightness, exposure, contrast, highlights, shadows, temperature, and tint
- [ ] **FX-010** Saturation, vibrance, curves, hue controls, and color wheels
- [ ] **FX-011** Import and apply LUTs with correct color-space handling
- [ ] **FX-012** Match grading between cameras and source segments
- [ ] **FX-013** Support SDR and validated HDR workflows where engines permit
- [ ] **FX-014** Sharpen, denoise, deflicker, blur, glow, grain, and vignette
- [ ] **FX-015** Stylized VHS, glitch, chromatic aberration, and light leak effects
- [ ] **FX-016** Opacity, blend modes, masks, and feathering
- [ ] **FX-017** Chroma key and green-screen compositing
- [ ] **FX-018** AI background segmentation and optional replacement
- [ ] **FX-019** Object/face tracking for effect attachment
- [ ] **FX-020** Picture-in-picture and multi-panel split-screen layouts
- [ ] **FX-021** Tracked text overlays and motion graphics
- [ ] **FX-022** Editable effect presets, strength, and parameter keyframes
- [ ] **FX-023** Optional advanced node-based compositor
- [ ] **FX-024** Warn when an effect cannot be rendered in the selected backend

### 12. Audio editing, mixing and restoration

- [ ] **AUD-001** Waveform-based audio clip editing and fades
- [ ] **AUD-002** Independent dialogue, music, effects, ambience, and narration tracks
- [ ] **AUD-003** Audio meters and peak-hold monitoring
- [ ] **AUD-004** Volume and stereo pan automation with keyframes
- [ ] **AUD-005** Audio buses, submixes, and configurable channel routing
- [ ] **AUD-006** Noise reduction and voice isolation
- [ ] **AUD-007** De-echo and reverb reduction where supported
- [ ] **AUD-008** Equalizer with manual bands and presets
- [ ] **AUD-009** Compressor, limiter, gate, expander, and de-esser
- [ ] **AUD-010** Spectral repair of selected audio defects where supported
- [ ] **AUD-011** Loudness measurement and LUFS normalization
- [ ] **AUD-012** True-peak limiting and clipping warnings
- [ ] **AUD-013** Music auto-ducking with adjustable threshold, attack, and release
- [ ] **AUD-014** Manual overrides for ducking and music levels
- [ ] **AUD-015** Crossfades and room-tone preservation across dialogue cuts
- [ ] **AUD-016** Synchronize external audio to video with offset/drift correction
- [ ] **AUD-017** Handle multiple source audio tracks without losing the intended channel
- [ ] **AUD-018** Avoid duplicated or conflicting audio during multicam switches
- [ ] **AUD-019** Detect silence, clipping, truncated words, and unexpected dropouts
- [ ] **AUD-020** Source separation into vocals/music/effects where supported
- [ ] **AUD-021** Music beat, phrase, and section markers for edit suggestions
- [ ] **AUD-022** Profanity masking and clean-audio alternative export
- [ ] **AUD-023** Mono, stereo, and multichannel output where supported
- [ ] **AUD-024** Preserve original source audio for reversible editing

### 13. Narration, dubbing, and voice generation

- [ ] **VO-001** Record microphone narration into editable timeline tracks
- [ ] **VO-002** Playback and monitor a recorded narration take
- [ ] **VO-003** Generate TTS voiceover only through a real working engine
- [ ] **VO-004** Choose voice, language, pitch, rate, pauses, and emphasis
- [ ] **VO-005** Preview voice before committing generated audio to the timeline
- [ ] **VO-006** Replace or regenerate individual narration sentences
- [ ] **VO-007** Preserve completed voice segments if later generation fails
- [ ] **VO-008** Generate scripts based on source content with factual review
- [ ] **VO-009** Align narration timing to scenes and captions
- [ ] **VO-010** Use narration to bridge authentic context, not invent events
- [ ] **VO-011** Supported translation and dubbing workflows
- [ ] **VO-012** Clearly distinguish synthetic speech from genuine source dialogue
- [ ] **VO-013** Require authorization before personal voice cloning
- [ ] **VO-014** Show model load, progress, and generation errors
- [ ] **VO-015** Automatic music ducking during narration
- [ ] **VO-016** Support optional low-latency chunk preview where engine permits

### 14. Captions, subtitles and text-based graphics

- [ ] **CAP-001** Editable dedicated caption tracks and caption regions
- [ ] **CAP-002** Auto-generate subtitle segments from verified transcript timing
- [ ] **CAP-003** Word, phrase, sentence, karaoke, and highlighted-word modes
- [ ] **CAP-004** Manual caption timing, splitting, merging, and retiming
- [ ] **CAP-005** Multiple languages and separate caption variants
- [ ] **CAP-006** Per-speaker caption styles and colors
- [ ] **CAP-007** Custom fonts, sizes, colors, outlines, shadows, backgrounds, and gradients
- [ ] **CAP-008** Animate captions with editable timing and keyframes
- [ ] **CAP-009** Set character, line, and reading-speed limits
- [ ] **CAP-010** Auto-adjust captions away from faces, HUD, and important objects
- [ ] **CAP-011** Preview platform safe areas and text contrast
- [ ] **CAP-012** Caption proofreading, punctuation, and speaker labels
- [ ] **CAP-013** Burn captions into final video
- [ ] **CAP-014** Export SRT and VTT, with supported embedded text tracks
- [ ] **CAP-015** Custom titles, lower thirds, chapter cards, and credits
- [ ] **CAP-016** Shapes, arrows, callouts, focus rings, and diagrams
- [ ] **CAP-017** Logo, watermark, and reusable branding overlay
- [ ] **CAP-018** Animated intros, outros, countdowns, and progress bars
- [ ] **CAP-019** Motion-track graphics to people or objects
- [ ] **CAP-020** Optional word-level censor sound and subtitle treatment
- [ ] **CAP-021** Graphic element templates that remain editable

### 15. Automatic reframing and aspect-ratio adaptation

- [ ] **CROP-001** Set project and delivery aspect ratios independently
- [ ] **CROP-002** Support 16:9, 9:16, 1:1, 4:5, ultrawide, and custom sizes
- [ ] **CROP-003** Detect relevant subjects and points of interest for reframing
- [ ] **CROP-004** Track moving subjects across the entire selected shot
- [ ] **CROP-005** Switch crop priorities when action changes
- [ ] **CROP-006** Keep visible faces, captions, gameplay elements, and important text
- [ ] **CROP-007** Allow user-defined safe margins and target positions
- [ ] **CROP-008** Use split screen when two important subjects cannot share one crop
- [ ] **CROP-009** Keyframe and ease crop motion between positions
- [ ] **CROP-010** Preview source-to-output crop side by side
- [ ] **CROP-011** Provide manual focus point and tracking correction controls
- [ ] **CROP-012** Generate independent reframing variants per output target
- [ ] **CROP-013** Flag unsatisfactory or untrackable automatic crops

### 16. Short-form discovery and Content Factory

- [ ] **SHORT-001** Identify comedy, action, learning, insights, interview, podcast, and gaming highlights
- [ ] **SHORT-002** Require setup and payoff when generating story-based clips
- [ ] **SHORT-003** Allow natural clip length when the complete story requires it
- [ ] **SHORT-004** Search distant source segments when meaningfully connected
- [ ] **SHORT-005** Preserve contextual reactions and relevant action footage
- [ ] **SHORT-006** Generate several candidates only when distinct valid stories exist
- [ ] **SHORT-007** Detect duplicate stories across proposed outputs
- [ ] **SHORT-008** Minimize needless reuse of identical source ranges
- [ ] **SHORT-009** Rank candidates with evidence and transparent rationale
- [ ] **SHORT-010** Allow manual selection, deletion, and revision of candidates
- [ ] **SHORT-011** Produce editable individual timelines per candidate
- [ ] **SHORT-012** Create long-form compilations of approved stories
- [ ] **SHORT-013** Generate horizontal, vertical, square, and feed variants
- [ ] **SHORT-014** Generate teaser and trailer versions from the same project
- [ ] **SHORT-015** Apply optional brand profiles consistently across variants
- [ ] **SHORT-016** Batch produce captions and language variants
- [ ] **SHORT-017** Create draft titles, descriptions, chapters, hashtags, and thumbnails
- [ ] **SHORT-018** Offer thumbnail selection and template-based design
- [ ] **SHORT-019** Maintain an output inventory showing rendered/not-rendered state
- [ ] **SHORT-020** Flag outputs that use unlicensed or restricted media
- [ ] **SHORT-021** Optional publication/scheduling integration with explicit authorization

### 17. Generative media and responsible AI

- [ ] **GEN-001** Optional generated B-roll and illustrative visual assets
- [ ] **GEN-002** Optional AI-assisted images and thumbnails
- [ ] **GEN-003** Optional generated backgrounds and scene cards
- [ ] **GEN-004** Optional AI sound effects and music subject to licensing
- [ ] **GEN-005** Optional shot extension, inpainting, and object removal
- [ ] **GEN-006** Optional animated diagrams and visualization assets
- [ ] **GEN-007** Optional AI video/style transformations with realistic capability disclosure
- [ ] **GEN-008** Label generated content separately from original footage
- [ ] **GEN-009** Keep source media intact and reversible
- [ ] **GEN-010** Never substitute synthetic scenes for real-world evidence without disclosure
- [ ] **GEN-011** Keep generative costs, limits, and provenance visible
- [ ] **GEN-012** Require approval before generated material enters evidence-sensitive edits

### 18. Export, encoding, and delivery

- [ ] **EXP-001** Browser-compatible preview export for short jobs
- [ ] **EXP-002** Production-quality deterministic rendering through supported native backend
- [ ] **EXP-003** Encode MP4/H.264/AAC where supported
- [ ] **EXP-004** Encode H.265, AV1, VP9, or professional intermediates where available
- [ ] **EXP-005** Export WebM and supported image/animation formats
- [ ] **EXP-006** Export audio-only WAV, MP3, FLAC, or supported alternatives
- [ ] **EXP-007** Export still frames and image sequences
- [ ] **EXP-008** Offer 480p, 720p, 1080p, 1440p, 4K, and custom resolution
- [ ] **EXP-009** Offer common and source-matched frame rates including fractional FPS
- [ ] **EXP-010** Set CBR/VBR/quality-based bitrate and supported codec options
- [ ] **EXP-011** Select SDR/HDR color profile and supported bit depth
- [ ] **EXP-012** Choose hardware or software encoder, with real capability testing
- [ ] **EXP-013** Control audio codec, channel layout, bitrate, and sample rate
- [ ] **EXP-014** Burn captions, export sidecar captions, or embed supported caption tracks
- [ ] **EXP-015** Export full timeline, in/out range, or selected clips
- [ ] **EXP-016** Export batch variants by platform, aspect, language, and quality
- [ ] **EXP-017** Preview expected output settings, size estimates, and unsupported features
- [ ] **EXP-018** Provide destination naming templates and project metadata
- [ ] **EXP-019** Show frame-based progress, actual errors, and render logs
- [ ] **EXP-020** Allow queueing, cancellation, and resume where backend supports it
- [ ] **EXP-021** Verify output exists, decodes, and has correct duration and streams
- [ ] **EXP-022** Inspect final rendered audio sync, captions, black frames, and clipping
- [ ] **EXP-023** Never report export success based solely on progress reaching 100%
- [ ] **EXP-024** Preserve completed output files if a later batch item fails
- [ ] **EXP-025** Download output with reliable filename and format extension
- [ ] **EXP-026** Package project and linked source metadata for portable archiving

### 19. Reliability, performance and resumability

- [ ] **REL-001** Use bounded streaming reads for multi-hour recordings
- [ ] **REL-002** Avoid decoding complete long-form media into JS heap at once
- [ ] **REL-003** Chunked transcription, waveform, visual, and export jobs
- [ ] **REL-004** Save granular checkpoints after completed processing chunks
- [ ] **REL-005** Resume safely after browser reload or server restart when persistent backend exists
- [ ] **REL-006** Distinguish resumed processing from continuously running background work
- [ ] **REL-007** Keep completed intermediate results after a later-stage error
- [ ] **REL-008** Retry only failed intervals with bounded exponential backoff
- [ ] **REL-009** Validate each checkpoint and its source/media identity before reuse
- [ ] **REL-010** Provide clear queued, running, paused, complete, warning, failed states
- [ ] **REL-011** Show actual current processing file, time range, model, and throughput
- [ ] **REL-012** Offer ETA only when grounded in observed performance
- [ ] **REL-013** Limit memory, worker count, model concurrency, and cache usage
- [ ] **REL-014** Detect GPU device loss and recover with supported fallback or clear failure
- [ ] **REL-015** Handle model initialization and unsupported backend errors explicitly
- [ ] **REL-016** Never silently replace requested AI behavior with unrelated output
- [ ] **REL-017** Detect storage quota and pause before potentially losing work
- [ ] **REL-018** Cache model downloads and verified analysis across sessions when storage permits
- [ ] **REL-019** User-controlled cache cleanup without deleting important projects
- [ ] **REL-020** Support offline UI and eligible locally cached functionality
- [ ] **REL-021** Offer logs, diagnostics export, and environment capability report
- [ ] **REL-022** Verify saved projects reopen with correct edits and source references
- [ ] **REL-023** Never fabricate task completion when a worker exits unexpectedly
- [ ] **REL-024** Keep working manual editor usable while AI services fail
- [ ] **REL-025** Prevent run-away batch work and unbounded retries

### 20. Model, compute and cloud provider settings

- [ ] **MODEL-001** Select local-only, hybrid, or authorized cloud processing per project
- [ ] **MODEL-002** Separate models by ASR, diarization, vision, embeddings, Director, audio, and generation
- [ ] **MODEL-003** Install/select compatible on-device models when available
- [ ] **MODEL-004** Select CPU, WebGPU, WASM, or remote execution when supported
- [ ] **MODEL-005** Expose actual model names, versions, download sizes, and compatibility
- [ ] **MODEL-006** Verify model loads and produces expected output on a test clip
- [ ] **MODEL-007** Offer downloadable or cached local models where practical
- [ ] **MODEL-008** Select processing quality, visual sample rate, chunk sizes, and concurrency
- [ ] **MODEL-009** Configure timeouts, context, inference limits, and retry policy
- [ ] **MODEL-010** Allow bring-your-own-provider API keys with secure handling guidance
- [ ] **MODEL-011** Never embed application-owner secret keys in public front-end code
- [ ] **MODEL-012** Require permission before sending media or transcripts to external providers
- [ ] **MODEL-013** Show exact provider/service used for each processing stage
- [ ] **MODEL-014** Estimate external inference costs before starting heavy jobs
- [ ] **MODEL-015** Show per-job model usage, tokens where applicable, and cost estimates
- [ ] **MODEL-016** Set per-job and monthly external spending caps
- [ ] **MODEL-017** Reuse completed model output to avoid paying for duplicate analysis
- [ ] **MODEL-018** Allow model/provider fallback only when disclosed and approved
- [ ] **MODEL-019** Persist nonsecret model preferences across projects
- [ ] **MODEL-020** Provide local model diagnostic and performance benchmarking page

### 21. Privacy, licensing and provenance

- [ ] **SEC-001** Make cloud media upload opt-in and clearly labeled
- [ ] **SEC-002** Show which files, frames, audio chunks, or transcripts leave the device
- [ ] **SEC-003** Require explicit permission for voice or likeness cloning
- [ ] **SEC-004** Allow provider credentials to be removed
- [ ] **SEC-005** Preserve original file/source attribution and timestamp provenance
- [ ] **SEC-006** Indicate when clips, narration, captions, or images are AI-generated
- [ ] **SEC-007** Warn about misleading real-world event reconstructions
- [ ] **SEC-008** Record rights/licensing information for third-party music and assets
- [ ] **SEC-009** Avoid bundling unlicensed music or copyrighted media
- [ ] **SEC-010** Support local project deletion and cache/data cleanup
- [ ] **SEC-011** Provide optional accountless local workflows
- [ ] **SEC-012** Validate imported files and disallow unsafe path traversal in bundles
- [ ] **SEC-013** Avoid exposing API tokens in logs or exported project files
- [ ] **SEC-014** Explain browser storage limitations and data-loss risks
- [ ] **SEC-015** Require explicit authorization for publishing or externally sharing projects
- [ ] **SEC-016** Support per-project disclosure and authenticity metadata

### 22. Test coverage, validation and quality gates

- [ ] **TEST-001** Test basic import/playback/trim/export without any AI service
- [ ] **TEST-002** Test two-hour and three-hour video sources without unbounded memory growth
- [ ] **TEST-003** Test simultaneous large sources and independent audio tracks
- [ ] **TEST-004** Test variable-frame-rate time mapping and A/V synchronization
- [ ] **TEST-005** Test transcription includes recording start and end
- [ ] **TEST-006** Test gaps, low-volume segments, and overlapping speaker recognition
- [ ] **TEST-007** Test source SRT relinking preserves correct timestamps
- [ ] **TEST-008** Test true multi-POV overlap alignment and drift correction
- [ ] **TEST-009** Test event matching rejects unrelated camera footage
- [ ] **TEST-010** Test story assembly contains the actual action and relevant reaction
- [ ] **TEST-011** Test candidate count cannot force filler or duplicate stories
- [ ] **TEST-012** Test selected creative brief materially changes the edited result
- [ ] **TEST-013** Test manual cuts survive later AI Director operations
- [ ] **TEST-014** Test effects, subtitles, and audio export match preview
- [ ] **TEST-015** Test browser refresh recovers saved timeline and progress
- [ ] **TEST-016** Test GPU/model/provider failure preserves existing work
- [ ] **TEST-017** Test media source moved/relinked and resumed without corruption
- [ ] **TEST-018** Test cloud API failure reports error and does not fake success
- [ ] **TEST-019** Test empty/no-match analysis yields truthful no-results state
- [ ] **TEST-020** Test export validity after cancellation, retries, and batch partial failure
- [ ] **TEST-021** Test final output audio/video is playable and duration is accurate
- [ ] **TEST-022** Test keyboard accessibility and smaller screen layout
- [ ] **TEST-023** Test different output ratios keep faces, HUD, and text in frame
- [ ] **TEST-024** Test no checked acceptance item can be added without owner's explicit approval
- [ ] **TEST-025** Test regression cases for all previously reported broken features

### 23. Longer-term pro additions

- [ ] **FUT-001** Optional desktop Windows/macOS/Linux companion
- [ ] **FUT-002** Optional persistent GPU worker service for heavy video analysis
- [ ] **FUT-003** Real-time screen, microphone, and webcam capture
- [ ] **FUT-004** OBS or supported live capture integration
- [ ] **FUT-005** Multichannel/surround audio mixing and monitoring
- [ ] **FUT-006** Professional HDR finishing and color-managed mastering
- [ ] **FUT-007** Advanced rotoscoping and tracking tools
- [ ] **FUT-008** Collaborative real-time editing and reviewer permissions
- [ ] **FUT-009** Cloud library and cross-device synchronization when authorized
- [ ] **FUT-010** Native effects/transitions/AI-model plugin extension API
- [ ] **FUT-011** User-manageable template and asset marketplace or library
- [ ] **FUT-012** Professional motion tracking and 3D compositing tools
- [ ] **FUT-013** Immersive/360 video editing where supported
- [ ] **FUT-014** Automated but explicitly authorized publishing and scheduling
- [ ] **FUT-015** Advanced project analytics based on actual export/feedback data

### Open problems / re-review log

Report any feature as broken using its stable ID. A report goes here **and the item stays or becomes unchecked**. Do not remove an entry merely because code was changed; close the report only after the owner explicitly accepts the repaired feature.

| Feature ID | Owner-reported problem | Reported date | Engineering notes / attempted fix | Owner re-approved? |
| --- | --- | --- | --- | --- |
| _None recorded against this new checklist yet_ | _Add reported problems here_ | — | — | No |

### Acceptance change record

Every transition from `[ ]` to `[x]` must identify a specific, explicit owner-approval message. Record date, feature IDs, what was approved, and the approval reference/quote. Never invent approvals.

| Date | Feature ID(s) | Owner's explicit acceptance | Notes |
| --- | --- | --- | --- |
| _No owner approvals recorded at checklist creation_ | — | — | All 494 items start unchecked |

---

## Visually reviewed multi-POV fights (v0.9.0)

1. Import/relink both original videos and their original-timestamp SRTs. **Match POVs by shared spoken phrases**, then verify the alignment at the start and end of the shared recording.
2. In AI Director, choose **Remote language-model Director** and supply your own DeepSeek API key. Multi-POV generation calls the **vision-capable `deepseek-flash` model** regardless of the optional text-Director model value. Contact-sheet JPEG frames are sent to DeepSeek and billed according to your API plan. They are NOT uploaded to GitHub.
3. Generate. The local audio/motion signals scan **only the synchronized overlapping original source times**, not the extra nine hours of a longer stream. They locate possible encounter windows; they do NOT make the finished cuts.
4. The vision reviewer inspects up to twelve decoded frames from **each** camera at matching reference-clock timestamps for each selected encounter. It must cite visible combat-action evidence in multiple frames across the same event, from both cameras. No source image evidence means **no generated story**, not a generic montage.
5. **New cuts are constructed from approved frame timestamps**, not recycled from the prior algorithmic segments. They preserve chronological shared-match time, switch only at evidence-backed camera frames, and leave the original media intact. Past unreviewed montage cards are hidden in Director (retained in the project for non-destructive migration).

**Important limitation:** The visual model sees sampled frames, not every frame of the video. It can miss brief muzzle flashes, misread small HUD labels or mistake gameplay effects for damage. An image cannot by itself verify a continuous gunfight, shot/kill ownership, or completed teammate rescue; review the entire source clip before publishing. If the model or browser decoder fails, the application reports the failure instead of falling back to the previous keyword-only montage. Multi-POV visual verification requires a working remote DeepSeek API connection and incurs API usage. Raw one-camera scouting remains available independently.

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
