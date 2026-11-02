# Publish to GitHub

## Web interface (simple)

1. Go to https://github.com/new and create a public repository named `shortform-studio`. Do **not** initialize it with a README, .gitignore, or license because those already exist here.
2. Extract `shortform-studio-source.zip` on your computer.
3. In the empty repository choose **uploading an existing file** (or **Add file → Upload files**), and upload the contents of the extracted `shortform-studio` folder. Include the hidden `.github/workflows/deploy-pages.yml` file if your file picker hides dot folders. Commit to `main`.
4. In **Settings → Pages**, choose **GitHub Actions** as the build/deployment source. Allow the `Deploy ShortForm Studio to GitHub Pages` workflow to run.
5. Open the Pages URL shown under Settings → Pages when deployment succeeds.

## Using Git (alternative)

```bash
# From the extracted shortform-studio directory
git init -b main
git add .
git commit -m "Build ShortForm Studio editor"
git remote add origin https://github.com/YOUR_USERNAME/shortform-studio.git
git push -u origin main
```

## Run locally

```bash
python3 -m http.server 8080
```

Open http://localhost:8080 — do not open the HTML using file://.

## After first launch

1. Import browser-compatible source media.
2. Choose a source, set start/end, and add it to the video timeline.
3. In Transcript, import SRT or use local Whisper. The model loads from the internet the first time.
4. In AI Director, request source-faithful multi-timestamp story proposals.
5. Review/edit the cuts and captions. Check Export → Preflight.
6. Render to MP4 if the browser supports it, otherwise WebM. Always verify exported audio/video sync.

**Note:** This is a functional alpha, not a finished commercial-grade editor. Read README and PRODUCT_SPEC to see exactly what is implemented and what remains to be built.
