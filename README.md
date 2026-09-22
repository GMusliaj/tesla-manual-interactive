# Model Y Field Guide

Built while waiting for a newly ordered Tesla Model Y, this is an independent
German and English learning guide for the Model Y Juniper. The browser app uses
a 3D representation, short lessons, safety notes, and quizzes to make the
owner's manual easier to learn before the car arrives. The official sources are
the [German Model Y manual](https://www.tesla.com/ownersmanual/modely/de_de/)
and the [English European Model Y manual](https://www.tesla.com/ownersmanual/modely/en_eu/).

![Model Y Juniper in 3D: white cabin, touchscreen, rear lights, charging and opening the frunk](docs/readme-demo.gif)

The animation records the local 3D experience entirely in English: the white
cabin with its steering wheel, central touchscreen, phone pads, sculpted seats
and rear passenger display, reflected
rear lights in evening mode, close-up charging connector insertion and opening frunk.
Choose **Interior / Innenraum** in the viewer, then **Cockpit**, **Steering wheel /
Lenkrad**, **Rear seats / Rücksitze** or **Rear display / Hinteres Display** to inspect the cabin.
Rendered vehicle: [2025 Tesla Model Y by BloxBloger](https://sketchfab.com/3d-models/2025-tesla-model-y-619601e7800d418da5922c4fa7833f74),
adapted with white materials, reconstructed cabin controls, lighting and instructional animations.
The GIF is under [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/),
separate from the MIT application code. [Full model provenance](public/models/CREDITS.md).

The public application keeps the vehicle binary and Tesla reference images out
of Git and out of `dist/`. Its 3D viewer fetches the separately licensed model
from the pinned upstream source recorded in [`public/sources.html`](public/sources.html);
if that source is unavailable, the guide falls back to reading mode. The assets
retain their separate rights and licences. Their original sources and rights are listed in
[`public/references.json`](public/references.json), and
[`public/models/CREDITS.md`](public/models/CREDITS.md).

## Run locally

Use Node.js 24.21.0 from `.nvmrc`:

```sh
npm ci
npm start
```

The public build loads the pinned model source above. For offline development,
or if you have separate permission to use the local model and references, place them at
`public/models/juniper.glb` and `public/references/`; they are detected locally
but never copied into the public build.

## Verify and build

```sh
npm run check       # syntax, release policy, vendored dependencies, unit tests
npm run test:public # build and inspect the public release boundary
npm run build       # write the ignored dist/ directory
```

With the optional local model and Google Chrome installed, run
`node tests/rear-lights-browser.mjs` to check the rendered rear lights in both
languages, day/evening switching, chapter restoration and the mobile view.
Run `node tests/viewer-browser.mjs` for camera motion, interruption, reduced-motion
and render/shadow caching checks, and `node tests/cabin-browser.mjs` for the
visible cockpit and bilingual desktop/mobile views.

`npm run build` deletes and recreates `dist/`, then checks that no model or
reference image entered the release. It permits only the pinned upstream model
URL in `assets.json`; private paths, credential-shaped values, and symlinks are
still rejected. The GitHub Pages workflow publishes only `dist/`.

To regenerate the README animation with a locally installed model, Google Chrome
and FFmpeg, run `node scripts/capture-readme.mjs`. It refuses to capture reading
mode and verifies the English interface in every frame and every charging-animation
stage before replacing the GIF. It uses the available GPU; set
`SOFTWARE_RENDERING=1` to use the slower software-rendering fallback.

## Licence boundary

Original application code is MIT-licensed. Three.js and meshoptimizer notices
are in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md). The separately
loaded model is CC BY-NC 4.0 and Tesla material remains subject to Tesla's own
rights. Those assets and the rendered README GIF are not covered by the MIT
licence. This
project is independent and is not affiliated with or endorsed by Tesla; the
official manual and the vehicle's own instructions take precedence.
