# Third-party notices

The root MIT licence applies to original project code and documentation. It does
not relicense third-party software, vehicle designs, model files, photographs,
screenshots, logos, or manual illustrations.

| Component | Licence | Notice and upstream |
| --- | --- | --- |
| Three.js 0.170.0, including the legacy top-level module copy | MIT | [Bundled notice](public/vendor/three/LICENSE); [upstream](https://github.com/mrdoob/three/tree/r170) |
| meshoptimizer decoder 0.18, distributed with Three.js | MIT | [Bundled notice](public/vendor/three/LICENSE-meshoptimizer); [upstream licence](https://github.com/zeux/meshoptimizer/blob/v0.18/LICENSE.md) |
| Playwright 1.63.0, development dependency installed by npm | Apache-2.0 | [Upstream](https://github.com/microsoft/playwright); package notice retained by npm |

The BloxBloger vehicle model is recorded as **CC BY-NC 4.0**, not MIT. The
binary is excluded from this repository and public build; the public viewer
references the pinned upstream copy listed in [model provenance](public/models/CREDITS.md)
instead of mirroring it here.

`docs/readme-demo.gif` is a rendered recording of the local application using
that model. The GIF is provided under **CC BY-NC 4.0**, separate from the MIT
code. Model credit: [2025 Tesla Model Y by BloxBloger](https://sketchfab.com/3d-models/2025-tesla-model-y-619601e7800d418da5922c4fa7833f74).
Changes shown include white paint/interior materials, lighting, camera motion,
opening hood, reconstructed cabin controls and instructional charging geometry. See the
[licence terms](https://creativecommons.org/licenses/by-nc/4.0/) and the model
provenance above. No Tesla reference photographs are shown in the recording.

Tesla photographs, configurator screenshots, and manual illustrations are also
excluded. Source links are retained in [the source manifest](public/references.json)
and the site's **Sources & licences / Quellen & Lizenzen** page. Access to those
pages does not grant redistribution rights. Local copies retain their original
terms. Do not force-add these files to Git or attach them to releases.

Tesla and Model Y are marks of their respective owner. This independent learning
guide is not affiliated with or endorsed by Tesla. The original owner’s manual
and the vehicle’s own instructions take precedence over this guide.
