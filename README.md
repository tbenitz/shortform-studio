# ShortForm Studio

**Local-first, browser-based video editor** with transcript editing, local Whisper transcription, AI Director clip proposals, nonlinear story assembly, captions, multitrack audio, mic narration recording, and real-time export. Built as a static HTML/CSS/JS progressive web application. No account, build step, or database server required.

> **Project status: functional alpha.** This is a real editor foundation with working workflows, not a promise that every professional production feature has been implemented. Please read the [Feature status](#feature-status-and-expectations) and [Limitations](#practical-limitations-and-constraints) sections before using it for important content.

## Read this first — what can I actually test?

**Live application:** [Open ShortForm Studio](https://tbenitz.github.io/shortform-studio/) · [See recent GitHub test results](https://github.com/tbenitz/shortform-studio/actions)

**Choose the right section:**
- [Original 14 review items (R01–R14)](#implementation-batch--available-for-your-review-2026-11-08) — new controls from the latest code batch.
- [Newest feature review (R15–R25)](#new-implementation-review-r15r25-favorites-mp4-and-recoverable-projects) — favorites, MP4 output, fresh startup and media reconnection.
- [Humor, compilation and cropping review (R26–R40)](#new-implementation-review-r26r40-humor-compilations-and-cropping) — what to click and how to approve.
- [All 40 prioritized future updates](#full-future-update-tracking-queue-next-001next-040) — planned items, plus every existing master requirement.
- [Simple humor UI and MP4 recovery checks (R41–R46)](#new-implementation-review-r41r46-simple-humor-ai-and-mp4-recovery) — two-mode humor workflow and encoder deployment fix.
- [Exact click-by-click tests for R01–R14](#hands-on-walkthroughs-for-r01r14) — what to click, how to know it worked, and what to report.
- [Plain-English video editing and AI glossary](#plain-english-glossary--video-and-ai-terms) — explains the unfamiliar words.
- [All 494 desired product features](#feature-acceptance-index) — each has its own test instructions, **but many are planned, not available**.
- [Open problems / re-review log](#open-problems--re-review-log) — features you reported broken.
- [Your approvals](#acceptance-change-record) — a record of exactly what you personally approved.

### Where features currently appear in the app

| Existing interface area | What to look for in the current code | Important distinction |
| --- | --- | --- |
| **Media** | Import videos/audio/images, choose original source ranges, relink files, inspect source video, run face/scene scans | A visible import control does not mean every video codec works. |
| **Transcript** | Import SRT/VTT, local Whisper, caption timing, speaker labels and gap retry | Real ASR correctness and word timing still need testing on your footage. |
| **AI Director** | Story briefs, candidate discovery, multi-POV matching and optional remote model processing | Story coherence, GPU/vision availability and source accuracy are **not guaranteed**. |
| **Editor** | Choose clips, split, trim, reorder, set pan/zoom, titles and narration | This is **not** a complete professional multitrack NLE. |
| **Export** | Browser render, captions and cut-list/project JSON; optional separate FFmpeg renderer | Preview/export parity and codec support still need real-file verification. |
| **Production Tools** | New R01–R14 tools: metadata dashboard, snapshots, markers, transcript search, reports and clip controls | This is a production utility panel, **not** a video vision analyzer or final-render QA engine. |
| **Settings** | Aspect, captions, audio, transcription, AI and browser storage preferences | A setting should be tested end to end before you approve a corresponding master requirement. |

**Likely not present as full standalone tools yet:** Quick Create as a distinct workspace, Content Factory as a full batch-production workspace, desktop companion, professional multi-track node compositor, advanced collaborative editing, generative video/B-roll suite, and universal codec converter. Do **not** search the current site for these as if they were already completed.

**Important distinction:** “Control present in the app” means you can try it; it is **not** an owner acceptance, a guarantee of correct output, or proof that all parts of a 494-item master requirement are finished.

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

**Release-specific acceptance checklist — 0 / 14 owner-approved.** These narrow items can be approved individually without prematurely checking the broader 494-item product requirements. Only you can mark them complete; reporting a regression returns them to unchecked.

- [ ] **R01** Production Tools dashboard and metadata summary
- [ ] **R02** Save, restore, and delete named project metadata snapshots
- [ ] **R03** Create, edit, and remove typed timeline markers
- [ ] **R04** Click timeline marker pins to jump to their time
- [ ] **R05** Export chapter marker timestamps as text
- [ ] **R06** Search source transcript words and phrases, and jump to source ranges
- [ ] **R07** Save private notes attached to timeline clips
- [ ] **R08** Trim selected clip from left/right to current playhead
- [ ] **R09** Move selected clip earlier/later with editor controls
- [ ] **R10** Step backward/forward one project frame with transport buttons
- [ ] **R11** Export a source-referenced cut sheet as CSV
- [ ] **R12** Download a project metadata health audit as JSON
- [ ] **R13** Execute automated tests covering production tool helpers
- [ ] **R14** Cache the new module for supported offline reopening

**Where to find the new controls:** Open the site → **Production Tools**. Frame-step buttons are next to playback, while clip notes, trim, and move buttons are in **Editor** when a clip is selected.

**Owner review workflow:** Test an item, then tell me something like **"R03 and R05 work; you may approve the applicable feature IDs"**. I will only check a specific master feature ID if your approval clearly covers its full stated requirement. If you report an item broken, its related previously approved feature will be returned to unchecked and entered into the re-review log.

**Not part of this implementation batch:** full professional multitrack rendering, intelligent vision-based story editing, additional generative models, complete native codec support, or full real-world footage quality verification. Older app capabilities and claims are unaffected by this status report.

### Start here: how to test without getting overwhelmed

**You do NOT need to test all 494 features.** The 494-item master list describes the *desired finished product*; many entries are future features or only partly implemented. Start with **R01–R14**, which refer to the latest batch of code changes. The 494 boxes are not a claim that the corresponding controls already exist.

**Use a disposable test project**, not an important ongoing edit. Open [ShortForm Studio](https://tbenitz.github.io/shortform-studio/) in Chrome, import a **short playable MP4 with audio and noticeable motion** (30–90 seconds works well), and let it appear in the timeline. If the preview cannot decode your file, try another compatible H.264/AAC MP4; report the decode error rather than approving a feature you couldn't verify. Use **Save** before deliberate edits.

**How to report results:** You can say `R03 works; R06 fails when I click a search result; R08 needs improvement`. An item is checked only when you explicitly approve that item. A broken or missing control remains unchecked and is added to the re-review log. If a test is impossible with your equipment or media, simply say **not tested**.

**Finding the controls:** **Production Tools** is a tab along the top next to Editor/Settings. The **Editor** inspector appears on the right after you select a timeline clip. **Frame** buttons are in the central video playback row. If you cannot find a control described below, the test is **failed/not available**, not approved.

### Hands-on walkthroughs for R01–R14

<details open>
<summary><strong>R01 — Production Tools dashboard and project health</strong></summary>

**What it means:** A project information screen that summarizes your imported files, timeline clips, audio overlays, transcript words, markers, and possible issues. It does **not** watch and judge the final video.

**How to test:**
1. Import one short video and confirm it appears on the timeline.
2. Open **Production Tools**.
3. Compare **Sources**, **Video cuts**, and the other summary numbers to what is actually in your project.
4. Add another excerpt, return to Production Tools, and confirm the clip count increases.
5. Read the **Project health checks** area. It should accurately describe metadata issues, if any.

**Approve R01 only if:** The tab loads, counts update as edits change, and it does not falsely claim that media has been fully analyzed or rendered.

**Report a problem if:** The tab is blank, the counts are wrong, or selecting it crashes the editor.

</details>

<details>
<summary><strong>R02 — Save, restore, and delete named project snapshots</strong></summary>

**What it means:** Save a named copy of your **project editing instructions** (clips, trim settings, transcript, markers, etc.) in browser storage so you can return to that point. This is a **manual snapshot**, not a video export, and it does **not** package the original media files.

**How to test:**
1. In Production Tools, enter a snapshot name such as `Before Test`, then click **Save named snapshot**.
2. Change the timeline by splitting or removing a test clip. Verify the change is visible.
3. In Production Tools, find `Before Test` and click **Restore**. Confirm the prompt.
4. Verify your original clip layout and settings return.
5. Refresh the page, reopen Production Tools, and check whether `Before Test` is still listed.
6. Click **Delete** on that snapshot and verify it disappears.

**Approve R02 only if:** Snapshot creation, restore, persistence across reloads, and deletion all work. Media may need relinking after reload; a snapshot preserves metadata only.

**Report a problem if:** Restore loads the wrong clips, changes are not restored, or a stored snapshot vanishes unexpectedly.

</details>

<details>
<summary><strong>R03 — Create, edit, and delete timeline markers</strong></summary>

**What it means:** Labels attached to a moment in the edited video. A **Chapter** identifies a section; **Note**, **Review**, and **To do** identify points to revisit. None of these edits the footage itself.

**How to test:**
1. Seek to about 10 seconds in a test video.
2. Open Production Tools. Enter `Opening moment` and choose **Chapter**, then **Add at playhead**.
3. Find that marker in the list, rename it `Opening scene`, and click **Save**.
4. Change its type to **Review** or **To do** and save again.
5. Save/reload the project and verify the label, type, and time remain.
6. Remove the marker, confirm the prompt, and verify it disappears.

**Approve R03 only if:** Adding, editing, saving, loading, and removing markers behave correctly.

</details>

<details>
<summary><strong>R04 — Click marker pins on the timeline to jump</strong></summary>

**What it means:** The colored marks above the timeline show exactly where you placed a Chapter, Note, Review, or To-do marker.

**How to test:** Add two markers at clearly different times (for example, 5 and 20 seconds). Look along the **timeline ruler** for the corresponding colored marker pins. Click each pin and observe the playback position.

**Approve R04 only if:** Clicking each pin jumps to the right moment, even after saving and reopening the project.

**Report a problem if:** Pins overlap incorrectly, do not appear, or clicking them seeks to the wrong time.

</details>

<details>
<summary><strong>R05 — Export chapter timestamps as text</strong></summary>

**What it means:** Create a downloadable text list like `0:00:00 Opening` and `0:00:25 Next scene` that can be used for YouTube descriptions. It does **not** add animated chapter title cards to the video.

**How to test:** Create two markers of type **Chapter** at different times. Also add a **Note** marker to distinguish them. In Production Tools, select **Download chapter timestamps (.txt)**, open the file, and check that chapter names and times are correct, in time order, with the ordinary Note left out.

**Approve R05 only if:** The downloaded text matches your Chapter markers.

</details>

<details>
<summary><strong>R06 — Search all source transcripts and jump to matching footage</strong></summary>

**What it means:** Search for words actually spoken in your recordings, across all imported files. This is **transcript text search**, not AI visual search of actions.

**How to test:**
1. Import a video that has speech, then use **Transcript → Import SRT/VTT** or **Run local Whisper** to obtain timed words.
2. If you have two files, give each a transcript and choose a distinctive phrase present in only one.
3. Open Production Tools and type a spoken word in **Search all source transcripts**.
4. Check that results show the correct source, time, and matching word.
5. Search for a **two- or three-word phrase** that occurs consecutively in the transcript.
6. Click a result. The app should select the original media file and set the Source In/Out range around that match.
7. Try a made-up phrase; the app should report **no matching transcript words**, not invent a result.

**Approve R06 only if:** Word search, phrase search, and navigation all work with actual matching timestamps.

**Limitation:** A phrase search may fail if transcription timing or punctuation is incorrect. Confirm the underlying transcript before blaming the search.

</details>

<details>
<summary><strong>R07 — Save notes attached to an individual clip</strong></summary>

**What it means:** Personal reminders stored with a particular timeline clip, such as `Keep the reaction after the shot`. These are not subtitles, audio, or visible on-screen titles.

**How to test:** Choose a clip in **Editor**, enter a note in **Private clip notes**, and change focus by selecting another clip. Return to the original clip and check the note. Save and refresh the project, then check again.

**Approve R07 only if:** Notes stay attached to the correct clip and survive project reload.

</details>

<details>
<summary><strong>R08 — Trim a clip from the playhead</strong></summary>

**What it means:** Shorten the selected clip without editing its original source file. **Trim left** discards the earlier part of that timeline clip; **Trim right** discards its later part.

**How to test:**
1. Use a 30–60 second clip. Note its current Source In and Source Out.
2. Click the clip to select it, then move the main timeline playhead **inside that clip**, away from its beginning or end.
3. In Editor, click **Trim left to playhead**. Confirm the clip begins later and the project duration decreases.
4. Press **Undo** (or restore a snapshot), then click **Trim right to playhead** with the same interior playhead.
5. Confirm the clip now ends earlier and the original source preview still contains the complete recording.

**Approve R08 only if:** Both trims are accurate, non-destructive, and undoable. The current version uses buttons, **not** draggable edge handles.

</details>

<details>
<summary><strong>R09 — Move clips earlier or later</strong></summary>

**What it means:** Change the order of entire timeline clips without altering their internal source footage.

**How to test:** Create at least three recognizable excerpts. Select the middle clip, choose **Move left**, then verify it becomes the first clip. Choose **Move right** and verify its new order. Play the timeline across the changed clip boundaries, then use Undo and Redo.

**Approve R09 only if:** The expected clip changes position, audio and video remain associated with their source, and undo/redo restores each order.

**Limitation:** This is basic adjacent reordering, not a full multi-track ripple/roll/slip/slide editor.

</details>

<details>
<summary><strong>R10 — Step one frame backward or forward</strong></summary>

**What it means:** Move a tiny amount in the video instead of jumping 5 seconds. At 30 frames per second, one nominal project frame is 1/30 second.

**How to test:** Pause during a visibly moving part of your video. Click **Frame ▶** several times and check that the picture advances slightly. Click **◀ Frame** the same number of times and check that you return approximately to the initial position. Try near the start and end of a clip.

**Approve R10 only if:** The playhead moves by one project-frame increment each click and the preview follows correctly when the browser can decode the frame.

**Limitation:** The basic time display rounds to whole seconds, so watch the image/playhead rather than relying solely on that display. Browser decoder seeking may not always be perfectly frame-accurate.

</details>

<details>
<summary><strong>R11 — Export a CSV edit/cut sheet</strong></summary>

**What it means:** Download a spreadsheet-style table describing every clip, including which original file it came from, its source start/end, timeline start/end, playback speed, title, and private note. It is **not a video export**.

**How to test:** Make a timeline with two clips from different source times. Add a title and note to one. Click **Download editable cut sheet (.csv)** in Production Tools. Open the downloaded CSV in a text editor or spreadsheet and confirm there are two data rows, the clip order is correct, and timestamps, title, and note agree with the editor.

**Approve R11 only if:** Every timeline clip is represented with accurate source and project timing.

</details>

<details>
<summary><strong>R12 — Download a project health audit</strong></summary>

**What it means:** A JSON report listing counts, missing media references, suspicious clip boundaries, estimated transcription timing, and possible untranscribed gaps. It checks stored project **metadata**, not actual footage or final video encoding.

**How to test:** Open Production Tools and choose **Download project audit (.json)**. Open the file in Chrome or a text editor. Verify your project title, source count, video cut count, and warnings. Optional: import a saved project after removing its local media, then verify the audit identifies that it needs relinking.

**Approve R12 only if:** The downloadable report accurately reflects what the project knows and does not claim to have checked video frames it never decoded.

</details>

<details>
<summary><strong>R13 — Automated tests for the new project utilities</strong></summary>

**What it means:** Code-level regression tests check whether the report, safe CSV, chapter export, snapshot-data handling, and transcript search utilities behave as expected. This tests logic, **not** every browser interaction.

**How to test without installing software:** Open the repository's [GitHub Actions page](https://github.com/tbenitz/shortform-studio/actions). Choose the latest **Test project** or **Unit tests - multi-POV safety** workflow for the commit containing this feature batch. Check that the workflow has a **green success status** and that the test step completed without errors. You can also inspect `tests/production-tools.test.mjs` in the repository.

**Approve R13 only if:** The actual tests execute and pass on the relevant revision. You do not need Python or Node installed on your Chromebook.

</details>

<details>
<summary><strong>R14 — Cache the new Production Tools code for offline reopening</strong></summary>

**What it means:** When the site has loaded online and its service worker has installed the app files, opening it later without internet should still find the new Production Tools JavaScript file. It **does not** guarantee that all AI models, media, or cloud services work offline.

**How to test:** Visit the live site online and open Production Tools successfully. Refresh once so the latest app/service worker has a chance to activate. In Chrome DevTools, use **Network → Offline** and reload the page; alternatively disconnect from the network after the app has cached. Verify that Production Tools opens without an error about `production-tools.js`. Re-enable network afterward.

**Approve R14 only if:** The application shell and Production Tools load offline after a successful online cache install. Do not approve remote AI or uncached model functionality on this basis.

</details>

### Common problems while testing

| What you see | Meaning / what to try |
| --- | --- |
| A test mentions a tab or button that is missing | The feature is not ready or the deployment/browser cache is stale; leave it unchecked and report the missing control. |
| The site opens but a video stays black | Verify the original video plays in the Media source preview; browser codec support can prevent decoding. |
| The transcript search finds nothing | Check whether the selected source has a transcript with timed words before testing search. |
| An imported video disappears after refresh | Large media may not fit browser storage; relink the original media. Project metadata is separate. |
| A snapshot restores cuts but not playable video | Snapshots do not contain the video files; relink or restore media from cache. |
| A rendered file is incorrect despite the preview looking right | Report as an export issue. A metadata audit cannot prove a render is correct. |
| A GitHub workflow is still running | Do not approve the test result yet; check the completed run. |
| A control works once but fails repeatedly | Report the regression and keep or return the checkbox to unchecked. |

### New implementation review R15–R25 (favorites, MP4, and recoverable projects)

**These are new features added to the code for your testing, NOT owner-approved completions.** No feature is checked off automatically. R15–R25 are narrower review tasks, separate from the broad 494-item master backlog.

**The intended flow:** The website opens a **new empty editing project on every refresh**, while the **most recently saved project** remains stored. Use **Load Last Project** to restore it. Files up to 256 MB can be locally cached if the browser allows. For large recordings, **Import & Remember** uses Chrome's file-handle permissions; this is a saved reference to the original file rather than a duplicate upload. Chrome or the operating system can still require you to grant access again. If you imported an uncached large file via ordinary Import, it cannot be reconnected automatically without a new selection.

**MP4 requirement:** Render must create an actual ISO MP4 with **H.264 video**. **AAC audio is preferred** and should be used when the browser supports an AAC encoder (including supported ChromeOS configurations). When AAC encoding is unavailable, a **genuine MP4 with Opus audio** is used instead. Opus-in-MP4 can be unsupported by older players and editing applications; use the existing native FFmpeg renderer for maximum H.264/AAC compatibility. WebM is **never** the export fallback. A `.mp4` filename alone does not prove a valid MP4.

- [ ] **R15** Favorite source recordings and show a source favorites filter
  - **What it means / exactly how to test:** Import two videos, click ☆ next to one source in Media, then click ☆ Favorites in the Source Library header. Only the starred source should remain visible; click again to show all sources.
  - **Pass rule:** The complete described behavior works, including refresh/persistence where applicable. If not, leave unchecked and report `R15` as broken or incomplete.

- [ ] **R16** Favorite AI Director candidate clips and show starred candidates from all searches
  - **What it means / exactly how to test:** Generate or load two different Director proposals. Click ☆ Favorite on one. Check Show ★ favorites from all searches. The starred proposal should appear, including when it came from another search batch.
  - **Pass rule:** The complete described behavior works, including refresh/persistence where applicable. If not, leave unchecked and report `R16` as broken or incomplete.

- [ ] **R17** Favorite an edited timeline clip
  - **What it means / exactly how to test:** Click a video clip in the Timeline, open Editor, click ☆ Add clip to favorites, and verify the clip changes to the ★ marker. Click again to remove. It must not change source timing.
  - **Pass rule:** The complete described behavior works, including refresh/persistence where applicable. If not, leave unchecked and report `R17` as broken or incomplete.

- [ ] **R18** Persist all three favorites when saving and loading the project
  - **What it means / exactly how to test:** Star a source, a Director proposal and a timeline clip; click Save, reload the page, click Load Last Project. All previously starred items should remain starred, and the favorites filters should find them.
  - **Pass rule:** The complete described behavior works, including refresh/persistence where applicable. If not, leave unchecked and report `R18` as broken or incomplete.

- [ ] **R19** Protect favorites when clearing Director drafts
  - **What it means / exactly how to test:** Star a Director candidate and leave a second proposal unstarred. Click Clear unstarred. Only unstarred proposals should disappear; the favorite must remain. Try Reset duplicate history and confirm the favorite stays.
  - **Pass rule:** The complete described behavior works, including refresh/persistence where applicable. If not, leave unchecked and report `R19` as broken or incomplete.

- [ ] **R20** Export real H.264 MP4 (AAC preferred, supported Opus-in-MP4 fallback) instead of WebM
  - **What it means / exactly how to test:** Import a short video with audio, choose Export, set a moderate resolution such as 720p, and click Render MP4 and download. The downloaded file must be a genuine MP4, play independently in a compatible player, show picture and sound, and contain H.264 video plus AAC (if available) or Opus audio (when AAC encoding is unsupported). Check that the exported status accurately identifies the audio codec. MP4 with Opus may not play on older platforms. If the browser cannot create MP4, it must report an error—not silently export WebM.
  - **Pass rule:** The complete described behavior works, including refresh/persistence where applicable. If not, leave unchecked and report `R20` as broken or incomplete.

- [ ] **R21** Open a fresh empty project on refresh; load last project by button
  - **What it means / exactly how to test:** Save a project with at least one clip. Refresh the page and confirm the current editor starts empty rather than silently loading the old footage. Click Load Last Project and verify the saved clips and settings return.
  - **Pass rule:** The complete described behavior works, including refresh/persistence where applicable. If not, leave unchecked and report `R21` as broken or incomplete.

- [ ] **R22** Automatically reconnect cached original media on Load Last Project
  - **What it means / exactly how to test:** Import a short video under the browser's media cache limit (256 MB), Save, refresh, and click Load Last Project. The original file should say Ready and play without asking you to upload it again.
  - **Pass rule:** The complete described behavior works, including refresh/persistence where applicable. If not, leave unchecked and report `R22` as broken or incomplete.

- [ ] **R23** Remember large original file access from an explicit browser picker
  - **What it means / exactly how to test:** On a supported Chrome/Chromebook browser, click Import & Remember and pick a video. Save, refresh and click Load Last Project. If Chrome retained permission, the original source should reconnect without copying it into browser storage. If Chrome requires permission again, use Reconnect Files. Do not treat denied/revoked file access as an automatic success.
  - **Pass rule:** The complete described behavior works, including refresh/persistence where applicable. If not, leave unchecked and report `R23` as broken or incomplete.

- [ ] **R24** Reconnect missing file permissions without silently replacing footage
  - **What it means / exactly how to test:** After loading a saved project with an unavailable video, click Reconnect Files. Grant access to the correct saved file if Chrome asks, or use Import/Relink to select the original. The app must preserve source IDs, timecodes and cuts, and must not substitute an unrelated file.
  - **Pass rule:** The complete described behavior works, including refresh/persistence where applicable. If not, leave unchecked and report `R24` as broken or incomplete.

- [ ] **R25** Run end-to-end browser test for MP4 export and restore
  - **What it means / exactly how to test:** Open GitHub Actions → latest Deploy ShortForm Studio run. Check its browser smoke step that imports actual video, tests favorites/restore, downloads MP4 and runs ffprobe. Inspect the logs for real H.264 video with AAC where supported or Opus audio fallback when AAC is unavailable. A passing script is engineering evidence but cannot substitute for your own acceptance.
  - **Pass rule:** The complete described behavior works, including refresh/persistence where applicable. If not, leave unchecked and report `R25` as broken or incomplete.

**How to send your decisions:** `R15 and R17 work—approve both. R20 fails with an encoder error. R22 is not tested.` Only your explicit approval will update the relevant checkbox. Reporting a regression causes a previously accepted item to return to unchecked with a re-review note.

### New implementation review R26–R40 (humor, compilations, and cropping)

**OWNER REVIEW: 0/15 approved.** Source-text suggestions are not proof that the footage is funny. You must review original video/audio. Detected faces are not automatically matched to speaker identity.

- [ ] **R26** Find humor in real SRT dialogue
  - **Exactly how to test:** Import a source recording and its timed SRT. In Funny Clips & Compilations click Find possible jokes (local). All results must link to real text and original timestamps, with unrelated dry technical talk omitted.
  - **Approval:** Only tell me to check this specific item after the entire described behavior works. If it fails, it stays unchecked.

- [ ] **R27** Optional AI recognition of clever jokes and banter
  - **Exactly how to test:** Enter a real provider key under AI Director, return to Funny Clips, set the prompt and maximum API requests, confirm transcript transfer, and verify AI suggestions select real transcript turns and report incomplete coverage when not all windows are read.
  - **Approval:** Only tell me to check this specific item after the entire described behavior works. If it fails, it stays unchecked.

- [ ] **R28** Download ONLY raw dialogue text
  - **Exactly how to test:** Download ALL and SELECTED dialogue TXT files. Open them and verify they contain only spoken dialogue and any existing speaker labels, without scores, timestamps, made-up jokes or explanations.
  - **Approval:** Only tell me to check this specific item after the entire described behavior works. If it fails, it stays unchecked.

- [ ] **R29** Preview the exact original source interval
  - **Exactly how to test:** Click Preview original clip. Check that the original recording opens at the proposed timestamp, plays with its sound, and stops at the clip ending, without altering the editor timeline.
  - **Approval:** Only tell me to check this specific item after the entire described behavior works. If it fails, it stays unchecked.

- [ ] **R30** Choose which funny moments are included
  - **Exactly how to test:** Add two funny candidates to a compilation, leave one out, then remove one. Confirm that only the explicitly chosen moments appear in the selected list.
  - **Approval:** Only tell me to check this specific item after the entire described behavior works. If it fails, it stays unchecked.

- [ ] **R31** Manually reorder compilation moments
  - **Exactly how to test:** Select at least three different source moments and press the up/down controls. Verify the chosen order, not score or source order, is used when building.
  - **Approval:** Only tell me to check this specific item after the entire described behavior works. If it fails, it stays unchecked.

- [ ] **R32** Build a source-grounded editable compilation
  - **Exactly how to test:** Build from two chosen moments, either replacing or appending to the timeline. Check original source IDs, exact in/out times and clip order. Use Undo to return to the previous edit.
  - **Approval:** Only tell me to check this specific item after the entire described behavior works. If it fails, it stays unchecked.

- [ ] **R33** Fullscreen preview of the edited video
  - **Exactly how to test:** With a video on the timeline, click Fullscreen in the main transport, verify the preview expands while preserving its aspect ratio, then exit using Escape or Exit fullscreen.
  - **Approval:** Only tell me to check this specific item after the entire described behavior works. If it fails, it stays unchecked.

- [ ] **R34** Fullscreen original-source review
  - **Exactly how to test:** Preview a humor candidate, click Fullscreen source, and return without altering the timeline. Confirm it is actual original footage.
  - **Approval:** Only tell me to check this specific item after the entire described behavior works. If it fails, it stays unchecked.

- [ ] **R35** Manual left/center/right speaker crop
  - **Exactly how to test:** Select a clip, open Editor, set Manual crop and use Focus left/center/right, source X/Y positions and Zoom. Confirm the chosen clip changes while other clips keep their own framing.
  - **Approval:** Only tell me to check this specific item after the entire described behavior works. If it fails, it stays unchecked.

- [ ] **R36** Pick the speaker by clicking the program preview
  - **Exactly how to test:** Select a clip with a decoded frame, click Pick face on preview, then click the visible person. Verify the clip focus and zoom update without changing the source file.
  - **Approval:** Only tell me to check this specific item after the entire described behavior works. If it fails, it stays unchecked.

- [ ] **R37** Scan multiple detected faces from source footage
  - **Exactly how to test:** Use Scan original recording for faces on a video where two people appear. Verify real detected face boxes/positions are saved and can be chosen individually.
  - **Approval:** Only tell me to check this specific item after the entire described behavior works. If it fails, it stays unchecked.

- [ ] **R38** Auto-follow one detected face on a clip
  - **Exactly how to test:** After a face scan, choose Auto follow detected face and leftmost/second/largest in Editor. Play through real motion and verify the crop follows the selected face position in preview and output.
  - **Approval:** Only tell me to check this specific item after the entire described behavior works. If it fails, it stays unchecked.

- [ ] **R39** Map actual transcript speaker labels to face positions
  - **Exactly how to test:** Import a diarized SRT, scan source faces, choose Follow transcript speaker, then manually assign Speaker 1/2 to corresponding visible faces. Confirm speaker changes use the mappings, rather than an unverified automatic identity guess.
  - **Approval:** Only tell me to check this specific item after the entire described behavior works. If it fails, it stays unchecked.

- [ ] **R40** Persist humor selections and crop configurations
  - **Exactly how to test:** Choose moments, reorder and build a compilation, apply face/manual crop, Save, refresh, click Load Last Project. Verify selected moments, saved order, crop mode and focus settings return.
  - **Approval:** Only tell me to check this specific item after the entire described behavior works. If it fails, it stays unchecked.

### New implementation review R41–R46 (simple humor AI and MP4 recovery)

**New code for your testing, not automatically approved.** These six review IDs extend the original 40 release items. They are owner-only acceptance checks and remain unchecked. Never mark as passed because of assistant changes or GitHub tests alone.

- [ ] **R41** Two obvious Humor Finder modes, with settings hidden
  - **How to test and pass criteria:** Open Funny Clips & Compilations. Confirm the first two primary choices are Find Funny Clips and Make a Funny Story. The search source, custom instructions, cost limit and strictness live inside a closed Advanced options section rather than taking over the page.

- [ ] **R42** Single funny clip discovery without extra configuration
  - **How to test and pass criteria:** Import timed original-source SRT, click Find Funny Clips, then preview the actual source recordings. The results should be source-grounded; selecting one should permit a single-clip timeline export. Without an AI key the UI must identify local keyword matching honestly.

- [ ] **R43** Story mode combines only connected funny conversations
  - **How to test and pass criteria:** Import a transcript with two separate jokes about the same specific event and a third unrelated topic. Click Make a Funny Story. Preview both chosen moments, build the story, and verify at least two nonoverlapping original cuts about the same subject in chronological order. Unrelated source windows must never be added to fill out a montage.

- [ ] **R44** Configured AI understands repeated joke topics without extra setup
  - **How to test and pass criteria:** With a valid existing AI Director provider key, click either humor mode and approve the transcript upload/cost prompt. Confirm the AI proposes actual funny dialogue with source timestamps and specific repeated topics. Check that the resulting story labels are grounded in both originals and that a failed model request is reported rather than counted as success.

- [ ] **R45** Packaged MP4 encoder exists in the branch-hosted site
  - **How to test and pass criteria:** Open the actual published URL /shortform-studio/vendor/mediabunny/mediabunny.mjs in a new browser tab. It must return JavaScript, not a GitHub 404. In the same browser session, create a short MP4 from actual video/audio and verify picture, sound and file extension.

- [ ] **R46** MP4 export recovers from a missing or uncached encoder
  - **How to test and pass criteria:** Confirm that the editor first uses the same-origin pinned Mediabunny bundle and falls back to pinned backup CDNs if absent. The service-worker install should not fail when optional module is temporarily unavailable. The output must be actual MP4 bytes with real H.264 video and supported audio, not renamed WebM; failures must show a meaningful error.

**Known issue / cause:** The original GitHub Pages branch build was not shipping `vendor/mediabunny/mediabunny.mjs`, while the packaging-only custom deployment could fail during unrelated playback tests. The build now checks the pinned compiled encoder into the repository for branch hosting, the renderer has pinned backup sources, and the service worker no longer fails installation just because a nonessential asset is missing. Your actual Chromebook export still needs manual review before R20, R45 or R46 can be approved.

### Full future-update tracking queue (NEXT-001–NEXT-040)

The **complete original 494-feature master checklist remains below**, including the plain-English description and test for EVERY item. This extra queue organizes 40 specific next improvements by priority. None are represented as implemented or accepted. This makes the development goals explicit without losing any of the master checklist.

#### P0 — Fix next / make reliable

- [ ] **NEXT-001** Real audiovisual verification of dialogue jokes — Review each joke against the actual original video/audio, not a transcript claim
- [ ] **NEXT-002** True active-speaker-to-face identification — Use visual speech/sound evidence to identify who is talking rather than assuming based on diarization
- [ ] **NEXT-003** Persistent face identity tracks — Follow one person despite crossing faces, occlusion or scene transitions
- [ ] **NEXT-004** Manual keyframed crop corrections — Fix crop positions through long clips using frame-specific focus and smooth interpolation
- [ ] **NEXT-005** Two-person split-screen and reactions — Preserve multiple visible speakers and reaction faces when one-person crop hides context
- [ ] **NEXT-006** Correct long-SRT timing drift — Calibrate source subtitles at beginning and end without moving original words
- [ ] **NEXT-007** Resumable multi-hour AI humor scanning — Checkpoint each finished transcript window, resume, and show actual cost and coverage
- [ ] **NEXT-008** Understand implied/ironic jokes without keywords — Identify sarcasm and clever banter from context while rejecting unrelated talk
- [ ] **NEXT-009** Detect laughter and audible reactions — Analyze actual audio laughter, reactions, interruptions and overlapping voices
- [ ] **NEXT-010** Improve joke start/end trim points — Include setup, punchline and reaction without cutting off speech
- [ ] **NEXT-011** Create genuinely funny multi-cut stories — Assemble meaningful chronological source moments instead of arbitrary short pieces
- [ ] **NEXT-012** Eliminate duplicate joke candidates — Recognize near-duplicate dialogue/context windows across scans and sources
- [ ] **NEXT-013** User feedback for jokes — Persist owner rejections, favorites and approvals and apply them transparently
- [ ] **NEXT-014** Evidence and quality warnings on every clip — Show actual source ranges, model uncertainty, missing evidence and preview links
- [ ] **NEXT-015** Broad H.264/AAC MP4 compatibility — Offer a verified encoder path on devices where AAC is missing from browser WebCodecs
- [ ] **NEXT-016** Stream long MP4 renders instead of storing all in RAM — Allow multi-hour compilation outputs with real file progress and recovery
- [ ] **NEXT-017** Automatic recovery checkpoints for failed edits — Restore project state after crash and distinguish last autosave from manual versions
- [ ] **NEXT-018** Robust Chromebook large-file persistence — Manage file permissions, OPFS/IndexedDB quotas, relinking and safe cache eviction

#### P1 — Expand the editing suite

- [ ] **NEXT-019** Crossfade audio between compilation clips — Prevent clipped words, pops and jumps at source transitions
- [ ] **NEXT-020** Dynamic background music ducking — Lower soundtrack only around speech, laughter and punchlines
- [ ] **NEXT-021** Precise overlapping multi-POV synchronization — Align long recordings by multiple real-world audio/video events and drift
- [ ] **NEXT-022** Actually verified multi-POV gaming story edits — Validate true action/reactions in source video, not fabricated gameplay
- [ ] **NEXT-023** Fully editable caption tracks — Per-word timing, font, highlighting and independent captions/export
- [ ] **NEXT-024** Side-by-side fullscreen source comparison — Synchronize and compare original camera views at the same event
- [ ] **NEXT-025** Separate vertical/wide/square crop versions — Keep distinct safe crop keyframes for 9:16, 16:9 and 1:1
- [ ] **NEXT-026** Source-verified thumbnail frames — Make preview images from actual source frames, with explicit generated-media labels
- [ ] **NEXT-027** Proxy playback for long uploads — Preview three-hour source footage smoothly without full-memory decoding
- [ ] **NEXT-028** Waveforms and speech markers over footage — Expose scene boundaries, reactions and source speech clearly on timeline
- [ ] **NEXT-029** Configurable shortcuts and advanced timeline navigation — Support frame accurate editing without disrupting text inputs
- [ ] **NEXT-030** Accurate two/three-speaker diarization — Avoid false 40-speaker labels, allow manual correction and source sync
- [ ] **NEXT-031** Reviewable speaker-to-face associations — Inspect mismatches, source evidence and fallback when assigned faces disappear
- [ ] **NEXT-032** Actual rendered-video quality inspection — Check output codecs, audio timing, black frames, captions and crop safety

#### P2 — Professional longer-term work

- [ ] **NEXT-033** Batch render approved compilation variants — Create different aspect/caption versions with genuine progress and no hidden auto-publishing
- [ ] **NEXT-034** Source-supported social metadata — Generate grounded captions, titles, thumbnails and hashtags
- [ ] **NEXT-035** Shared collaborative review with owner-only acceptance — Allow authorized reviewer comments without AI or collaborators approving roadmap checkboxes
- [ ] **NEXT-036** Optional native FFmpeg desktop companion — Render long/high-res videos with real H.264/AAC when browser processing is insufficient
- [ ] **NEXT-037** Professional plugin/model interface — Load only real compatible AI models and media plugins, with clear failures
- [ ] **NEXT-038** Offline contextual humor model — Offer an efficient validated local LLM for humor on modest Chromebook RAM
- [ ] **NEXT-039** Multilingual transcript and dubbing features — Keep language, timing, permission and meaning intact
- [ ] **NEXT-040** Advanced compositing, masking and grading — Add professional multi-track effects with verified native-quality output

**Approval policy:** No assistant may check off ANY R, NEXT, or master ID without your explicit approval. Previously approved features get unchecked again if you report breakage.

### Plain-English glossary — video and AI terms

| Term | What it actually means |
| --- | --- |
| **Clip / source** | A *source* is the original uploaded recording. A *clip* or *cut* is a chosen portion of that recording placed in the edited timeline. Trimming should never change the original. |
| **Timeline / track / NLE** | The timeline is the order of the finished video. A *track* is a separate row for video, titles, captions or audio. *NLE* means non-linear editor: you can rearrange clips freely. |
| **Source In/Out** | The beginning and ending time of the part of the original video you want to use. |
| **Playhead / scrubbing** | The line showing the current moment. Scrubbing means dragging or clicking to jump to another time. |
| **Frame / FPS / timecode** | A frame is one still picture in a video. FPS is frames per second. Timecode identifies an exact moment, usually hours:minutes:seconds:frames. |
| **Razor / ripple / roll / slip / slide** | *Razor* splits a clip. *Ripple* closes a gap when trimming. *Roll* moves a boundary between two clips without changing their combined length. *Slip* changes which source frames play inside a clip without moving it. *Slide* moves a clip while adjusting both neighbors. |
| **Proxy** | A smaller, easier-to-play copy used while editing a large video; the original is still used for final output. |
| **Preview / render / export** | *Preview* is what plays inside the editor. *Render* creates the actual final frames and audio. *Export* saves the playable video or other output file. A good preview does not guarantee the export is correct. |
| **Codec / container** | MP4 or MKV is usually a file container. H.264, H.265 and AV1 are ways the actual video is encoded inside it. Your browser may open one container but not decode its video. |
| **Bitrate / CBR / VBR / CRF** | Bitrate controls the amount of data used for video. CBR stays near a fixed rate; VBR varies; CRF or an equivalent quality setting aims at consistent visual quality. |
| **Keyframe / easing / Bézier** | A keyframe is a saved animation value at a specific time, such as zoom 100% at 0 seconds and 150% at 2 seconds. Easing/Bézier curves control how smoothly it changes. |
| **Transition / dissolve / match cut** | An effect between shots. A dissolve blends images; a match cut switches between visually or narratively related shots. Most conversations should use ordinary clean cuts. |
| **Color grading / LUT / HDR / SDR** | Grading changes a video's color and mood. A LUT is a preset color transformation. HDR can contain a wider brightness/color range than SDR if supported end to end. |
| **Mask / compositing / chroma key / rotoscoping** | A mask selects part of an image. Compositing combines layers. Chroma key removes a colored screen; rotoscoping traces a person/object so effects can act behind/in front of it. |
| **Motion tracking / smart crop / reframe** | Tracking follows a moving subject. Smart crop/reframe moves the visible portion when converting horizontal footage to vertical, keeping important things on screen. |
| **POV / multicam / sync / drift** | POV means point of view. Multicam uses several recordings of an event. Sync aligns them; drift means their clocks gradually fall out of alignment. |
| **Overlap window / source provenance** | The overlap window is the part of real-world time that multiple recordings share. Provenance means knowing which original recording and timestamp every edited shot came from. |
| **ASR / Whisper / transcript** | ASR is automatic speech recognition. Whisper is a speech-to-text model. The transcript is the resulting text attached to source timestamps. |
| **Diarization / speaker merge** | Diarization attempts to answer *who spoke when*, usually initially with labels such as Speaker 1. Speaker merge combines mistaken duplicate labels. It does not necessarily know a person's real identity. |
| **SRT / VTT / subtitles / captions** | SRT and VTT are timestamped text files. Subtitles show speech; captions can also describe sound effects. Burned-in captions become pixels in the video and can't be toggled off. |
| **Word-level alignment / confidence** | Alignment tries to match each spoken word to the correct time. Confidence reflects how certain a model is; it is not proof of correctness. |
| **Semantic search / embeddings** | Search for *meaning*, not just exact words. Embeddings are numerical representations of text, audio, or images used to find related content. |
| **VAD / ASR gap** | Voice-activity detection (VAD) identifies intervals likely to contain speech. An ASR gap is a suspicious section that may not have been transcribed. |
| **AI Director / agentic edit** | AI Director plans a story from source footage. An *agentic edit* means it performs real timeline changes rather than merely writing a script or listing timestamps. |
| **B-roll / hook / payoff** | B-roll is supporting video. A hook gives a reason to keep watching; a payoff is the meaningful action, answer, joke, or resolution the video builds toward. |
| **Noise gate / compressor / limiter / de-esser** | A gate quiets low-level noise; a compressor reduces loudness differences; a limiter prevents large peaks; a de-esser tames harsh S sounds. |
| **Ducking / LUFS / true peak** | Ducking lowers music under dialogue. LUFS measures perceived audio loudness. True peak checks whether encoded audio may exceed a safe output ceiling. |
| **TTS / voiceover / dubbing** | Text-to-speech (TTS) generates narration from text. Voiceover is speech added over footage. Dubbing replaces dialogue in another language or voice when authorized. |
| **WebGPU / WASM / backend** | WebGPU lets supported browsers use the GPU for computation. WASM runs compiled code in the browser, usually on CPU. A backend is the actual program or server doing heavy processing. |
| **IndexedDB / OPFS / checkpoint** | IndexedDB and OPFS are browser storage systems. A checkpoint records processing progress so a failed task can continue without repeating everything. Browser storage may still be cleared or quota-limited. |
| **Provider / API / endpoint / CORS** | A provider offers an external AI service. An API endpoint is its web address. CORS is a browser restriction that can block requests even when an API key is valid. |
| **Metadata / preflight / integrity check** | Metadata describes a file or project, such as its length and source name. Preflight checks for problems before rendering. Integrity checks confirm a saved or produced file is valid. |
| **EDL / FCPXML / OTIO** | File formats for transferring editable timelines between different video editors; a CSV cut list is useful but not a full replacement for these. |
| **Non-destructive / fail closed** | Non-destructive means the original footage is never overwritten. Fail closed means an unavailable AI feature reports failure instead of pretending a different operation succeeded. |

### How to evaluate master-list features (UX through FUT)

The master feature list is a **roadmap, not a ready-to-use menu**. For each item, read its new **How to test** instruction underneath it. A feature passes only when **every part of the checkbox wording** works on real inputs; a partly working feature stays unchecked. If a test references a tab, button, supported model, format, or backend that does **not** exist yet, mark it as *not available / needs implementation* in your feedback. There is no expectation for you to install complex software just to test a future item.

**Simple test routine:** Start with a small test project and save a backup. For input/output features, use a real short recording, inspect both the preview and downloaded file. For AI features, use a real recording with a known event and inspect whether the AI selected the correct original timestamp. For recovery features, save a named snapshot before trying reloads or failure scenarios. Never test destructive controls on your only copy of an important project.

**How to send feedback:** `R08 pass; R10 frame skipping; ASR-011 misses the first 30 seconds; EDIT-007 doesn't exist yet.` Only an explicit **pass/approve** authorizes checking the named item. Saying `built`, `tested by CI`, or `code added` does not.

**The expanded entries below explain how you would test each desired feature, including features that are not built yet.** They are not new claims of implementation or approval.

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

> **What this section means / where to start:** Workspace layout and accessibility. **Where:** tabs, top bar, panels and Settings. **Start with:** open one clip, move between workspaces and try keyboard-only navigation.


- [ ] **UX-001** Five connected workspaces: Quick Create, AI Director, Pro Editor, Multi-POV, and Content Factory
  - **How to test this feature:** Find each of the five named workspaces (Quick Create, AI Director, Pro Editor, Multi-POV, Content Factory). Switch between all five without losing the same edit. A missing workspace means the whole item is not ready. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** Multicam/Multi-POV combines recordings of the same real event.
- [ ] **UX-002** Switch workspaces without losing the active project or timeline state
  - **How to test this feature:** Import a clip, make an edit, then switch between all available workspace tabs and return. The same clip, playhead and edited settings should still be there. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **UX-003** Dark and light themes with readable, consistent visual hierarchy
  - **How to test this feature:** Change the appearance setting and inspect text, buttons and controls on at least two workspaces before and after reload. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **UX-004** Resize, collapse, dock, undock, and reset editor panels
  - **How to test this feature:** Try dragging panel dividers and docking/collapsing panels, then restoring the default layout. If the panels cannot be resized, leave this unchecked. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **UX-005** Custom workspace layouts saved across sessions
  - **How to test this feature:** Change the stated UI preference, reload, and check it remains applied. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **UX-006** Media browser, source monitor, program monitor, inspector, Director, and timeline panels
  - **How to test this feature:** Look for the named interface control; try it with your open project, then navigate away and back. Verify state remains correct and the control performs the named action. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **UX-007** Global command palette for actions and media search
  - **How to test this feature:** Try typing an action such as 'split clip' in a global command field. Choosing the result must perform that action, not just display search text. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **UX-008** Keyboard shortcut search, editing, customization, and export
  - **How to test this feature:** Open shortcut settings; change an action's shortcut, use the new keys, then reload and verify the mapping persists. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **UX-009** Undo/redo status visible in the main toolbar
  - **How to test this feature:** Look for the named interface control; try it with your open project, then navigate away and back. Verify state remains correct and the control performs the named action. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **UX-010** Full-screen and distraction-free playback modes
  - **How to test this feature:** Look for the named interface control; try it with your open project, then navigate away and back. Verify state remains correct and the control performs the named action. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **UX-011** Dual-monitor editing layouts where supported
  - **How to test this feature:** Look for the named interface control; try it with your open project, then navigate away and back. Verify state remains correct and the control performs the named action. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **UX-012** Small-screen and Chromebook-friendly adaptive layouts
  - **How to test this feature:** Look for the named interface control; try it with your open project, then navigate away and back. Verify state remains correct and the control performs the named action. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **UX-013** Touch and trackpad-friendly controls with precise pointer editing
  - **How to test this feature:** Use the relevant keyboard, accessibility or touch method to reach every important control without losing functionality. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **UX-014** Accessible keyboard navigation and visible focus indicators
  - **How to test this feature:** Use the documented shortcut for an edit, customize it if promised, and confirm its effect without a mouse. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **UX-015** Screen-reader names for important controls
  - **How to test this feature:** Use Chrome's accessibility inspector or a screen reader to inspect Play, Save, Import and Export. Each important control should announce a meaningful name and purpose rather than just 'button'. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **UX-016** Adjustable UI scale and text size
  - **How to test this feature:** Change the appearance setting and inspect text, buttons and controls on at least two workspaces before and after reload. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **UX-017** High-contrast mode and accessible color choices
  - **How to test this feature:** Change the appearance setting and inspect text, buttons and controls on at least two workspaces before and after reload. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **UX-018** Reduced-motion option for animations
  - **How to test this feature:** Look for the named interface control; try it with your open project, then navigate away and back. Verify state remains correct and the control performs the named action. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** These are professional editable-timeline interchange formats.
- [ ] **UX-019** Contextual help, tooltips, and searchable settings
  - **How to test this feature:** Look for the named interface control; try it with your open project, then navigate away and back. Verify state remains correct and the control performs the named action. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **UX-020** No inert buttons, simulated progress, or deceptive success messages
  - **How to test this feature:** Look for the named interface control; try it with your open project, then navigate away and back. Verify state remains correct and the control performs the named action. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.

### 2. Projects, organization and versioning

> **What this section means / where to start:** Project library and recoverability. **Where:** project bar, Save/Open JSON, Production Tools. **Start with:** save a disposable project, make a change and attempt a restore.


- [ ] **PRJ-001** Create, rename, duplicate, archive, delete, and search projects
  - **How to test this feature:** Create a second project without destroying the first; rename, duplicate, find, archive and delete a disposable project. Every operation in the item must be present. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **PRJ-002** Project dashboard with thumbnail, dates, duration, and analysis state
  - **How to test this feature:** Make the specified project or organization change, save it, refresh the site, and verify the same project metadata and edits return without accidentally changing the original source. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **PRJ-003** Multiple timelines and sequences inside one project
  - **How to test this feature:** Make two different sequences inside one saved project and switch between them; editing one sequence must not overwrite the other. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **PRJ-004** Timeline branching for alternate edits
  - **How to test this feature:** Make the specified project or organization change, save it, refresh the site, and verify the same project metadata and edits return without accidentally changing the original source. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **PRJ-005** Project bins, nested folders, tags, favorites, filters, and sorting
  - **How to test this feature:** Organize three test assets into distinct groups and use the named filter/search control; check accurate results after reopening. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **PRJ-006** Save project settings independently of global defaults
  - **How to test this feature:** Make the specified project or organization change, save it, refresh the site, and verify the same project metadata and edits return without accidentally changing the original source. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **PRJ-007** Persist all clip edits, tracks, markers, media references, and effects
  - **How to test this feature:** Add two clips, notes and a marker; Save, refresh and check each edit, audio entry and setting returns accurately. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **PRJ-008** Keep original media immutable throughout editing
  - **How to test this feature:** Make the specified project or organization change, save it, refresh the site, and verify the same project metadata and edits return without accidentally changing the original source. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **PRJ-009** Automatic project autosave after meaningful changes
  - **How to test this feature:** Make the specified project or organization change, save it, refresh the site, and verify the same project metadata and edits return without accidentally changing the original source. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **PRJ-010** Periodic recovery snapshots with restore points
  - **How to test this feature:** Verify recovery snapshots are made automatically at the specified interval, then restore an earlier snapshot. Manual 'Save named snapshot' alone does not satisfy periodic automatic snapshots. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **PRJ-011** Persistent undo history or saved version checkpoints
  - **How to test this feature:** Save an earlier edit, change the timeline, restore it and compare the restored clips, metadata and media references. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** A checkpoint is saved progress that supports resuming later.
- [ ] **PRJ-012** Named versions and comparison between original, AI draft, and manual final
  - **How to test this feature:** Create named Original, AI Draft and Manual Final versions. Compare their edits side by side; simple snapshot restore alone does not meet full comparison requirement. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **PRJ-013** Selective revert of individual AI changes
  - **How to test this feature:** Create an AI edit that changes both a camera choice and audio setting. Revert only the camera change; confirm the audio change remains and the undo history still works. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **PRJ-014** Portable project export and import with optional source media
  - **How to test this feature:** Save a portable project, reload it in a fresh browser session and confirm clips, settings and media links are correct. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **PRJ-015** Export editable timeline interchange data where supported (EDL/FCPXML/OTIO)
  - **How to test this feature:** Save a portable project, reload it in a fresh browser session and confirm clips, settings and media links are correct. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** These are professional editable-timeline interchange formats.
- [ ] **PRJ-016** Re-link missing media by identity, path, or verified metadata
  - **How to test this feature:** Make the specified project or organization change, save it, refresh the site, and verify the same project metadata and edits return without accidentally changing the original source. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **PRJ-017** Show storage footprint for each project and cache category
  - **How to test this feature:** Open the storage view and independently compare project metadata size, cached source media size and proxy/model sizes (if present). **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **PRJ-018** Project templates and reusable brand profiles
  - **How to test this feature:** Make the specified project or organization change, save it, refresh the site, and verify the same project metadata and edits return without accidentally changing the original source. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **PRJ-019** Timestamp-anchored notes, comments, and review markers
  - **How to test this feature:** Make the specified project or organization change, save it, refresh the site, and verify the same project metadata and edits return without accidentally changing the original source. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **PRJ-020** Optional collaboration, review links, and role permissions
  - **How to test this feature:** Invite a test reviewer with limited access and verify their controls respect the granted permission. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **PRJ-021** Project-wide search across clips, assets, transcripts, and comments
  - **How to test this feature:** Organize three test assets into distinct groups and use the named filter/search control; check accurate results after reopening. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **PRJ-022** Portable backup integrity check and restored-project verification
  - **How to test this feature:** Export a portable backup, corrupt a disposable copy, verify integrity checks detect the problem, then restore the valid copy. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.

### 3. Import, formats and source inspection

> **What this section means / where to start:** Media formats and correct source handling. **Where:** Media. **Start with:** small files whose codec/duration you already know.


- [ ] **IMP-001** Drag-and-drop import of multiple video, audio, and image files
  - **How to test this feature:** Import several videos, audio tracks and images in one operation. Confirm all appear as separate playable source items. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IMP-002** Folder import and batch file selection where browser permissions allow
  - **How to test this feature:** Import an appropriate test file and inspect the source entry, preview and timeline. The intended result must actually work; reporting support in text is not sufficient. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IMP-003** Compatibility detection for MP4, MOV, MKV, WebM, AVI, M4V, and TS
  - **How to test this feature:** Import small real files in every claimed format/codec and verify actual preview decoding or a working conversion path. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IMP-004** Compatible handling or conversion of H.264, H.265, VP9, AV1, and other available codecs
  - **How to test this feature:** Try small samples encoded with each claimed codec. Verify the app decodes or clearly offers working conversion rather than claiming blanket MP4 compatibility. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** A codec is the method used to encode or decode actual audio/video.
- [ ] **IMP-005** Audio import for WAV, MP3, M4A/AAC, FLAC, OGG, and Opus
  - **How to test this feature:** Import a short genuine sample in each claimed audio format (WAV, MP3, M4A/AAC, FLAC, OGG, Opus), listen to it and confirm correct duration. Unsupported formats must report this clearly. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IMP-006** Image import for JPG, PNG, WebP, GIF, SVG, TIFF, and supported RAW
  - **How to test this feature:** Import an appropriate test file and inspect the source entry, preview and timeline. The intended result must actually work; reporting support in text is not sufficient. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IMP-007** Import existing SRT, VTT, ASS/SSA, TTML, TXT, and timestamped transcript data where supported
  - **How to test this feature:** Import an appropriate test file and inspect the source entry, preview and timeline. The intended result must actually work; reporting support in text is not sufficient. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IMP-008** Import camera timecode and embedded media metadata where available
  - **How to test this feature:** Inspect a known file's properties against a trusted media-info readout; metadata should match. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** Timecode is a precise location in the source or edited video.
- [ ] **IMP-009** Read multiple audio tracks, channel layouts, and embedded subtitles
  - **How to test this feature:** Import a source with multiple audio/subtitle tracks and confirm each track is detected and selectable. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IMP-010** Identify resolution, pixel format, color space, HDR, frame rate, and variable frame rate
  - **How to test this feature:** Import small real files in every claimed format/codec and verify actual preview decoding or a working conversion path. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** HDR preserves higher brightness/color range when the whole pipeline supports it.
- [ ] **IMP-011** Warn about unsupported formats before attempting a large decode
  - **How to test this feature:** Import small real files in every claimed format/codec and verify actual preview decoding or a working conversion path. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IMP-012** Never silently substitute a different source or omit undecodable segments
  - **How to test this feature:** Open a long source at multiple distant timestamps, then save/reopen and relink the original; existing cuts must stay aligned. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IMP-013** Check media corruption, missing frames, silent tracks, and incomplete files
  - **How to test this feature:** Use a disposable unsupported or intentionally damaged file and confirm a clear failure with no invented preview. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IMP-014** Find exact and near-duplicate media
  - **How to test this feature:** Import the same media twice and a separately re-encoded copy. Confirm exact duplicates and near duplicates are recognized without false positives. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IMP-015** Group recordings by recording time, name, camera, or matching event
  - **How to test this feature:** Import an appropriate test file and inspect the source entry, preview and timeline. The intended result must actually work; reporting support in text is not sufficient. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IMP-016** Generate audio waveforms and seekable filmstrip thumbnails
  - **How to test this feature:** Import a video with speech and clear shot changes. Confirm audio waveforms and seekable filmstrip thumbnails appear at matching source times; clicking must seek to the right footage. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IMP-017** Generate low-resolution proxies without altering original files
  - **How to test this feature:** Inspect a known file's properties against a trusted media-info readout; metadata should match. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IMP-018** Allow source in/out selection before adding footage to timeline
  - **How to test this feature:** Set In and Out on a source clip, add that portion to the timeline and verify both boundaries match the selected footage. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IMP-019** Capture still frames from source material
  - **How to test this feature:** Open a long source at multiple distant timestamps, then save/reopen and relink the original; existing cuts must stay aligned. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IMP-020** Show source file properties and media health reports
  - **How to test this feature:** Open a long source at multiple distant timestamps, then save/reopen and relink the original; existing cuts must stay aligned. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IMP-021** Manual and automatic source re-linking after reopening a project
  - **How to test this feature:** Save a project, reload without its video file, import the same original file and confirm clips and captions reattach without timestamp drift. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IMP-022** Random-access loading without decoding an entire long video into RAM
  - **How to test this feature:** Open a long source at multiple distant timestamps, then save/reopen and relink the original; existing cuts must stay aligned. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IMP-023** Preserve each source file's original timestamps and timebase
  - **How to test this feature:** Open a long source at multiple distant timestamps, then save/reopen and relink the original; existing cuts must stay aligned. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IMP-024** Optional ingest from supported recording devices and connected storage
  - **How to test this feature:** Import an appropriate test file and inspect the source entry, preview and timeline. The intended result must actually work; reporting support in text is not sufficient. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.

### 4. Media intelligence and universal search

> **What this section means / where to start:** Searchable understanding of source footage. **Where:** source analysis/search when implemented. **Start with:** one known phrase and one known visual event in real footage.


- [ ] **IDX-001** Build a searchable index of every imported source
  - **How to test this feature:** Search a known phrase and a known visible event, then verify matching original source times; text-only matches do not count as visual understanding. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IDX-002** Index shots and scene boundaries
  - **How to test this feature:** Check detected labels against a known visible/speaking subject, including a negative example the model must not claim. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IDX-003** Index transcript utterances and spoken keywords
  - **How to test this feature:** Search or inspect a known event in the recording; verify the result points to the correct source and moment. An unrelated, invented or empty match is a failure. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IDX-004** Index distinct speakers and speaker corrections
  - **How to test this feature:** Check detected labels against a known visible/speaking subject, including a negative example the model must not claim. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IDX-005** Detect and index significant non-speech sound events
  - **How to test this feature:** Search or inspect a known event in the recording; verify the result points to the correct source and moment. An unrelated, invented or empty match is a failure. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IDX-006** Detect and index faces, people, poses, and reactions where supported
  - **How to test this feature:** Check detected labels against a known visible/speaking subject, including a negative example the model must not claim. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IDX-007** Index visible objects, locations, actions, and screen text where supported
  - **How to test this feature:** Check detected labels against a known visible/speaking subject, including a negative example the model must not claim. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IDX-008** Extract and index camera movement and shot framing
  - **How to test this feature:** Search or inspect a known event in the recording; verify the result points to the correct source and moment. An unrelated, invented or empty match is a failure. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IDX-009** Generate searchable visual and text embeddings
  - **How to test this feature:** Search a known phrase and a known visible event, then verify matching original source times; text-only matches do not count as visual understanding. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IDX-010** Connect visible events with corresponding audio and dialogue
  - **How to test this feature:** Search or inspect a known event in the recording; verify the result points to the correct source and moment. An unrelated, invented or empty match is a failure. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IDX-011** Build event sequences rather than isolated keyword matches
  - **How to test this feature:** Search or inspect a known event in the recording; verify the result points to the correct source and moment. An unrelated, invented or empty match is a failure. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IDX-012** Search source media with natural-language descriptions
  - **How to test this feature:** Type 'person walks through door' or another true visual event in a recording and verify semantic source results with correct original timestamps; ordinary word matching is not enough. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IDX-013** Filter search by source file, speaker, date, duration, or event type
  - **How to test this feature:** Search a known phrase and a known visible event, then verify matching original source times; text-only matches do not count as visual understanding. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IDX-014** Return playable source thumbnails with precise timestamps
  - **How to test this feature:** Search or inspect a known event in the recording; verify the result points to the correct source and moment. An unrelated, invented or empty match is a failure. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IDX-015** Display evidence and confidence for AI-identified events
  - **How to test this feature:** Search or inspect a known event in the recording; verify the result points to the correct source and moment. An unrelated, invented or empty match is a failure. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IDX-016** Search for action followed by reaction or dialogue
  - **How to test this feature:** Search a known phrase and a known visible event, then verify matching original source times; text-only matches do not count as visual understanding. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IDX-017** Search for silence, black frames, clipping, or other defects
  - **How to test this feature:** Use a test source with a known silent interval, black screen and clipped audio. Search for each defect type and verify the returned media matches the original defect timestamps. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IDX-018** Find visually similar or repeated shots
  - **How to test this feature:** Use two related clips and an unrelated one; the index should rank the related sources together. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IDX-019** Identify repeated content across multiple source files
  - **How to test this feature:** Use two related clips and an unrelated one; the index should rank the related sources together. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IDX-020** Cache analyzed segments and skip unchanged content
  - **How to test this feature:** Search or inspect a known event in the recording; verify the result points to the correct source and moment. An unrelated, invented or empty match is a failure. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IDX-021** Use coarse scanning followed by targeted high-detail inspection
  - **How to test this feature:** Search or inspect a known event in the recording; verify the result points to the correct source and moment. An unrelated, invented or empty match is a failure. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IDX-022** Expose an editable hierarchical scene/event timeline
  - **How to test this feature:** Check detected labels against a known visible/speaking subject, including a negative example the model must not claim. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **IDX-023** Export media index and evidence metadata as structured data
  - **How to test this feature:** Export the index, open the JSON and confirm it includes source IDs, timestamps and the original evidence used for detected events. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.

### 5. Transcription and transcript editing

> **What this section means / where to start:** Speech-to-text and speaker timing. **Where:** Transcript. **Start with:** a short speech sample and known SRT to compare.


- [ ] **ASR-001** Transcribe audio using a working on-device ASR engine
  - **How to test this feature:** Run local Whisper on a short spoken recording and compare actual words, first/last phrases and progress against the real audio without an external transcription request. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **ASR-002** Support optional remote transcription with explicit media-upload consent
  - **How to test this feature:** Transcribe a short audio recording with known words; compare the full first and last phrases with the actual audio. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **ASR-003** Choose model, language, quality level, and execution device
  - **How to test this feature:** Transcribe a short audio recording with known words; compare the full first and last phrases with the actual audio. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **ASR-004** Show actual model download, load, and processing state
  - **How to test this feature:** Transcribe or import a recording with known words and timings, then compare the named output against actual speech and original timestamps. Watch especially the beginning and end. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **ASR-005** Support word-level timestamps when model capability permits
  - **How to test this feature:** Play several words at the start, middle and end and verify subtitle word times follow the original audio. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **ASR-006** Clearly label approximate timestamps or plain/segment fallback
  - **How to test this feature:** Choose a model without reliable word alignment. Check that the app visibly labels estimated/segment timing instead of pretending every timestamp is exact. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **ASR-007** Preserve source timecodes throughout transcription and relinking
  - **How to test this feature:** Transcribe a short audio recording with known words; compare the full first and last phrases with the actual audio. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** Timecode is a precise location in the source or edited video.
- [ ] **ASR-008** Transcribe long files in bounded, overlapping windows
  - **How to test this feature:** Transcribe a long, disposable recording while observing chunk-by-chunk progress and memory use. Compare words on both sides of window boundaries to ensure no dropped or doubled speech. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **ASR-009** Reconcile repeated words at chunk boundaries
  - **How to test this feature:** Transcribe or import a recording with known words and timings, then compare the named output against actual speech and original timestamps. Watch especially the beginning and end. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **ASR-010** Detect untranscribed opening, ending, and internal gaps
  - **How to test this feature:** Use speech near the very start, around a gap and near the end. The coverage display must flag any omitted speech intervals. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **ASR-011** Show speech-coverage map including silence and uncertainty
  - **How to test this feature:** After transcribing a file with speech, silence and an uncertain interval, open the speech-coverage display. Confirm the full original duration is represented and the silence/uncertain/skipped intervals can be distinguished. Retrying gaps is a separate requirement. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **ASR-012** Retry all failed or suspicious gaps without restarting completed work
  - **How to test this feature:** Use a recording with speech before and after silence; check coverage and retry deliberately missing windows without replacing correct words. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **ASR-013** Save incremental transcription checkpoints across sessions
  - **How to test this feature:** Partway through a long disposable transcription, cancel, save, reload and resume at a previously saved time rather than starting over. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** A checkpoint is saved progress that supports resuming later.
- [ ] **ASR-014** Detect and display overlapping speech without discarding either speaker
  - **How to test this feature:** Use a known two-speaker conversation, including overlap, and review speaker changes without inventing extra speakers. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **ASR-015** Run speaker diarization using real supported models when configured
  - **How to test this feature:** Use a known two-speaker conversation, including overlap, and review speaker changes without inventing extra speakers. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** Diarization is labeling when each speaker talks.
- [ ] **ASR-016** Manually name, merge, split, and correct speakers
  - **How to test this feature:** Use a known two-speaker conversation, including overlap, and review speaker changes without inventing extra speakers. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **ASR-017** Support speaker-count limits, confidence thresholds, and exceptions
  - **How to test this feature:** Use a known two-speaker conversation, including overlap, and review speaker changes without inventing extra speakers. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **ASR-018** Correct words without changing source video or edit decisions
  - **How to test this feature:** Modify a known word or speaker label, then search and save/reopen to confirm corrections without moving source footage. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **ASR-019** Edit video from deliberate transcript selections as a separate action
  - **How to test this feature:** Select a word range in the transcript and deliberately choose Edit Video; verify it trims/removes only the intended timeline footage. A separate Correct Text action must not alter the timeline. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **ASR-020** Search, filter, replace, and jump to transcript phrases
  - **How to test this feature:** Search for both a single word and a known phrase, then jump to the correct original source timestamp. Test replace and filter separately if approving the full master requirement. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **ASR-021** Support manual transcription and imported subtitles when ASR fails
  - **How to test this feature:** Transcribe a short audio recording with known words; compare the full first and last phrases with the actual audio. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **ASR-022** Custom vocabulary for names, slang, and technical terms
  - **How to test this feature:** Transcribe or import a recording with known words and timings, then compare the named output against actual speech and original timestamps. Watch especially the beginning and end. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **ASR-023** Side-by-side transcript, audio waveform, and preview playback
  - **How to test this feature:** Transcribe a short audio recording with known words; compare the full first and last phrases with the actual audio. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **ASR-024** Caption timing proofing and transcript version history
  - **How to test this feature:** Transcribe a short audio recording with known words; compare the full first and last phrases with the actual audio. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **ASR-025** Import/export SRT, VTT, TXT, and JSON transcripts
  - **How to test this feature:** Transcribe a short audio recording with known words; compare the full first and last phrases with the actual audio. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **ASR-026** Flag uncertain words for review rather than fabricating certainty
  - **How to test this feature:** Give a few speech words low-confidence status; ensure they can be reviewed and corrected without silently altering unrelated captions. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.

### 6. Visual understanding and source evidence

> **What this section means / where to start:** Visual AI interpretation, not just transcript or audio guesses. **Where:** Media analysis / future vision tools. **Start with:** a shot containing an obviously observable action.


- [ ] **VIS-001** Detect camera cuts and scene boundaries from decoded frames
  - **How to test this feature:** Inspect sampled frames with a known visual action and a known absent action; verify the model's labels and timestamps match real video. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **VIS-002** Detect people and faces without falsely claiming reliable identity
  - **How to test this feature:** Inspect sampled frames with a known visual action and a known absent action; verify the model's labels and timestamps match real video. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **VIS-003** Track visible subjects, objects, and motion across frames
  - **How to test this feature:** Inspect sampled frames with a known visual action and a known absent action; verify the model's labels and timestamps match real video. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** These are professional editable-timeline interchange formats.
- [ ] **VIS-004** Detect relevant visual actions from multiple supporting frames
  - **How to test this feature:** Inspect sampled frames with a known visual action and a known absent action; verify the model's labels and timestamps match real video. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **VIS-005** Recognize scene text and HUD indicators with uncertainty flags
  - **How to test this feature:** Inspect sampled frames with a known visual action and a known absent action; verify the model's labels and timestamps match real video. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **VIS-006** Distinguish visually observable actions from inferred outcomes
  - **How to test this feature:** Run the relevant visual analysis on a known moment and compare its claim with the actual decoded video frames. Inspect evidence timestamps and uncertainty, not merely a confidence score. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **VIS-007** Identify frame quality issues, freeze frames, and black frames
  - **How to test this feature:** Run the relevant visual analysis on a known moment and compare its claim with the actual decoded video frames. Inspect evidence timestamps and uncertainty, not merely a confidence score. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **VIS-008** Evaluate whether a source angle actually depicts claimed action
  - **How to test this feature:** Run the relevant visual analysis on a known moment and compare its claim with the actual decoded video frames. Inspect evidence timestamps and uncertainty, not merely a confidence score. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **VIS-009** Connect action timestamps to corresponding original source frames
  - **How to test this feature:** Run the relevant visual analysis on a known moment and compare its claim with the actual decoded video frames. Inspect evidence timestamps and uncertainty, not merely a confidence score. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **VIS-010** Show evidence thumbnails and original timestamps for AI conclusions
  - **How to test this feature:** Open the original frames behind a claim and confirm whether the event is actually visible; uncertain claims should remain labeled uncertain. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **VIS-011** Allow user corrections to event labels and confidence
  - **How to test this feature:** Open a detected event, correct an inaccurate label and confidence or mark it uncertain, save/reload, and confirm the corrected metadata appears in subsequent searches. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **VIS-012** Respect custom minimum visual evidence requirements
  - **How to test this feature:** Open the original frames behind a claim and confirm whether the event is actually visible; uncertain claims should remain labeled uncertain. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **VIS-013** Use detailed analysis around high-interest event windows
  - **How to test this feature:** Run the relevant visual analysis on a known moment and compare its claim with the actual decoded video frames. Inspect evidence timestamps and uncertainty, not merely a confidence score. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **VIS-014** Avoid treating a single sampled image as proof of a complete event
  - **How to test this feature:** Run the relevant visual analysis on a known moment and compare its claim with the actual decoded video frames. Inspect evidence timestamps and uncertainty, not merely a confidence score. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **VIS-015** Expose model limitations and decoder failures
  - **How to test this feature:** Try a disposable unreadable frame source and verify a clear failure, not a fabricated claim. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **VIS-016** Separate verified observations from AI hypotheses
  - **How to test this feature:** Run the relevant visual analysis on a known moment and compare its claim with the actual decoded video frames. Inspect evidence timestamps and uncertainty, not merely a confidence score. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **VIS-017** Allow manual selection of visual analysis ranges
  - **How to test this feature:** Run the relevant visual analysis on a known moment and compare its claim with the actual decoded video frames. Inspect evidence timestamps and uncertainty, not merely a confidence score. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **VIS-018** Reinspect contested source events at increased temporal sampling
  - **How to test this feature:** Run the relevant visual analysis on a known moment and compare its claim with the actual decoded video frames. Inspect evidence timestamps and uncertainty, not merely a confidence score. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.

### 7. Multi-camera and multi-POV synchronization

> **What this section means / where to start:** Two-camera synchronization and truthful camera switching. **Where:** AI Director / multi-POV. **Start with:** two recordings sharing the same real-world moment.


- [ ] **MC-001** Import and organize two or more independent camera/POV files
  - **How to test this feature:** Watch the relevant action in each original camera, then verify every angle switch in the edited story shows meaningful footage. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **MC-002** Align sources using common dialogue and audio fingerprints
  - **How to test this feature:** Choose a shared sound/phrase in both files, align it, then verify another shared event near the end of the recordings. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **MC-003** Align sources using timecode or reliable metadata where available
  - **How to test this feature:** Choose a shared sound/phrase in both files, align it, then verify another shared event near the end of the recordings. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** Timecode is a precise location in the source or edited video.
- [ ] **MC-004** Align sources using game clocks, event logs, or visual event anchors where available
  - **How to test this feature:** Choose a shared sound/phrase in both files, align it, then verify another shared event near the end of the recordings. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **MC-005** Support user-created synchronization markers
  - **How to test this feature:** Choose a shared sound/phrase in both files, align it, then verify another shared event near the end of the recordings. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **MC-006** Show and correct sync offset and drift over long recordings
  - **How to test this feature:** Align a shared event at both the start and end of two long recordings. Verify any clock drift is handled rather than an offset only. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **MC-007** Handle variable-frame-rate recordings and differing sample clocks
  - **How to test this feature:** Compare both recordings at a known shared event and again near the end of their overlap. Reject incorrect alignment, unrelated camera switches or evidence-free claims. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **MC-008** Preserve master event time and individual source time mapping
  - **How to test this feature:** Watch the relevant action in each original camera, then verify every angle switch in the edited story shows meaningful footage. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **MC-009** Display which source intervals overlap in original event time
  - **How to test this feature:** Show the two files' true shared recording-time interval; disjoint sections must not be treated as overlapping. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **MC-010** Limit expensive cross-POV comparison to verified overlap ranges
  - **How to test this feature:** Compare actual computation or job logs: multi-POV analysis should inspect overlapping windows, not spend equivalent time comparing unrelated nonoverlap. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **MC-011** Provide independent single-source analysis outside shared overlaps
  - **How to test this feature:** Compare the real shared time interval of two recordings; nonoverlapping sections must not appear as shared footage. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **MC-012** Identify events that genuinely appear in multiple recordings
  - **How to test this feature:** Watch each full original event and compare the assembled sequence; all required setup/action/reaction time must be present. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **MC-013** Flag uncertain or conflicting cross-source event matches
  - **How to test this feature:** Watch the relevant action in each original camera, then verify every angle switch in the edited story shows meaningful footage. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **MC-014** Compare synchronized source monitors frame by frame
  - **How to test this feature:** Load two aligned recordings of the same moment into synchronized source monitors. Seek forward and backward frame by frame and confirm both views show the same real-world time. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **MC-015** Choose master dialogue/music/effects audio with manual overrides
  - **How to test this feature:** Listen across a POV switch with headphones; speech must remain continuous without doubled audio or phase artifacts. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **MC-016** Avoid doubled dialogue, phase cancellation, and echo during POV switches
  - **How to test this feature:** Watch the relevant action in each original camera, then verify every angle switch in the edited story shows meaningful footage. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **MC-017** Switch only when an angle adds relevant story or visual evidence
  - **How to test this feature:** Request an encounter where only POV A shows the fight. The final edit must not switch to POV B simply to alternate angles. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **MC-018** Prioritize visible action over artificial alternating-camera patterns
  - **How to test this feature:** Watch the relevant action in each original camera, then verify every angle switch in the edited story shows meaningful footage. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **MC-019** Maintain chronology and spatial continuity across edits
  - **How to test this feature:** Watch each full original event and compare the assembled sequence; all required setup/action/reaction time must be present. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **MC-020** Show setup, confrontation, action, reaction, and resolution for each event
  - **How to test this feature:** Watch a complete source event and then its multi-POV edit: setup, action, reaction and resolution must be present when available. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **MC-021** Keep gunfights/action sequences intact when relevant to the story
  - **How to test this feature:** Compare both recordings at a known shared event and again near the end of their overlap. Reject incorrect alignment, unrelated camera switches or evidence-free claims. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **MC-022** Allow synchronized PiP, split screen, and reaction replay
  - **How to test this feature:** Choose a shared sound/phrase in both files, align it, then verify another shared event near the end of the recordings. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **MC-023** Offer smart angle-switch suggestions without forced automated cuts
  - **How to test this feature:** Watch the relevant action in each original camera, then verify every angle switch in the edited story shows meaningful footage. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **MC-024** Allow manual source angle replacement without losing synchronization
  - **How to test this feature:** Choose a shared sound/phrase in both files, align it, then verify another shared event near the end of the recordings. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **MC-025** Detect unrelated camera shots and reject misleading switches
  - **How to test this feature:** Watch the relevant action in each original camera, then verify every angle switch in the edited story shows meaningful footage. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **MC-026** Track source provenance for every selected camera interval
  - **How to test this feature:** Inspect each assembled cut's source file ID and original start/end timestamp. All must link back to the real media. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** Provenance is the original filename and timestamp behind a shot or claim.
- [ ] **MC-027** Require user review when a meaningful event or outcome is uncertain
  - **How to test this feature:** Watch each full original event and compare the assembled sequence; all required setup/action/reaction time must be present. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.

### 8. AI Director: planning and execution

> **What this section means / where to start:** AI that makes genuine editable story cuts from your instructions. **Where:** AI Director. **Start with:** a specific brief and footage containing both relevant and irrelevant moments.


- [ ] **DIR-001** Accept detailed natural-language creative briefs
  - **How to test this feature:** Enter a specific instruction mentioning a required event and an exclusion. Verify the proposal changes in response to both parts of the brief. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **DIR-002** Support comedy, gaming, action, documentary, interview, tutorial, podcast, trailer, and custom modes
  - **How to test this feature:** Set an explicit creative brief, run a real analysis, open its source-linked result in the Editor and verify the action genuinely occurred. A label, script or demo card is not enough. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **DIR-003** Expose target audience, purpose, tone, and editing style controls
  - **How to test this feature:** Enter a clear request and an explicit exclusion; regenerate and verify selected source footage follows both. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **DIR-004** Set adaptive duration targets, hard limits, and story-completeness preference
  - **How to test this feature:** Select a real event with setup, action and ending. Watch the AI candidate completely and confirm it forms a coherent story. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **DIR-005** Set automatic, target, and maximum number of desired outputs
  - **How to test this feature:** Set automatic output count, an explicit target, and a maximum. Generate on footage with few genuine stories; verify the maximum is respected without filler. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **DIR-006** Allow source, speaker, topic, and time-range exclusions
  - **How to test this feature:** Exclude a specific source and speaker; generate again and confirm none of its footage or dialogue appears in proposals. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **DIR-007** Allow locked clips and user-protected timeline sections
  - **How to test this feature:** Lock a clip, rerun editing, and verify its content, length and position remain intact. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **DIR-008** Identify story candidates from actual indexed evidence
  - **How to test this feature:** Select a real event with setup, action and ending. Watch the AI candidate completely and confirm it forms a coherent story. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **DIR-009** Identify hook, setup, development, key moment, reaction, and payoff
  - **How to test this feature:** Select a real event with setup, action and ending. Watch the AI candidate completely and confirm it forms a coherent story. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **DIR-010** Assemble complete coherent stories across distant source intervals
  - **How to test this feature:** Set an explicit creative brief, run a real analysis, open its source-linked result in the Editor and verify the action genuinely occurred. A label, script or demo card is not enough. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **DIR-011** Preserve chronology unless explicitly approved to alter it
  - **How to test this feature:** Set an explicit creative brief, run a real analysis, open its source-linked result in the Editor and verify the action genuinely occurred. A label, script or demo card is not enough. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **DIR-012** Avoid unrelated, fabricated, or repetitively recycled clips
  - **How to test this feature:** Create a known event surrounded by unrelated footage. Compare the AI draft to source video and verify no unrelated, imaginary or repeatedly reused shots were added. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **DIR-013** Prefer quality over artificially meeting an output count
  - **How to test this feature:** Set an explicit creative brief, run a real analysis, open its source-linked result in the Editor and verify the action genuinely occurred. A label, script or demo card is not enough. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **DIR-014** Show candidate board with quality notes and original-source links
  - **How to test this feature:** Select a real event with setup, action and ending. Watch the AI candidate completely and confirm it forms a coherent story. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **DIR-015** Explain why each candidate is proposed or rejected
  - **How to test this feature:** Select a real event with setup, action and ending. Watch the AI candidate completely and confirm it forms a coherent story. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **DIR-016** Support alternate hooks and multiple draft versions
  - **How to test this feature:** Select a real event with setup, action and ending. Watch the AI candidate completely and confirm it forms a coherent story. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **DIR-017** Generate an edit plan with source-referenced clip ranges
  - **How to test this feature:** Ask the Director to perform an edit, then open the normal timeline and verify real editable clips changed. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **DIR-018** Execute real timeline insert, split, trim, move, and replace operations
  - **How to test this feature:** Ask the Director to make a cut; the normal editable timeline should change with real source ranges, rather than only receiving written advice. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **DIR-019** Add editable B-roll, captions, titles, and effects
  - **How to test this feature:** Set an explicit creative brief, run a real analysis, open its source-linked result in the Editor and verify the action genuinely occurred. A label, script or demo card is not enough. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **DIR-020** Add audio and music only when selected or permitted
  - **How to test this feature:** Set an explicit creative brief, run a real analysis, open its source-linked result in the Editor and verify the action genuinely occurred. A label, script or demo card is not enough. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **DIR-021** Preview proposed changes before irreversible actions
  - **How to test this feature:** Create two different proposed edits, compare their actual selected footage and retain the prior version. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **DIR-022** Review source-to-timeline evidence after executing edits
  - **How to test this feature:** Ask the Director to perform an edit, then open the normal timeline and verify real editable clips changed. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **DIR-023** Prevent duplicate or unchanged AI output being presented as a new result
  - **How to test this feature:** Run the same brief twice and verify the AI does not relabel identical cuts as a brand-new discovery. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **DIR-024** Avoid hardcoded sample stories, fixed timestamps, or placeholder videos
  - **How to test this feature:** Run the same request twice and check no fabricated timestamps, unrelated cuts or mislabeled duplicate results are produced. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **DIR-025** Allow a user to approve, reject, or revise each candidate
  - **How to test this feature:** Select a real event with setup, action and ending. Watch the AI candidate completely and confirm it forms a coherent story. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **DIR-026** Retain manual overrides when AI Director runs again
  - **How to test this feature:** Set an explicit creative brief, run a real analysis, open its source-linked result in the Editor and verify the action genuinely occurred. A label, script or demo card is not enough. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **DIR-027** Stop bounded revisions when further improvements are unproven
  - **How to test this feature:** Set an explicit creative brief, run a real analysis, open its source-linked result in the Editor and verify the action genuinely occurred. A label, script or demo card is not enough. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **DIR-028** Save AI instructions, settings, and edit-rationale history
  - **How to test this feature:** Enter a clear request and an explicit exclusion; regenerate and verify selected source footage follows both. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **DIR-029** Support local, optional cloud, and hybrid analysis paths
  - **How to test this feature:** Set an explicit creative brief, run a real analysis, open its source-linked result in the Editor and verify the action genuinely occurred. A label, script or demo card is not enough. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.

### 9. AI quality control and source fidelity

> **What this section means / where to start:** Detect actual defects and explain them. **Where:** preflight, review and export. **Start with:** a project containing one intentionally known metadata defect.


- [ ] **QA-001** Separate measurable technical validation from subjective quality opinions
  - **How to test this feature:** Use both a coherent and a visibly flawed edit; verify quality notes explain specific real differences, not arbitrary impressive numbers. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **QA-002** Show explanations and evidence for each quality score
  - **How to test this feature:** Use both a coherent and a visibly flawed edit; verify quality notes explain specific real differences, not arbitrary impressive numbers. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **QA-003** Evaluate story clarity, setup, payoff, and completeness
  - **How to test this feature:** Use both a coherent and a visibly flawed edit; verify quality notes explain specific real differences, not arbitrary impressive numbers. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **QA-004** Detect missing context and misleading reordering
  - **How to test this feature:** Introduce or identify a known defect; verify the reviewer reports the correct issue at the right time with evidence, and check that a clean case does not trigger the same warning. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **QA-005** Check visual relevance to spoken dialogue and claimed actions
  - **How to test this feature:** Introduce or identify a known defect; verify the reviewer reports the correct issue at the right time with evidence, and check that a clean case does not trigger the same warning. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **QA-006** Check duplicate, recycled, and unrelated scene choices
  - **How to test this feature:** Introduce or identify a known defect; verify the reviewer reports the correct issue at the right time with evidence, and check that a clean case does not trigger the same warning. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **QA-007** Check visible action and reaction timing
  - **How to test this feature:** Introduce or identify a known defect; verify the reviewer reports the correct issue at the right time with evidence, and check that a clean case does not trigger the same warning. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **QA-008** Check abrupt audio cuts, dropped words, and bad crossfades
  - **How to test this feature:** Create a safe disposable timeline with one abrupt audio cut, a cut-off word and a poor crossfade. Verify the review identifies the real audio issue at its actual position. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **QA-009** Check silence, missing dialogue, clipping, and excessive peaks
  - **How to test this feature:** Use a safe known fault such as no captions or missing source and verify the inspector flags it at the correct position. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **QA-010** Detect black frames, frozen frames, and missing video
  - **How to test this feature:** Use a safe known fault such as no captions or missing source and verify the inspector flags it at the correct position. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **QA-011** Check subtitle accuracy, timing, readability, and safe areas
  - **How to test this feature:** Introduce or identify a known defect; verify the reviewer reports the correct issue at the right time with evidence, and check that a clean case does not trigger the same warning. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **QA-012** Check cropped-off faces, subjects, gameplay HUD, and important text
  - **How to test this feature:** Use a test shot with a face or important HUD near the edge; deliberately crop too tightly. Verify the reviewer spots the off-screen subject/text and cites the right interval. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **QA-013** Check repeated or excessive transitions and visual effects
  - **How to test this feature:** Introduce or identify a known defect; verify the reviewer reports the correct issue at the right time with evidence, and check that a clean case does not trigger the same warning. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **QA-014** Inspect rendered samples including opening and closing segments
  - **How to test this feature:** Export a short sample and inspect the downloaded file, not only the editor preview or progress indicator. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **QA-015** Link every identified issue to the exact timeline interval
  - **How to test this feature:** Introduce or identify a known defect; verify the reviewer reports the correct issue at the right time with evidence, and check that a clean case does not trigger the same warning. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **QA-016** Allow accepting or dismissing individual proposed fixes
  - **How to test this feature:** Introduce or identify a known defect; verify the reviewer reports the correct issue at the right time with evidence, and check that a clean case does not trigger the same warning. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **QA-017** Produce side-by-side before/after comparisons
  - **How to test this feature:** Choose two drafts of the same source and inspect side-by-side playback or a clear edit diff; ensure the comparison reflects real media. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **QA-018** Never fabricate a score or claim guaranteed engagement
  - **How to test this feature:** Use both a coherent and a visibly flawed edit; verify quality notes explain specific real differences, not arbitrary impressive numbers. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **QA-019** Record verification results and unresolved issues with export
  - **How to test this feature:** Introduce or identify a known defect; verify the reviewer reports the correct issue at the right time with evidence, and check that a clean case does not trigger the same warning. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **QA-020** Block misleading success states if verification did not actually run
  - **How to test this feature:** Introduce or identify a known defect; verify the reviewer reports the correct issue at the right time with evidence, and check that a clean case does not trigger the same warning. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.

### 10. Professional timeline and editing controls

> **What this section means / where to start:** Normal manual editing operations. **Where:** timeline and Editor. **Start with:** three distinguishable clips and a saved snapshot.


- [ ] **EDIT-001** Support unlimited practical video/audio/title tracks within resource limits
  - **How to test this feature:** Use at least two audio/video tracks, change each named control and confirm it affects only the intended items. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **EDIT-002** Show frame-accurate source/program timecodes
  - **How to test this feature:** Perform the edit on a selected clip, play through the result, undo/redo it, and save/reopen. Confirm the source file itself remains intact. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** Frame-accurate means the boundary is at the intended single frame.
- [ ] **EDIT-003** Insert, overwrite, lift, extract, and reorder clips
  - **How to test this feature:** Perform the edit on a selected clip, play through the result, undo/redo it, and save/reopen. Confirm the source file itself remains intact. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **EDIT-004** Split clips at playhead or selected positions
  - **How to test this feature:** Place the playhead inside a selected clip and press Split. There should be two clips with contiguous source ranges and no lost frames. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **EDIT-005** Trim left/right edges with precise handles
  - **How to test this feature:** Select a clip, move the playhead into it and use both trim controls; undo each change and confirm the original video remains unmodified. Draggable edge handles are also required for full approval of this master item. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **EDIT-006** Ripple edit and automatic gap closure
  - **How to test this feature:** Adjust clip boundaries with two neighboring clips and verify the named timing behavior, total duration and source range are correct. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** Ripple means closing/moving downstream timeline gaps.
- [ ] **EDIT-007** Roll edit at adjacent clip boundaries
  - **How to test this feature:** Use two adjacent clips; move the shared cut boundary forward and backward while the total combined timeline length remains the same. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** Roll means moving an edit boundary between neighbors without changing combined length.
- [ ] **EDIT-008** Slip edit while preserving timeline placement
  - **How to test this feature:** Move the visible source interval inside a clip while keeping its timeline position and duration unchanged. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** Slip means changing source frames inside a clip without moving that clip.
- [ ] **EDIT-009** Slide edit while preserving surrounding total duration
  - **How to test this feature:** Slide a middle clip left/right while neighboring trim ranges compensate and the total sequence duration stays unchanged. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** Slide means moving a clip while adjusting both neighbors.
- [ ] **EDIT-010** Move, duplicate, copy/paste, group, and ungroup clips
  - **How to test this feature:** Use at least two audio/video tracks, change each named control and confirm it affects only the intended items. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **EDIT-011** Link and unlink video with associated audio
  - **How to test this feature:** Perform the edit on a selected clip, play through the result, undo/redo it, and save/reopen. Confirm the source file itself remains intact. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **EDIT-012** Lock, hide, mute, solo, rename, and reorder tracks
  - **How to test this feature:** Use at least two audio/video tracks, change each named control and confirm it affects only the intended items. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **EDIT-013** Snapping to frames, clip edges, markers, words, and music beats
  - **How to test this feature:** Enable snapping, then move a clip edge near another clip, a frame, a chapter marker, a word and a music beat. Verify it locks to each promised target within tolerance. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **EDIT-014** Editable markers, chapter points, and annotations
  - **How to test this feature:** Add note, chapter and review markers, rename them, save/reload, and click each marker to seek to its exact time. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **EDIT-015** Adjustable zoom, track height, filmstrips, and waveform density
  - **How to test this feature:** Use at least two audio/video tracks, change each named control and confirm it affects only the intended items. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **EDIT-016** Keyboard shuttle playback and frame-step editing
  - **How to test this feature:** Try one-frame stepping and J/K/L keyboard shuttling with visibly moving video. Both are required for this broad item. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **EDIT-017** Source in/out markers and source patching
  - **How to test this feature:** Set original-source In/Out markers and use source patching to insert only selected source tracks into a chosen timeline destination. Check timing and track placement. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **EDIT-018** Variable-speed playback, reverse, freeze frames, and speed ramps
  - **How to test this feature:** Use a visibly moving clip; adjust playback mode and inspect both audio and final frames for correct timing. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **EDIT-019** Trim dead air without truncating meaningful reactions
  - **How to test this feature:** Adjust clip boundaries with two neighboring clips and verify the named timing behavior, total duration and source range are correct. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **EDIT-020** Nested sequences and compound clips
  - **How to test this feature:** Perform the edit on a selected clip, play through the result, undo/redo it, and save/reopen. Confirm the source file itself remains intact. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **EDIT-021** Adjustment layers and reusable effect stacks
  - **How to test this feature:** Perform the edit on a selected clip, play through the result, undo/redo it, and save/reopen. Confirm the source file itself remains intact. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **EDIT-022** Real-time or optimized proxy playback where supported
  - **How to test this feature:** Perform the edit on a selected clip, play through the result, undo/redo it, and save/reopen. Confirm the source file itself remains intact. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** A proxy is a lightweight editing copy of an original recording.
- [ ] **EDIT-023** Manual and automatic camera selection on synchronized tracks
  - **How to test this feature:** Use at least two audio/video tracks, change each named control and confirm it affects only the intended items. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **EDIT-024** Multi-select, clipboard actions, and robust undo/redo
  - **How to test this feature:** Perform the edit on a selected clip, play through the result, undo/redo it, and save/reopen. Confirm the source file itself remains intact. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **EDIT-025** Editable keyframes with Bézier/easing graph curves
  - **How to test this feature:** Set two animation keyframes, change Bézier easing handles and check motion follows the visible speed graph. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** Bézier handles control the ease and speed of animation between keyframes.
- [ ] **EDIT-026** Preview render caching for expensive effects
  - **How to test this feature:** Perform the edit on a selected clip, play through the result, undo/redo it, and save/reopen. Confirm the source file itself remains intact. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **EDIT-027** Non-destructive AI adjustments exposed as regular editable controls
  - **How to test this feature:** Perform the edit on a selected clip, play through the result, undo/redo it, and save/reopen. Confirm the source file itself remains intact. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** Non-destructive means original media is unchanged.

### 11. Transitions, visual effects, and compositing

> **What this section means / where to start:** Visual treatments and transitions. **Where:** Editor, effects and Settings. **Start with:** two different scenes; inspect before/after *and* final output.


- [ ] **FX-001** Clean cuts and standard audio/video crossfades
  - **How to test this feature:** Apply the effect at a real cut between two different shots, vary its duration, then inspect the actual exported transition. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **FX-002** Fade, dissolve, wipe, push, slide, zoom, spin, and whip-pan transitions
  - **How to test this feature:** Apply the effect at a real cut between two different shots, vary its duration, then inspect the actual exported transition. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **FX-003** Transition duration, alignment, direction, easing, and intensity controls
  - **How to test this feature:** Apply the effect at a real cut between two different shots, vary its duration, then inspect the actual exported transition. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **FX-004** Apply transitions without unexpectedly shortening source context
  - **How to test this feature:** Apply the effect at a real cut between two different shots, vary its duration, then inspect the actual exported transition. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** These are professional editable-timeline interchange formats.
- [ ] **FX-005** Position, scale, rotation, anchor, crop, skew, and perspective
  - **How to test this feature:** Apply the named effect to a test clip, change its parameters, play before/after, then export and confirm the rendered effect matches the preview. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **FX-006** Stabilization, horizon correction, and motion blur
  - **How to test this feature:** Test with intentionally moving footage, compare before/after and inspect the exported result for unwanted distortion. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** These are professional editable-timeline interchange formats.
- [ ] **FX-007** Speed interpolation and optical-flow slow motion where supported
  - **How to test this feature:** Export a known high-frame-rate clip slowed down with frame interpolation, then inspect fluidity and any artifacts. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** These are professional editable-timeline interchange formats.
- [ ] **FX-008** Keyframed pan, zoom, and subject-following camera motion
  - **How to test this feature:** Apply the effect at a real cut between two different shots, vary its duration, then inspect the actual exported transition. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** These are professional editable-timeline interchange formats.
- [ ] **FX-009** Brightness, exposure, contrast, highlights, shadows, temperature, and tint
  - **How to test this feature:** Apply the look to one clip, compare with a second, and verify that the rendered file shows the same intended adjustment. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **FX-010** Saturation, vibrance, curves, hue controls, and color wheels
  - **How to test this feature:** Apply the look to one clip, compare with a second, and verify that the rendered file shows the same intended adjustment. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **FX-011** Import and apply LUTs with correct color-space handling
  - **How to test this feature:** Apply the look to one clip, compare with a second, and verify that the rendered file shows the same intended adjustment. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **FX-012** Match grading between cameras and source segments
  - **How to test this feature:** Apply the named effect to a test clip, change its parameters, play before/after, then export and confirm the rendered effect matches the preview. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **FX-013** Support SDR and validated HDR workflows where engines permit
  - **How to test this feature:** Import known SDR footage and, if supported, an HDR sample. Select the relevant color workflow and export. Compare actual output color metadata and highlights: HDR must be preserved or intentionally tone-mapped rather than silently mislabeled. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** HDR preserves higher brightness/color range when the whole pipeline supports it.
- [ ] **FX-014** Sharpen, denoise, deflicker, blur, glow, grain, and vignette
  - **How to test this feature:** Test with intentionally moving footage, compare before/after and inspect the exported result for unwanted distortion. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **FX-015** Stylized VHS, glitch, chromatic aberration, and light leak effects
  - **How to test this feature:** Apply a VHS, glitch, RGB split and light leak effect to a short clip. Toggle each on/off, adjust intensity and check its actual rendered output. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **FX-016** Opacity, blend modes, masks, and feathering
  - **How to test this feature:** Use footage with a moving object or green screen, add the effect and verify accurate placement across several frames. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **FX-017** Chroma key and green-screen compositing
  - **How to test this feature:** Use footage with a moving object or green screen, add the effect and verify accurate placement across several frames. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** Chroma key replaces a chosen background color.
- [ ] **FX-018** AI background segmentation and optional replacement
  - **How to test this feature:** Use footage with a moving object or green screen, add the effect and verify accurate placement across several frames. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **FX-019** Object/face tracking for effect attachment
  - **How to test this feature:** Use footage with a moving object or green screen, add the effect and verify accurate placement across several frames. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **FX-020** Picture-in-picture and multi-panel split-screen layouts
  - **How to test this feature:** Apply the named effect to a test clip, change its parameters, play before/after, then export and confirm the rendered effect matches the preview. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **FX-021** Tracked text overlays and motion graphics
  - **How to test this feature:** Use footage with a moving object or green screen, add the effect and verify accurate placement across several frames. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** These are professional editable-timeline interchange formats.
- [ ] **FX-022** Editable effect presets, strength, and parameter keyframes
  - **How to test this feature:** Adjust effect parameters and their keyframes, save an effect preset, apply it to a second clip and verify values stay editable in preview and export. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** A keyframe stores an effect value at a specific time.
- [ ] **FX-023** Optional advanced node-based compositor
  - **How to test this feature:** Use footage with a moving object or green screen, add the effect and verify accurate placement across several frames. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **FX-024** Warn when an effect cannot be rendered in the selected backend
  - **How to test this feature:** Select an effect unsupported by the chosen renderer and verify the app warns rather than silently omitting it. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.

### 12. Audio editing, mixing and restoration

> **What this section means / where to start:** Speech, music and effects mixing. **Where:** Editor audio controls. **Start with:** speech plus a music overlay; use headphones.


- [ ] **AUD-001** Waveform-based audio clip editing and fades
  - **How to test this feature:** Build two audio layers with different levels, automate or route them and listen to the final rendered mix. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **AUD-002** Independent dialogue, music, effects, ambience, and narration tracks
  - **How to test this feature:** Put music beneath speech, enable the option and listen at the start/middle/end for clean spoken words and correct music level. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **AUD-003** Audio meters and peak-hold monitoring
  - **How to test this feature:** Measure known audio before/after output and compare the reported loudness or peak against the selected target. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **AUD-004** Volume and stereo pan automation with keyframes
  - **How to test this feature:** Build two audio layers with different levels, automate or route them and listen to the final rendered mix. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** A keyframe stores an effect value at a specific time.
- [ ] **AUD-005** Audio buses, submixes, and configurable channel routing
  - **How to test this feature:** Route two audio sources into separate buses or submixes, adjust each bus gain and output route, and verify the actual exported channel mix follows the chosen routing. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **AUD-006** Noise reduction and voice isolation
  - **How to test this feature:** Use a noisy or uneven speech recording, switch the processing on/off, and compare clarity, peaks and side effects. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **AUD-007** De-echo and reverb reduction where supported
  - **How to test this feature:** Use a noisy or uneven speech recording, switch the processing on/off, and compare clarity, peaks and side effects. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **AUD-008** Equalizer with manual bands and presets
  - **How to test this feature:** Use a noisy or uneven speech recording, switch the processing on/off, and compare clarity, peaks and side effects. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **AUD-009** Compressor, limiter, gate, expander, and de-esser
  - **How to test this feature:** Use a noisy or uneven speech recording, switch the processing on/off, and compare clarity, peaks and side effects. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **AUD-010** Spectral repair of selected audio defects where supported
  - **How to test this feature:** Use a noisy or uneven speech recording, switch the processing on/off, and compare clarity, peaks and side effects. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **AUD-011** Loudness measurement and LUFS normalization
  - **How to test this feature:** Measure known audio before/after output and compare the reported loudness or peak against the selected target. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** LUFS is a loudness measurement used for consistent sound levels.
- [ ] **AUD-012** True-peak limiting and clipping warnings
  - **How to test this feature:** Use a deliberately loud disposable audio sample. Set the true-peak ceiling, render, and inspect peak measurement/warnings. The final output should respect the configured ceiling and report clipping instead of silently distorting. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** True peak catches possible audio peaks between sampled values.
- [ ] **AUD-013** Music auto-ducking with adjustable threshold, attack, and release
  - **How to test this feature:** Place music under intermittent dialogue, enable auto-ducking, and adjust threshold, attack and release. Listen to verify music lowers during speech and rises smoothly between speech sections. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** Ducking automatically lowers music when speech is present.
- [ ] **AUD-014** Manual overrides for ducking and music levels
  - **How to test this feature:** Play music under dialogue. Override the automatic ducking amount in a chosen interval and manually adjust music volume. Verify the app respects your override in preview and exported audio. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** Ducking automatically lowers music when speech is present.
- [ ] **AUD-015** Crossfades and room-tone preservation across dialogue cuts
  - **How to test this feature:** Put music beneath speech, enable the option and listen at the start/middle/end for clean spoken words and correct music level. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **AUD-016** Synchronize external audio to video with offset/drift correction
  - **How to test this feature:** Play a source with clearly timed sound and image; modify the named control and verify synchronization during preview and export. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **AUD-017** Handle multiple source audio tracks without losing the intended channel
  - **How to test this feature:** Play a source with clearly timed sound and image; modify the named control and verify synchronization during preview and export. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **AUD-018** Avoid duplicated or conflicting audio during multicam switches
  - **How to test this feature:** Adjust the named sound control, listen before and after with headphones, and inspect the downloaded video. Confirm no unrequested source audio is lost. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** Multicam/Multi-POV combines recordings of the same real event.
- [ ] **AUD-019** Detect silence, clipping, truncated words, and unexpected dropouts
  - **How to test this feature:** Adjust the named sound control, listen before and after with headphones, and inspect the downloaded video. Confirm no unrequested source audio is lost. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **AUD-020** Source separation into vocals/music/effects where supported
  - **How to test this feature:** Put music beneath speech, enable the option and listen at the start/middle/end for clean spoken words and correct music level. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **AUD-021** Music beat, phrase, and section markers for edit suggestions
  - **How to test this feature:** Put music beneath speech, enable the option and listen at the start/middle/end for clean spoken words and correct music level. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **AUD-022** Profanity masking and clean-audio alternative export
  - **How to test this feature:** Adjust the named sound control, listen before and after with headphones, and inspect the downloaded video. Confirm no unrequested source audio is lost. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **AUD-023** Mono, stereo, and multichannel output where supported
  - **How to test this feature:** Export known left/right stereo test audio as mono and stereo and, if supported, multichannel. Check actual output channel layout and whether intended channels remain audible. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **AUD-024** Preserve original source audio for reversible editing
  - **How to test this feature:** Adjust the named sound control, listen before and after with headphones, and inspect the downloaded video. Confirm no unrequested source audio is lost. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.

### 13. Narration, dubbing, and voice generation

> **What this section means / where to start:** Mic narration and optional generated speech. **Where:** Editor → Audio and narration. **Start with:** a short script and consented sample.


- [ ] **VO-001** Record microphone narration into editable timeline tracks
  - **How to test this feature:** Record a short phrase, play it back, place it on the timeline and verify the original recording is not overwritten. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **VO-002** Playback and monitor a recorded narration take
  - **How to test this feature:** Record a short phrase, play it back, place it on the timeline and verify the original recording is not overwritten. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **VO-003** Generate TTS voiceover only through a real working engine
  - **How to test this feature:** Enter narration text, select a real functioning TTS model and generate an audio file; browser speech preview by itself is not generated editable narration. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **VO-004** Choose voice, language, pitch, rate, pauses, and emphasis
  - **How to test this feature:** Enter a short script, generate or preview a real voice, adjust a phrase and inspect the audio overlay and final output. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **VO-005** Preview voice before committing generated audio to the timeline
  - **How to test this feature:** Enter a short script, generate or preview a real voice, adjust a phrase and inspect the audio overlay and final output. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **VO-006** Replace or regenerate individual narration sentences
  - **How to test this feature:** Enter a short script, generate or preview a real voice, adjust a phrase and inspect the audio overlay and final output. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **VO-007** Preserve completed voice segments if later generation fails
  - **How to test this feature:** Enter a short script, generate or preview a real voice, adjust a phrase and inspect the audio overlay and final output. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **VO-008** Generate scripts based on source content with factual review
  - **How to test this feature:** Enter a short script, generate or preview a real voice, adjust a phrase and inspect the audio overlay and final output. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **VO-009** Align narration timing to scenes and captions
  - **How to test this feature:** Create or preview the specified narration effect, place it on an editable audio track and listen to the result. If a remote service is required, confirm consent and actual generated audio. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **VO-010** Use narration to bridge authentic context, not invent events
  - **How to test this feature:** Create or preview the specified narration effect, place it on an editable audio track and listen to the result. If a remote service is required, confirm consent and actual generated audio. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **VO-011** Supported translation and dubbing workflows
  - **How to test this feature:** Create a dubbed/translated segment and compare spoken content, timing and language to the original before approving. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **VO-012** Clearly distinguish synthetic speech from genuine source dialogue
  - **How to test this feature:** Create or preview the specified narration effect, place it on an editable audio track and listen to the result. If a remote service is required, confirm consent and actual generated audio. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **VO-013** Require authorization before personal voice cloning
  - **How to test this feature:** Attempt to add or clone a personal voice from a sample without authorization. The workflow must explicitly request or enforce permission before voice cloning is allowed. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** Voice cloning uses a permitted reference voice to synthesize matching speech.
- [ ] **VO-014** Show model load, progress, and generation errors
  - **How to test this feature:** Create or preview the specified narration effect, place it on an editable audio track and listen to the result. If a remote service is required, confirm consent and actual generated audio. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **VO-015** Automatic music ducking during narration
  - **How to test this feature:** Create or preview the specified narration effect, place it on an editable audio track and listen to the result. If a remote service is required, confirm consent and actual generated audio. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** Ducking automatically lowers music when speech is present.
- [ ] **VO-016** Support optional low-latency chunk preview where engine permits
  - **How to test this feature:** Create or preview the specified narration effect, place it on an editable audio track and listen to the result. If a remote service is required, confirm consent and actual generated audio. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.

### 14. Captions, subtitles and text-based graphics

> **What this section means / where to start:** Subtitles and editable on-screen text. **Where:** Transcript, captions and Export. **Start with:** known timed subtitles on a short spoken clip.


- [ ] **CAP-001** Editable dedicated caption tracks and caption regions
  - **How to test this feature:** Apply the specified text/caption behavior, check a representative preview frame and then inspect the downloaded video or text file. Text must be readable, accurate and editable where promised. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **CAP-002** Auto-generate subtitle segments from verified transcript timing
  - **How to test this feature:** Import a known SRT, play at multiple positions, adjust one subtitle and verify text stays correct on the rendered output. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **CAP-003** Word, phrase, sentence, karaoke, and highlighted-word modes
  - **How to test this feature:** Import a known SRT, play at multiple positions, adjust one subtitle and verify text stays correct on the rendered output. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **CAP-004** Manual caption timing, splitting, merging, and retiming
  - **How to test this feature:** Import a known SRT, play at multiple positions, adjust one subtitle and verify text stays correct on the rendered output. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **CAP-005** Multiple languages and separate caption variants
  - **How to test this feature:** Apply the specified text/caption behavior, check a representative preview frame and then inspect the downloaded video or text file. Text must be readable, accurate and editable where promised. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **CAP-006** Per-speaker caption styles and colors
  - **How to test this feature:** Import a known SRT, play at multiple positions, adjust one subtitle and verify text stays correct on the rendered output. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **CAP-007** Custom fonts, sizes, colors, outlines, shadows, backgrounds, and gradients
  - **How to test this feature:** Change the named style on a caption, preview it at the beginning/middle/end, then inspect the downloaded video. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **CAP-008** Animate captions with editable timing and keyframes
  - **How to test this feature:** Create two caption keyframes for position, scale or opacity; adjust animation timing and inspect the text movement in preview and final export. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** A keyframe stores an effect value at a specific time.
- [ ] **CAP-009** Set character, line, and reading-speed limits
  - **How to test this feature:** Import a known SRT, play at multiple positions, adjust one subtitle and verify text stays correct on the rendered output. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **CAP-010** Auto-adjust captions away from faces, HUD, and important objects
  - **How to test this feature:** Use footage with a face or HUD behind captions and verify legibility and non-obstruction in 9:16 output. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **CAP-011** Preview platform safe areas and text contrast
  - **How to test this feature:** Use footage with a face or HUD behind captions and verify legibility and non-obstruction in 9:16 output. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **CAP-012** Caption proofreading, punctuation, and speaker labels
  - **How to test this feature:** Import a known SRT, play at multiple positions, adjust one subtitle and verify text stays correct on the rendered output. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **CAP-013** Burn captions into final video
  - **How to test this feature:** Render a short captioned video with burn-in enabled. Open the finished video outside the editor and verify captions are permanently visible at the correct times; separate subtitle-file export is a different checklist item. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** Burned-in captions are permanently visible in the output pixels.
- [ ] **CAP-014** Export SRT and VTT, with supported embedded text tracks
  - **How to test this feature:** Export both the video and subtitle file; ensure timing aligns and the required caption mode is present. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **CAP-015** Custom titles, lower thirds, chapter cards, and credits
  - **How to test this feature:** Add the named graphical object and verify it can be edited, positioned and rendered rather than being a fixed image. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **CAP-016** Shapes, arrows, callouts, focus rings, and diagrams
  - **How to test this feature:** Apply the specified text/caption behavior, check a representative preview frame and then inspect the downloaded video or text file. Text must be readable, accurate and editable where promised. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **CAP-017** Logo, watermark, and reusable branding overlay
  - **How to test this feature:** Add the named graphical object and verify it can be edited, positioned and rendered rather than being a fixed image. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** An overlay is a second visual or audio layer placed over the main edit.
- [ ] **CAP-018** Animated intros, outros, countdowns, and progress bars
  - **How to test this feature:** Apply the specified text/caption behavior, check a representative preview frame and then inspect the downloaded video or text file. Text must be readable, accurate and editable where promised. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **CAP-019** Motion-track graphics to people or objects
  - **How to test this feature:** Add the named graphical object and verify it can be edited, positioned and rendered rather than being a fixed image. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** These are professional editable-timeline interchange formats.
- [ ] **CAP-020** Optional word-level censor sound and subtitle treatment
  - **How to test this feature:** Import a known SRT, play at multiple positions, adjust one subtitle and verify text stays correct on the rendered output. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **CAP-021** Graphic element templates that remain editable
  - **How to test this feature:** Add the named graphical object and verify it can be edited, positioned and rendered rather than being a fixed image. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.

### 15. Automatic reframing and aspect-ratio adaptation

> **What this section means / where to start:** Moving a crop for vertical video without losing the important action. **Where:** aspect selector and reframing settings. **Start with:** a horizontal shot with a moving subject.


- [ ] **CROP-001** Set project and delivery aspect ratios independently
  - **How to test this feature:** Change aspect ratio to 9:16 or 4:5, preview and export a test video; confirm dimensions and framing. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **CROP-002** Support 16:9, 9:16, 1:1, 4:5, ultrawide, and custom sizes
  - **How to test this feature:** Change aspect ratio to 9:16 or 4:5, preview and export a test video; confirm dimensions and framing. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **CROP-003** Detect relevant subjects and points of interest for reframing
  - **How to test this feature:** Use an obvious moving subject; watch the crop follow it correctly through several different positions. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **CROP-004** Track moving subjects across the entire selected shot
  - **How to test this feature:** Use an obvious moving subject; watch the crop follow it correctly through several different positions. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **CROP-005** Switch crop priorities when action changes
  - **How to test this feature:** Reframe a horizontal video in 9:16 and track two successive moments where the action changes location. The crop must follow the relevant subject. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **CROP-006** Keep visible faces, captions, gameplay elements, and important text
  - **How to test this feature:** Inspect every relevant point in a vertical cut and confirm faces, important text and HUD elements remain inside safe margins. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **CROP-007** Allow user-defined safe margins and target positions
  - **How to test this feature:** Inspect every relevant point in a vertical cut and confirm faces, important text and HUD elements remain inside safe margins. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **CROP-008** Use split screen when two important subjects cannot share one crop
  - **How to test this feature:** Use footage with two people far apart; select split-screen output and verify neither person is silently cropped out. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **CROP-009** Keyframe and ease crop motion between positions
  - **How to test this feature:** Correct the crop at two moments and verify interpolated motion is smooth in preview and export. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** These are professional editable-timeline interchange formats.
- [ ] **CROP-010** Preview source-to-output crop side by side
  - **How to test this feature:** Preview several points in the shot and export the vertical cut. Important subjects and text must remain in frame, with smooth and manually correctable movement when promised. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **CROP-011** Provide manual focus point and tracking correction controls
  - **How to test this feature:** Use an obvious moving subject; watch the crop follow it correctly through several different positions. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **CROP-012** Generate independent reframing variants per output target
  - **How to test this feature:** Create 16:9 and 9:16 versions of the same moving shot. Verify each version stores its own crop adjustments without changing the other version. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **CROP-013** Flag unsatisfactory or untrackable automatic crops
  - **How to test this feature:** Use an obvious moving subject; watch the crop follow it correctly through several different positions. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.

### 16. Short-form discovery and Content Factory

> **What this section means / where to start:** Many *complete* videos from long footage. **Where:** AI Director candidate board. **Start with:** two real events and irrelevant source material.


- [ ] **SHORT-001** Identify comedy, action, learning, insights, interview, podcast, and gaming highlights
  - **How to test this feature:** Request the stated output, watch each proposed video from beginning to end and compare its shots with the original sources. Reject missing setups, repeated filler or invented continuity. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **SHORT-002** Require setup and payoff when generating story-based clips
  - **How to test this feature:** Generate from a source with a complete real event and verify setup, action and resolution are visible in the edited candidate. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **SHORT-003** Allow natural clip length when the complete story requires it
  - **How to test this feature:** Generate from a source with a complete real event and verify setup, action and resolution are visible in the edited candidate. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **SHORT-004** Search distant source segments when meaningfully connected
  - **How to test this feature:** Request the stated output, watch each proposed video from beginning to end and compare its shots with the original sources. Reject missing setups, repeated filler or invented continuity. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **SHORT-005** Preserve contextual reactions and relevant action footage
  - **How to test this feature:** Generate from a source with a complete real event and verify setup, action and resolution are visible in the edited candidate. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **SHORT-006** Generate several candidates only when distinct valid stories exist
  - **How to test this feature:** Provide a recording with exactly two complete events plus unrelated material; ask for five shorts. The tool should avoid inventing three filler stories. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **SHORT-007** Detect duplicate stories across proposed outputs
  - **How to test this feature:** Generate several candidates from overlapping footage and verify unnecessary identical stories are flagged. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **SHORT-008** Minimize needless reuse of identical source ranges
  - **How to test this feature:** Generate several candidates from overlapping footage and verify unnecessary identical stories are flagged. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** These are professional editable-timeline interchange formats.
- [ ] **SHORT-009** Rank candidates with evidence and transparent rationale
  - **How to test this feature:** Request the stated output, watch each proposed video from beginning to end and compare its shots with the original sources. Reject missing setups, repeated filler or invented continuity. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **SHORT-010** Allow manual selection, deletion, and revision of candidates
  - **How to test this feature:** Request the stated output, watch each proposed video from beginning to end and compare its shots with the original sources. Reject missing setups, repeated filler or invented continuity. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **SHORT-011** Produce editable individual timelines per candidate
  - **How to test this feature:** Request the stated output, watch each proposed video from beginning to end and compare its shots with the original sources. Reject missing setups, repeated filler or invented continuity. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **SHORT-012** Create long-form compilations of approved stories
  - **How to test this feature:** Request the stated output, watch each proposed video from beginning to end and compare its shots with the original sources. Reject missing setups, repeated filler or invented continuity. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **SHORT-013** Generate horizontal, vertical, square, and feed variants
  - **How to test this feature:** Create different 16:9 and 9:16 versions and inspect both captions and cropping in the rendered files. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **SHORT-014** Generate teaser and trailer versions from the same project
  - **How to test this feature:** Request the stated output, watch each proposed video from beginning to end and compare its shots with the original sources. Reject missing setups, repeated filler or invented continuity. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **SHORT-015** Apply optional brand profiles consistently across variants
  - **How to test this feature:** Create different 16:9 and 9:16 versions and inspect both captions and cropping in the rendered files. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **SHORT-016** Batch produce captions and language variants
  - **How to test this feature:** Create different 16:9 and 9:16 versions and inspect both captions and cropping in the rendered files. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **SHORT-017** Create draft titles, descriptions, chapters, hashtags, and thumbnails
  - **How to test this feature:** Produce actual suggested metadata/graphics and compare claims against the original sources for accuracy. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **SHORT-018** Offer thumbnail selection and template-based design
  - **How to test this feature:** Generate several thumbnail choices from real source footage or labeled generated assets and review them before export. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **SHORT-019** Maintain an output inventory showing rendered/not-rendered state
  - **How to test this feature:** Request the stated output, watch each proposed video from beginning to end and compare its shots with the original sources. Reject missing setups, repeated filler or invented continuity. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **SHORT-020** Flag outputs that use unlicensed or restricted media
  - **How to test this feature:** Request the stated output, watch each proposed video from beginning to end and compare its shots with the original sources. Reject missing setups, repeated filler or invented continuity. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **SHORT-021** Optional publication/scheduling integration with explicit authorization
  - **How to test this feature:** Request the stated output, watch each proposed video from beginning to end and compare its shots with the original sources. Reject missing setups, repeated filler or invented continuity. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.

### 17. Generative media and responsible AI

> **What this section means / where to start:** Optional computer-generated images, sound or video. **Where:** future generation workspace, if built. **Start with:** non-sensitive, licensed test content.


- [ ] **GEN-001** Optional generated B-roll and illustrative visual assets
  - **How to test this feature:** Use a safe prompt and verify a real asset is generated, downloadable/editable and clearly labeled as synthetic. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **GEN-002** Optional AI-assisted images and thumbnails
  - **How to test this feature:** Use a safe prompt and verify a real asset is generated, downloadable/editable and clearly labeled as synthetic. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **GEN-003** Optional generated backgrounds and scene cards
  - **How to test this feature:** Use a safe prompt and verify a real asset is generated, downloadable/editable and clearly labeled as synthetic. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **GEN-004** Optional AI sound effects and music subject to licensing
  - **How to test this feature:** Use a safe prompt and verify a real asset is generated, downloadable/editable and clearly labeled as synthetic. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **GEN-005** Optional shot extension, inpainting, and object removal
  - **How to test this feature:** Apply the named change to a short disposable clip and confirm visual continuity and original media preservation. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **GEN-006** Optional animated diagrams and visualization assets
  - **How to test this feature:** Use a safe prompt and verify a real asset is generated, downloadable/editable and clearly labeled as synthetic. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **GEN-007** Optional AI video/style transformations with realistic capability disclosure
  - **How to test this feature:** Use a safe prompt and verify a real asset is generated, downloadable/editable and clearly labeled as synthetic. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **GEN-008** Label generated content separately from original footage
  - **How to test this feature:** Create a clearly labeled generated asset; confirm it's distinguishable from original footage in both the media library and project export. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **GEN-009** Keep source media intact and reversible
  - **How to test this feature:** Ask for a real generated media asset, inspect the output and whether it is distinguished from originals, then verify it can be reviewed or removed without damaging the source. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **GEN-010** Never substitute synthetic scenes for real-world evidence without disclosure
  - **How to test this feature:** Insert synthetic illustrative footage into a documentary-style project, then inspect preview, timeline and project metadata. The synthetic scene must be visibly disclosed and never passed off as original event evidence. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **GEN-011** Keep generative costs, limits, and provenance visible
  - **How to test this feature:** Inspect the generated asset's label, rights/cost disclosure and source attribution before export. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** Provenance is the original filename and timestamp behind a shot or claim.
- [ ] **GEN-012** Require approval before generated material enters evidence-sensitive edits
  - **How to test this feature:** Use a safe prompt and verify a real asset is generated, downloadable/editable and clearly labeled as synthetic. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.

### 18. Export, encoding, and delivery

> **What this section means / where to start:** Actual final output creation. **Where:** Export. **Start with:** a short edit with captions and audio; open the downloaded file afterward.


- [ ] **EXP-001** Browser-compatible preview export for short jobs
  - **How to test this feature:** Choose an output name, export, inspect the file and reopen project metadata where supported. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **EXP-002** Production-quality deterministic rendering through supported native backend
  - **How to test this feature:** Set a nondefault value, export, and inspect the real resulting file properties rather than the UI dropdown. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **EXP-003** Encode MP4/H.264/AAC where supported
  - **How to test this feature:** Choose each claimed codec/format and render a short sample; inspect the playable file's actual media streams. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **EXP-004** Encode H.265, AV1, VP9, or professional intermediates where available
  - **How to test this feature:** Choose each claimed codec/format and render a short sample; inspect the playable file's actual media streams. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **EXP-005** Export WebM and supported image/animation formats
  - **How to test this feature:** Choose each claimed codec/format and render a short sample; inspect the playable file's actual media streams. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **EXP-006** Export audio-only WAV, MP3, FLAC, or supported alternatives
  - **How to test this feature:** Choose each claimed codec/format and render a short sample; inspect the playable file's actual media streams. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **EXP-007** Export still frames and image sequences
  - **How to test this feature:** Choose an output name, export, inspect the file and reopen project metadata where supported. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **EXP-008** Offer 480p, 720p, 1080p, 1440p, 4K, and custom resolution
  - **How to test this feature:** Set a nondefault value, export, and inspect the real resulting file properties rather than the UI dropdown. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **EXP-009** Offer common and source-matched frame rates including fractional FPS
  - **How to test this feature:** Set a nondefault value, export, and inspect the real resulting file properties rather than the UI dropdown. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **EXP-010** Set CBR/VBR/quality-based bitrate and supported codec options
  - **How to test this feature:** Choose each claimed codec/format and render a short sample; inspect the playable file's actual media streams. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** A codec is the method used to encode or decode actual audio/video.
- [ ] **EXP-011** Select SDR/HDR color profile and supported bit depth
  - **How to test this feature:** Set a nondefault value, export, and inspect the real resulting file properties rather than the UI dropdown. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** HDR preserves higher brightness/color range when the whole pipeline supports it.
- [ ] **EXP-012** Choose hardware or software encoder, with real capability testing
  - **How to test this feature:** Choose each claimed codec/format and render a short sample; inspect the playable file's actual media streams. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **EXP-013** Control audio codec, channel layout, bitrate, and sample rate
  - **How to test this feature:** Choose each claimed codec/format and render a short sample; inspect the playable file's actual media streams. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** A codec is the method used to encode or decode actual audio/video.
- [ ] **EXP-014** Burn captions, export sidecar captions, or embed supported caption tracks
  - **How to test this feature:** Render a captioned and mixed-audio sample and confirm exact timing and intended audio/caption track behavior. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** Burned-in captions are permanently visible in the output pixels.
- [ ] **EXP-015** Export full timeline, in/out range, or selected clips
  - **How to test this feature:** Choose an output name, export, inspect the file and reopen project metadata where supported. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **EXP-016** Export batch variants by platform, aspect, language, and quality
  - **How to test this feature:** Queue at least two output presets (for example 16:9 horizontal and 9:16 vertical) and verify two distinct playable files are produced with their own correct caption and quality settings. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **EXP-017** Preview expected output settings, size estimates, and unsupported features
  - **How to test this feature:** Set the specified output option, render a real file, open it after download, and inspect its playback, format, timing and settings. A progress bar alone is not proof. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **EXP-018** Provide destination naming templates and project metadata
  - **How to test this feature:** Choose an output name, export, inspect the file and reopen project metadata where supported. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **EXP-019** Show frame-based progress, actual errors, and render logs
  - **How to test this feature:** Render a short video and inspect real frame counts, progress, output logs and error paths instead of relying on a cosmetic percentage. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **EXP-020** Allow queueing, cancellation, and resume where backend supports it
  - **How to test this feature:** Queue multiple outputs, cancel one test and verify truthful status plus preservation of other finished files. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **EXP-021** Verify output exists, decodes, and has correct duration and streams
  - **How to test this feature:** Export a file, open it with a media player, and compare actual duration, video/audio tracks, and intended format to your settings. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **EXP-022** Inspect final rendered audio sync, captions, black frames, and clipping
  - **How to test this feature:** Choose each claimed codec/format and render a short sample; inspect the playable file's actual media streams. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **EXP-023** Never report export success based solely on progress reaching 100%
  - **How to test this feature:** Cause a harmless export failure (such as unavailable output codec) and verify the app shows FAILED rather than 'Exported successfully'. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **EXP-024** Preserve completed output files if a later batch item fails
  - **How to test this feature:** Queue multiple outputs, cancel one test and verify truthful status plus preservation of other finished files. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **EXP-025** Download output with reliable filename and format extension
  - **How to test this feature:** Choose an output name, export, inspect the file and reopen project metadata where supported. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **EXP-026** Package project and linked source metadata for portable archiving
  - **How to test this feature:** Choose an output name, export, inspect the file and reopen project metadata where supported. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.

### 19. Reliability, performance and resumability

> **What this section means / where to start:** Avoid losing work during long processing and errors. **Where:** settings, job status, storage, Production Tools. **Start with:** saved backup and safe interrupted test.


- [ ] **REL-001** Use bounded streaming reads for multi-hour recordings
  - **How to test this feature:** Trigger a safe restart, disconnection or selected failure scenario and check what was actually saved, restored and reported. Do not accept a fake completion or silent fallback. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **REL-002** Avoid decoding complete long-form media into JS heap at once
  - **How to test this feature:** Trigger a safe restart, disconnection or selected failure scenario and check what was actually saved, restored and reported. Do not accept a fake completion or silent fallback. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **REL-003** Chunked transcription, waveform, visual, and export jobs
  - **How to test this feature:** Trigger a safe restart, disconnection or selected failure scenario and check what was actually saved, restored and reported. Do not accept a fake completion or silent fallback. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **REL-004** Save granular checkpoints after completed processing chunks
  - **How to test this feature:** Start a long disposable processing job, interrupt it, reopen and verify previously completed chunks and edits remain intact. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** A checkpoint is saved progress that supports resuming later.
- [ ] **REL-005** Resume safely after browser reload or server restart when persistent backend exists
  - **How to test this feature:** Interrupt an actual backed-up analysis job, restart the backend and verify the next run resumes from a saved verified checkpoint. Browser-only work may stop when the tab closes. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **REL-006** Distinguish resumed processing from continuously running background work
  - **How to test this feature:** Start a long disposable processing job, interrupt it, reopen and verify previously completed chunks and edits remain intact. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **REL-007** Keep completed intermediate results after a later-stage error
  - **How to test this feature:** Trigger a safe restart, disconnection or selected failure scenario and check what was actually saved, restored and reported. Do not accept a fake completion or silent fallback. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **REL-008** Retry only failed intervals with bounded exponential backoff
  - **How to test this feature:** Use an instrumented disposable job or inspect a dedicated test that simulates one failed chunk. Verify only that chunk is retried, retries are limited and a recoverable error is reported accurately. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **REL-009** Validate each checkpoint and its source/media identity before reuse
  - **How to test this feature:** Start a long disposable processing job, interrupt it, reopen and verify previously completed chunks and edits remain intact. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** A checkpoint is saved progress that supports resuming later.
- [ ] **REL-010** Provide clear queued, running, paused, complete, warning, failed states
  - **How to test this feature:** Test a supported and an unsupported execution backend and verify the error/fallback label matches what actually ran. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **REL-011** Show actual current processing file, time range, model, and throughput
  - **How to test this feature:** Test a supported and an unsupported execution backend and verify the error/fallback label matches what actually ran. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **REL-012** Offer ETA only when grounded in observed performance
  - **How to test this feature:** Observe a real job from start through completion/failure and confirm statuses, percentages, ETA and logs match actual work. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **REL-013** Limit memory, worker count, model concurrency, and cache usage
  - **How to test this feature:** Use a long source and monitor memory/storage use or cache behavior; the app must warn and retain projects instead of crashing silently. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **REL-014** Detect GPU device loss and recover with supported fallback or clear failure
  - **How to test this feature:** Force an unsupported GPU model/backend in a disposable test and confirm the failure is reported or a clearly labeled supported fallback is used. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **REL-015** Handle model initialization and unsupported backend errors explicitly
  - **How to test this feature:** Test a supported and an unsupported execution backend and verify the error/fallback label matches what actually ran. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **REL-016** Never silently replace requested AI behavior with unrelated output
  - **How to test this feature:** Trigger a safe restart, disconnection or selected failure scenario and check what was actually saved, restored and reported. Do not accept a fake completion or silent fallback. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **REL-017** Detect storage quota and pause before potentially losing work
  - **How to test this feature:** Use a long source and monitor memory/storage use or cache behavior; the app must warn and retain projects instead of crashing silently. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **REL-018** Cache model downloads and verified analysis across sessions when storage permits
  - **How to test this feature:** Use a long source and monitor memory/storage use or cache behavior; the app must warn and retain projects instead of crashing silently. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **REL-019** User-controlled cache cleanup without deleting important projects
  - **How to test this feature:** Delete a disposable cache category, then reopen the project and verify project metadata and approved snapshots remain intact. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **REL-020** Support offline UI and eligible locally cached functionality
  - **How to test this feature:** Use a long source and monitor memory/storage use or cache behavior; the app must warn and retain projects instead of crashing silently. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **REL-021** Offer logs, diagnostics export, and environment capability report
  - **How to test this feature:** Observe a real job from start through completion/failure and confirm statuses, percentages, ETA and logs match actual work. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **REL-022** Verify saved projects reopen with correct edits and source references
  - **How to test this feature:** Save and reopen a small project in a supported offline scenario; confirm what is cached and what is unavailable is accurately stated. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **REL-023** Never fabricate task completion when a worker exits unexpectedly
  - **How to test this feature:** Use a long source and monitor memory/storage use or cache behavior; the app must warn and retain projects instead of crashing silently. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** These are professional editable-timeline interchange formats.
- [ ] **REL-024** Keep working manual editor usable while AI services fail
  - **How to test this feature:** Test a supported and an unsupported execution backend and verify the error/fallback label matches what actually ran. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **REL-025** Prevent run-away batch work and unbounded retries
  - **How to test this feature:** Trigger a safe restart, disconnection or selected failure scenario and check what was actually saved, restored and reported. Do not accept a fake completion or silent fallback. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.

### 20. Model, compute and cloud provider settings

> **What this section means / where to start:** Prove which model, hardware and provider did the AI work. **Where:** Settings/AI Director. **Start with:** known sample and watch actual model status.


- [ ] **MODEL-001** Select local-only, hybrid, or authorized cloud processing per project
  - **How to test this feature:** Choose a named compatible model/backend, run known input and verify it actually initializes and returns the expected output. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **MODEL-002** Separate models by ASR, diarization, vision, embeddings, Director, audio, and generation
  - **How to test this feature:** Choose a named compatible model/backend, run known input and verify it actually initializes and returns the expected output. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** Diarization is labeling when each speaker talks.
- [ ] **MODEL-003** Install/select compatible on-device models when available
  - **How to test this feature:** Choose a named compatible model/backend, run known input and verify it actually initializes and returns the expected output. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **MODEL-004** Select CPU, WebGPU, WASM, or remote execution when supported
  - **How to test this feature:** Choose a named compatible model/backend, run known input and verify it actually initializes and returns the expected output. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** WebGPU is browser access to a supported graphics processor.
- [ ] **MODEL-005** Expose actual model names, versions, download sizes, and compatibility
  - **How to test this feature:** Choose a named compatible model/backend, run known input and verify it actually initializes and returns the expected output. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **MODEL-006** Verify model loads and produces expected output on a test clip
  - **How to test this feature:** Choose a named compatible model/backend, run known input and verify it actually initializes and returns the expected output. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **MODEL-007** Offer downloadable or cached local models where practical
  - **How to test this feature:** Choose a named compatible model/backend, run known input and verify it actually initializes and returns the expected output. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **MODEL-008** Select processing quality, visual sample rate, chunk sizes, and concurrency
  - **How to test this feature:** Change processing quality, visual sample rate, chunk size and concurrency separately. Run a small job each time and verify logs or measured behavior reflect the selected value. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **MODEL-009** Configure timeouts, context, inference limits, and retry policy
  - **How to test this feature:** Set a visible nondefault processing limit, run a short job and verify the configured setting is honored. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **MODEL-010** Allow bring-your-own-provider API keys with secure handling guidance
  - **How to test this feature:** Switch between local and cloud modes using test credentials; verify media is not uploaded without explicit permission. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** An API/provider may be an external service, not a local model.
- [ ] **MODEL-011** Never embed application-owner secret keys in public front-end code
  - **How to test this feature:** Switch between local and cloud modes using test credentials; verify media is not uploaded without explicit permission. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **MODEL-012** Require permission before sending media or transcripts to external providers
  - **How to test this feature:** Switch between local and cloud modes using test credentials; verify media is not uploaded without explicit permission. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **MODEL-013** Show exact provider/service used for each processing stage
  - **How to test this feature:** Switch between local and cloud modes using test credentials; verify media is not uploaded without explicit permission. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **MODEL-014** Estimate external inference costs before starting heavy jobs
  - **How to test this feature:** Before a costly external AI job, inspect its provider-specific cost estimate and approval threshold. Run a small real job, compare displayed usage to the actual provider result where available, and ensure no costly work silently starts. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **MODEL-015** Show per-job model usage, tokens where applicable, and cost estimates
  - **How to test this feature:** Run a small provider job and inspect displayed token usage, model name, request count and estimated cost for that specific job; compare with provider billing/usage if available. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **MODEL-016** Set per-job and monthly external spending caps
  - **How to test this feature:** Perform a small measured call and compare provider usage/cost estimates with the app's visible accounting. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **MODEL-017** Reuse completed model output to avoid paying for duplicate analysis
  - **How to test this feature:** Choose a named compatible model/backend, run known input and verify it actually initializes and returns the expected output. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **MODEL-018** Allow model/provider fallback only when disclosed and approved
  - **How to test this feature:** Choose a named compatible model/backend, run known input and verify it actually initializes and returns the expected output. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **MODEL-019** Persist nonsecret model preferences across projects
  - **How to test this feature:** Choose a named compatible model/backend, run known input and verify it actually initializes and returns the expected output. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **MODEL-020** Provide local model diagnostic and performance benchmarking page
  - **How to test this feature:** Choose a named compatible model/backend, run known input and verify it actually initializes and returns the expected output. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.

### 21. Privacy, licensing and provenance

> **What this section means / where to start:** Privacy, permissions, originality and licensing. **Where:** AI prompts, storage and project export. **Start with:** disposable media, never private or irreplaceable files.


- [ ] **SEC-001** Make cloud media upload opt-in and clearly labeled
  - **How to test this feature:** Use a disposable file and verify an explicit permission request appears before any external data transfer. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **SEC-002** Show which files, frames, audio chunks, or transcripts leave the device
  - **How to test this feature:** Before an authorized cloud analysis, inspect a clear disclosure listing the exact source files, sampled frames, audio or transcript chunks being uploaded; check it matches actual requests. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **SEC-003** Require explicit permission for voice or likeness cloning
  - **How to test this feature:** Use a disposable file and verify an explicit permission request appears before any external data transfer. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **SEC-004** Allow provider credentials to be removed
  - **How to test this feature:** Enter a disposable provider API key, use the actual Forget/Remove control, refresh, and verify the key is no longer present or used. Saving a project JSON without a key is not enough. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **SEC-005** Preserve original file/source attribution and timestamp provenance
  - **How to test this feature:** Inspect an exported sample and project metadata for appropriate original-source and generated-content labels. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** Provenance is the original filename and timestamp behind a shot or claim.
- [ ] **SEC-006** Indicate when clips, narration, captions, or images are AI-generated
  - **How to test this feature:** Inspect an exported sample and project metadata for appropriate original-source and generated-content labels. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **SEC-007** Warn about misleading real-world event reconstructions
  - **How to test this feature:** Verify the named privacy restriction using a real consent, export or sharing action. Reject unexpected external uploads or credentials appearing in saved files. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **SEC-008** Record rights/licensing information for third-party music and assets
  - **How to test this feature:** Verify the named privacy restriction using a real consent, export or sharing action. Reject unexpected external uploads or credentials appearing in saved files. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **SEC-009** Avoid bundling unlicensed music or copyrighted media
  - **How to test this feature:** Inspect installed asset libraries and example projects. Confirm unlicensed commercial music or other protected media is not bundled or exported without authorization. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **SEC-010** Support local project deletion and cache/data cleanup
  - **How to test this feature:** Delete only disposable project data and confirm selected cached data is removed without harming other projects. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **SEC-011** Provide optional accountless local workflows
  - **How to test this feature:** Verify the named privacy restriction using a real consent, export or sharing action. Reject unexpected external uploads or credentials appearing in saved files. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **SEC-012** Validate imported files and disallow unsafe path traversal in bundles
  - **How to test this feature:** Verify the named privacy restriction using a real consent, export or sharing action. Reject unexpected external uploads or credentials appearing in saved files. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **SEC-013** Avoid exposing API tokens in logs or exported project files
  - **How to test this feature:** Export project metadata and logs, and confirm full API credentials are not present. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** An API/provider may be an external service, not a local model.
- [ ] **SEC-014** Explain browser storage limitations and data-loss risks
  - **How to test this feature:** Delete only disposable project data and confirm selected cached data is removed without harming other projects. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **SEC-015** Require explicit authorization for publishing or externally sharing projects
  - **How to test this feature:** Verify the named privacy restriction using a real consent, export or sharing action. Reject unexpected external uploads or credentials appearing in saved files. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **SEC-016** Support per-project disclosure and authenticity metadata
  - **How to test this feature:** Verify the named privacy restriction using a real consent, export or sharing action. Reject unexpected external uploads or credentials appearing in saved files. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.

### 22. Test coverage, validation and quality gates

> **What this section means / where to start:** Regression test evidence, not a promise of finished functionality. **Where:** GitHub Actions and tests/. **Start with:** inspect a test file and its most recent successful run.


- [ ] **TEST-001** Test basic import/playback/trim/export without any AI service
  - **How to test this feature:** Open the relevant GitHub Actions run and test file; verify it really exercises the named real scenario and passes. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **TEST-002** Test two-hour and three-hour video sources without unbounded memory growth
  - **How to test this feature:** Open the relevant GitHub Actions run and test file; verify it really exercises the named real scenario and passes. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **TEST-003** Test simultaneous large sources and independent audio tracks
  - **How to test this feature:** Open the relevant GitHub Actions run and test file; verify it really exercises the named real scenario and passes. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **TEST-004** Test variable-frame-rate time mapping and A/V synchronization
  - **How to test this feature:** Open the relevant GitHub Actions run and test file; verify it really exercises the named real scenario and passes. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **TEST-005** Test transcription includes recording start and end
  - **How to test this feature:** Open the relevant GitHub Actions run and test file; verify it really exercises the named real scenario and passes. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **TEST-006** Test gaps, low-volume segments, and overlapping speaker recognition
  - **How to test this feature:** Open the relevant GitHub Actions run and test file; verify it really exercises the named real scenario and passes. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **TEST-007** Test source SRT relinking preserves correct timestamps
  - **How to test this feature:** Open the relevant GitHub Actions run and test file; verify it really exercises the named real scenario and passes. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **TEST-008** Test true multi-POV overlap alignment and drift correction
  - **How to test this feature:** Open the relevant GitHub Actions run and test file; verify it really exercises the named real scenario and passes. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** Multicam/Multi-POV combines recordings of the same real event.
- [ ] **TEST-009** Test event matching rejects unrelated camera footage
  - **How to test this feature:** Open the relevant GitHub Actions run and test file; verify it really exercises the named real scenario and passes. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **TEST-010** Test story assembly contains the actual action and relevant reaction
  - **How to test this feature:** Open the relevant GitHub Actions run and test file; verify it really exercises the named real scenario and passes. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **TEST-011** Test candidate count cannot force filler or duplicate stories
  - **How to test this feature:** Open the relevant GitHub Actions run and test file; verify it really exercises the named real scenario and passes. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **TEST-012** Test selected creative brief materially changes the edited result
  - **How to test this feature:** Open the relevant GitHub Actions run and test file; verify it really exercises the named real scenario and passes. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **TEST-013** Test manual cuts survive later AI Director operations
  - **How to test this feature:** Open the relevant GitHub Actions run and test file; verify it really exercises the named real scenario and passes. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **TEST-014** Test effects, subtitles, and audio export match preview
  - **How to test this feature:** Open the relevant GitHub Actions run and test file; verify it really exercises the named real scenario and passes. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **TEST-015** Test browser refresh recovers saved timeline and progress
  - **How to test this feature:** Open the relevant GitHub Actions run and test file; verify it really exercises the named real scenario and passes. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **TEST-016** Test GPU/model/provider failure preserves existing work
  - **How to test this feature:** Open the relevant GitHub Actions run and test file; verify it really exercises the named real scenario and passes. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **TEST-017** Test media source moved/relinked and resumed without corruption
  - **How to test this feature:** Open the relevant GitHub Actions run and test file; verify it really exercises the named real scenario and passes. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **TEST-018** Test cloud API failure reports error and does not fake success
  - **How to test this feature:** Open the relevant GitHub Actions run and test file; verify it really exercises the named real scenario and passes. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** An API/provider may be an external service, not a local model.
- [ ] **TEST-019** Test empty/no-match analysis yields truthful no-results state
  - **How to test this feature:** Open the relevant GitHub Actions run and test file; verify it really exercises the named real scenario and passes. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **TEST-020** Test export validity after cancellation, retries, and batch partial failure
  - **How to test this feature:** Open the relevant GitHub Actions run and test file; verify it really exercises the named real scenario and passes. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **TEST-021** Test final output audio/video is playable and duration is accurate
  - **How to test this feature:** Open the relevant GitHub Actions run and test file; verify it really exercises the named real scenario and passes. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **TEST-022** Test keyboard accessibility and smaller screen layout
  - **How to test this feature:** Open the relevant GitHub Actions run and test file; verify it really exercises the named real scenario and passes. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **TEST-023** Test different output ratios keep faces, HUD, and text in frame
  - **How to test this feature:** Open the relevant GitHub Actions run and test file; verify it really exercises the named real scenario and passes. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **TEST-024** Test no checked acceptance item can be added without owner's explicit approval
  - **How to test this feature:** Inspect tests or permissions showing that a CI bot or coding agent never checks master acceptance boxes without explicit owner approval. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **TEST-025** Test regression cases for all previously reported broken features
  - **How to test this feature:** Open the relevant GitHub Actions run and test file; verify it really exercises the named real scenario and passes. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.

### 23. Longer-term pro additions

> **What this section means / where to start:** Long-term optional professional features. **Where:** only when an implementation exists. **Start with:** leave unchecked until a real UI and processor are delivered.


- [ ] **FUT-001** Optional desktop Windows/macOS/Linux companion
  - **How to test this feature:** Install and launch a real desktop app on its supported operating system; test a project import/export and compare its editing output with the browser version. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **FUT-002** Optional persistent GPU worker service for heavy video analysis
  - **How to test this feature:** Use a configured real GPU worker with a known sample and verify jobs, checkpointing, cost, and final output. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **FUT-003** Real-time screen, microphone, and webcam capture
  - **How to test this feature:** Only test once the named real capability has a functioning UI/backend. Demonstrate its end-to-end result on real input; leave unchecked if it is not built. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **FUT-004** OBS or supported live capture integration
  - **How to test this feature:** Only test once the named real capability has a functioning UI/backend. Demonstrate its end-to-end result on real input; leave unchecked if it is not built. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **FUT-005** Multichannel/surround audio mixing and monitoring
  - **How to test this feature:** Only test once the named real capability has a functioning UI/backend. Demonstrate its end-to-end result on real input; leave unchecked if it is not built. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **FUT-006** Professional HDR finishing and color-managed mastering
  - **How to test this feature:** Only test once the named real capability has a functioning UI/backend. Demonstrate its end-to-end result on real input; leave unchecked if it is not built. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** HDR preserves higher brightness/color range when the whole pipeline supports it.
- [ ] **FUT-007** Advanced rotoscoping and tracking tools
  - **How to test this feature:** Only test once the named real capability has a functioning UI/backend. Demonstrate its end-to-end result on real input; leave unchecked if it is not built. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** Rotoscoping traces objects or people to separate visual layers.
- [ ] **FUT-008** Collaborative real-time editing and reviewer permissions
  - **How to test this feature:** Use a second test account/device and verify edits, permissions and conflicts behave correctly. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **FUT-009** Cloud library and cross-device synchronization when authorized
  - **How to test this feature:** Use a second test account/device and verify edits, permissions and conflicts behave correctly. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **FUT-010** Native effects/transitions/AI-model plugin extension API
  - **How to test this feature:** Install a safe extension or template, verify it appears in the editor and can be removed without project corruption. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** An API/provider may be an external service, not a local model.
- [ ] **FUT-011** User-manageable template and asset marketplace or library
  - **How to test this feature:** Install a safe extension or template, verify it appears in the editor and can be removed without project corruption. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **FUT-012** Professional motion tracking and 3D compositing tools
  - **How to test this feature:** Only test once the named real capability has a functioning UI/backend. Demonstrate its end-to-end result on real input; leave unchecked if it is not built. **Pass only if** the entire requirement works; if the option is missing, leave unchecked. **Term:** These are professional editable-timeline interchange formats.
- [ ] **FUT-013** Immersive/360 video editing where supported
  - **How to test this feature:** Only test once the named real capability has a functioning UI/backend. Demonstrate its end-to-end result on real input; leave unchecked if it is not built. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **FUT-014** Automated but explicitly authorized publishing and scheduling
  - **How to test this feature:** Only test once the named real capability has a functioning UI/backend. Demonstrate its end-to-end result on real input; leave unchecked if it is not built. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.
- [ ] **FUT-015** Advanced project analytics based on actual export/feedback data
  - **How to test this feature:** Only test once the named real capability has a functioning UI/backend. Demonstrate its end-to-end result on real input; leave unchecked if it is not built. **Pass only if** the entire requirement works; if the option is missing, leave unchecked.

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
