# Repository demo media

All recordings use fictional values: age 35, male, 170 cm, 70 kg, healthy, good fitness, moderate exercise habit, a health goal, and seven “no” screening answers. These inputs demonstrate the UI and do not recommend a plan for any real person.

- `demo.gif`: 24.6-second walkthrough, 760px wide, approximately 1 MB. Embedded in both READMEs.
- `demo.mp4`: 1280×720 H.264 recording with intro/outro cards, 24.6 seconds, no audio.
- `demo-short.mp4`: 13-second excerpt for a short social post.
- `social-preview.png`: 1280×640 repository social preview. Upload in GitHub **Settings → General → Social preview** after reviewing it.
- `social-preview.html`: source for the preview, rendered at 1280×640 with Chromium. It uses the project's existing sports illustration and system fonts.

The recording was captured from a clean `4e6282e` snapshot with no `.env`. The script verifies that no `/api/ai-recommendation` request occurs; standard prescription generation and PDF download are real. Page fonts may be requested from Google Fonts. No usage-count or clinical-validation claim is included.

## Reproduce

Start the local server from a clean checkout without keys. With Playwright and FFmpeg installed:

```bash
python scripts/record-demo.py --base-url http://127.0.0.1:3000 --output /tmp/exercise-demo
ffmpeg -i /tmp/exercise-demo/walkthrough.webm -c:v libx264 -crf 24 -pix_fmt yuv420p -movflags +faststart -an docs/media/demo.mp4
ffmpeg -i docs/media/demo.mp4 -vf 'fps=10,scale=760:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=80:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle' docs/media/demo.gif
```

Keep the GIF below 6 MB and the full walkthrough below 45 seconds. Review the actual recording before publishing. This media is for GitHub and social drafts; the production asset allowlist excludes it.
