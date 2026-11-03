# Kerby James Pajaron — Grand Line Portfolio V5

An upgrade of the existing HTML/CSS/JavaScript portfolio, retaining the original character images, professional portrait, uploaded “We Are!” music, education, six projects, and exact social URLs. No runtime libraries, npm installation, build step, account, or backend are required.

## Run locally

Start **Apache** in the XAMPP Control Panel, then open:

**http://localhost/kerby_one_piece_ultimate/**

Refresh with **Ctrl+Shift+R** after editing. Apache was stopped during development; browser QA used its own temporary local server.

Alternatively, from this project directory:

```powershell
python -m http.server 8080 --bind 127.0.0.1
```

Open **http://127.0.0.1:8080/**. Stop that server with Ctrl+C. Use HTTP rather than opening the HTML directly so media, storage, and browser behavior match hosting.

## Controls

| Action | Control |
| --- | --- |
| Navigate | Header navigation; arrow keys; Page Up/Down; mouse wheel on a section without scrollable content |
| Read long sections | Scroll vertically; mobile vertical gestures retain native scrolling |
| Mobile navigation | Swipe horizontally outside the project deck and interactive controls |
| Home / last section | Home / End; Escape returns home when no dialog is open |
| Help, settings, map | H or ?; Guide in the footer |
| Mute both music and effects | M; footer sound control |
| Enable and check playback | Sound control when audio is off, or Help → Enable & test sound |
| Restart existing music | R |
| Project details | Select any card or its details button |
| Project carousel | Arrow buttons, drag with a mouse, swipe on touch, or left/right keys while the deck is focused |
| Gallery / mini-game | Home artwork actions or Help |
| Close dialog | Escape or the close button; Tab stays inside and focus returns to the opener |

Keyboard shortcuts ignore inputs, textareas, selects, and editable content. The Help guide includes clues for the optional pirate secrets. Achievements describe visitor activities and do not imply professional awards.

## Files changed

| Files | Responsibility |
| --- | --- |
| `index.html` | Semantic six-section content, original images/socials, carousel, footer, shared native dialog, one audio element |
| `style.css` | Red/black/white manga layout, slide/wipe transitions, intro, responsive typography, focus styles, motion/performance modes |
| `script.js` | One navigation lock, keyboard/wheel/touch controls, settings, shared dialogs, project data/details, carousel, skill tabs |
| `effects.js` | Letter reveals, pointer parallax, spotlight, tilts, magnetic buttons, bounded particle bursts, contact particles |
| `dramatic-intro.js` | Measured asset loading, error deadlines, skip entry, final wipe, loader fail-safe |
| `portrait-upgrade.css` | Floating wanted poster and portrait effects |
| `my-work.css` | Project previews, snap carousel, card entrances/glow, technology/status animation |
| `audio-upgrade.js`, `audio-upgrade.css` | Unified music/SFX settings, compliant playback retry, fades, actual audio analyser visualizer |
| `help.js`, `help.css` | Keyboard-accessible guide, map, volume sliders, persisted motion controls |
| `ultimate.js`, `ultimate.css` | Named crew gallery, distinct transitions, scored treasure hunt, progress, achievements, secrets |
| `assets/project-*.svg` | Original, clearly labeled concept diagrams; no fabricated project screenshots |
| `assets/portfolio-preview.png` | Actual screenshot of this upgraded local website |
| `tests/browser_qa.mjs` | Dependency-free Chromium browser validation, transition timing probes, and screenshot capture |
| `tests/audio_regression.mjs` | Buffering and pending-play/background regression checks |
| `UPGRADE_CHECKLIST.md` | All 50 effects, 15 additional features, verification scope, and limitations |
| `.gitignore`, `.nojekyll` | Exclude local QA/backup artifacts and support static publication |

All original root source files were copied to **`artifacts/original-v4/` before modification**. Original image/music assets are intact. The former unconnected `ultimate.js` features are now integrated through the shared dialog without a floating control dock.

## Audio and motion

The single `#soundtrack` element retains `assets/we-are-intro.mp3`. Initial audible autoplay is attempted; browser rejection is handled silently and retried after a normal pointer or keyboard interaction. The footer enables sound when playback is off, and mutes when it is already audible. Help includes **Enable & test sound**, which enables the audio system and plays a short original test effect while respecting the two saved volume levels. The song is not recreated or restarted during navigation. Muting and independent music/SFX levels persist locally. Playback pauses while the page is hidden, and resumes when permitted. The visualizer reads actual frequency data and stays still when audio is paused or reduced motion is active.

Music retains native playback when opened through `file://` or when its source has a different origin; the visualizer stays idle in those cases so an analyser cannot silence the track. Serve through the local HTTP address for the full visualizer. CSS and JavaScript references include a V5.2 cache version; use Ctrl+Shift+R once to load this sound fix in an already open browser tab.

Help contains Cinematic, Performance, and Reduced Motion settings. OS `prefers-reduced-motion` takes precedence even if the saved toggle is off. Performance mode starts automatically on devices reporting at most four CPU threads or 4 GB memory unless a visitor has already saved a preference. No FPS guarantee is made; low-end devices can disable motion entirely.

Storage keys use the `kjp-v5-` prefix for settings, visited islands, visitor achievements, and personal best. Old `kjp-music-muted` is migrated when no newer mute setting exists. If local storage is unavailable, the site keeps working with session-memory settings.

## V5.2 follow-up

V5.2 also fixes buffering being mistaken for audible playback, delayed playback restoring volume in a hidden tab, and navigation unlocking before its visual transition finishes. The intro now covers the loader with a complete manga wipe and unlocks controls after the final panel leaves. Reduced motion remains immediate.

## Content and publishing limitations

- Existing development statuses are retained. Nails by Michelle has no verified completion/deployment claim; Yapo remains proposed; KERLOV.TV and INKVERSE remain in development.
- No external project demo URLs or original project screenshots were provided. Five projects show labeled concept diagrams; the portfolio shows its actual local screenshot. Add real screenshots and verified URLs to the `projectDetails` array in `script.js` when available, together with the corresponding card image in `index.html`.
- Exact supplied social URLs and `noopener noreferrer` were checked. Browser QA does not log into or certify third-party account availability.
- The uploaded soundtrack is copyrighted. For public distribution, replace it with a track you have permission to use. Put the licensed file in `assets/`, change `#soundtrack`'s `src` in `index.html`, and update the soundtrack name in `audio-upgrade.js` and `help.js`. Nothing in the audio engine depends on the original filename. Review character artwork permissions for the intended publication too.
- Audio behavior was checked in headless Edge with autoplay policy intact. That confirms playback state and timing, not human listening quality or every browser/device policy.

## Publish the static site to GitHub Pages

1. Prepare the public soundtrack/artwork as described above.
2. Create or select a GitHub repository. Upload **`index.html`, all root `.css` and `.js` files, `.nojekyll`, and `assets/`** to its root, retaining letter case and relative paths. Keep `artifacts/` out of the upload; it contains backups and browser profiles. This workspace did not initially contain a Git repository.
3. In the repository, open **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, select your publishing branch (usually `main`) and **`/ (root)`**, then **Save**.
4. Wait for the Pages deployment to finish, then open the URL displayed by GitHub. A project repository normally uses `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`.
5. Check navigation, all image paths, and music after an ordinary interaction on the published site. The portfolio is static; the PHP/Next.js projects described in the cards are separate projects and are not deployed by publishing this portfolio.

These steps follow GitHub's official [publishing-source instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) and [site-creation guide](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site). No website was uploaded or published during this local upgrade.

## Verify changes

Syntax checks (PowerShell):

```powershell
Get-ChildItem -Filter '*.js' -File | ForEach-Object { node --check $_.FullName }
```

Browser suite (requires Node 20+ and an installed Edge/Chrome):

```powershell
node tests\browser_qa.mjs
```

The runner starts its own local HTTP server and hidden headless browser, retains QA artifacts under `artifacts/private/qa/`, and shuts down its server/browser. It uses Node's built-in WebSocket (enabling the Node 20 experimental flag automatically), so it does not install packages. `EDGE_PATH` can select a Chromium executable. Browser execution may require approval in a restricted development environment.

Focused transition checks and audio race regressions:

```powershell
node tests\browser_qa.mjs --timing-only
node tests\audio_regression.mjs
```

The transition report is `artifacts/private/qa/timing-report.json`; it is separate from the full-site report. Original V5.1 timing source files were preserved under `artifacts/v5.1-before-continue/` before the follow-up edits.
