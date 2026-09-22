# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Added

- Code-only release boundary with MIT licence, source/licence page, third-party notices, security policy, asset manifest, release scanner, dependency checks, and pinned GitHub Actions for CI and Pages.
- README showcase GIF captured from the code-only German/English learning flow; no restricted vehicle or reference assets are included.
- An 8.4-second charging demonstration synchronizes a wide view, connector approach, close-up insertion, seated hold, and pullback. German/English replay and skip controls support keyboard focus, manual camera takeover, and a static reduced-motion alternative.
- Dedicated `test:charge-film` browser verification for the charging demonstration; the vehicle heading fades away during the close-up to keep the connection unobstructed.
- Interactive 3D Model Y Field Guide with six official-manual-linked learning chapters.
- Accessible keyboard and touch-friendly controls, responsive layout, and a clear safety boundary to the official manual.
- German and English interfaces, including all 18 lesson steps, quizzes, captions, accessibility labels, and saved language preference. English sources use Tesla's European `en_eu` manual.
- Local Juniper GLB and Tesla reference provenance are documented while those files remain outside the public release; bundled Three.js notices remain tracked.
- Browser coverage for both language flows, saved progress, mobile layout, reference images, and failed 3D loading; geometry and persistence tests.

### Changed

- Pointed the public 3D viewer at the pinned, separately licensed upstream model while keeping the binary and Tesla reference images out of Git and the Pages artifact; the release manifest and source page now record that boundary.
- Rebuilt the presentation around a detailed Juniper model, with orbit/zoom controls, station camera views, and an evening lighting mode.
- Progress requires a correct practice answer; changing languages preserves the active step and completion state.
- Integrated six user-provided screenshots of the Germany-spec 2026 Premium AWD, with bilingual captions; adjusted the artist model to white paint and dark wheels.
- Set the selected cabin to the user's white interior, using the two additional cockpit and rear-seat screenshots.
- Corrected imported trim and lamp-housing materials, suppressed front annotations in rear views, and limited rendering to camera or scene changes.
- Rebuilt the CCS charging assembly against the supplied Juniper illustration: dark tapered full-size flap, an opening cut into the body at the rear-light corner, recessed contact wells, and a smooth connector aligned with the inlet. Removed the oversized rectangular housing, white partial cover, and projecting silver contact discs.
- Added the original Juniper charging illustration to the German and English charging lesson for direct comparison.
- Learning-progress reset also clears operation state; active exercise markers no longer obscure the controls.
- Tightened the charging camera to a rear-left close-up so the flap, contacts, connector alignment, and status light can be inspected without losing the vehicle context.
- Updated the research brief with the English European manual and six verified chapter sources.

### Fixed

- Rebuilt the steering wheel against the supplied cockpit photographs: rounded leather grip, inset airbag panel, curved silver-edged control wings, recessed scroll rollers and a joined lower spoke. Added a dedicated German/English wheel view and included it in the README animation.
- Refined the continuous rear bench, seat bolsters, headrests, dashboard and door pulls; corrected intersecting upholstery overlays and uneven curved-surface normals. Adjusted cabin lighting and framing, and replaced the touchscreen's placeholder vehicle drawing with a runtime render of the loaded Model Y. Reference images remain excluded.
- Reconstructed the Juniper cockpit from the supplied white-interior photographs and Tesla European manual: replaced the conventional dashboard, wheel and gear lever with a continuous dashboard, three-spoke wheel, central landscape touchscreen, dual phone pads, white console surround and armrest, shaped perforated seats, stitched inserts, dark seatback shells, door pulls and rear passenger display. Added cockpit, rear-seat and rear-display views in German and English; reference photographs stay excluded and their sources are listed.
- Improved front-glass visibility while preserving rear privacy tint and dark controls; removed the effective 30 fps render cap, reused animation buffers and cached settled shadows. Camera buttons ease into position, exterior camera changes follow an orbit, and entering the cabin uses a brief fade to avoid travelling through body panels. Added browser verification and refreshed the README recording.

- Corrected the Juniper rear-light materials: recessed reflective surface, fading red illumination in evening mode, smoked corner covers and clear lower inserts. Added a rear-light close-up, source links and DE/EN rendering checks while preserving the charging cutout and closed flap; refreshed the English README animation to show the lights. Restoring the car after the energy exercise now preserves each mesh's shadow setting, so clear covers do not become opaque to shadows.
- Rebuilt the frunk from the supplied Tesery and Torque Alliance visual references: rounded recessed tub, bonnet-fitted surround, weather seal, rear service trim, detailed hood underside and articulated supports. Kept manual operation, checked closed-hood clearance and refreshed the English README animation. Reference media remain excluded, with source links recorded.
- Made the README 3D showcase consistently English from the first frame through charging and the frunk sequence; the capture script checks the selected language in every frame.
- Updated Pages upload and deployment actions to pinned Node 24 releases, added a Pages configuration check, and gated deployment on dependency audit, repository checks, and the public artifact test. The application remains pinned to Node 24.21.0.
- Replaced the model-free README slideshow with a recorded 3D Juniper camera tour, full charging close-up and frunk animation. Added a repeatable capture script that requires the local model and checks every charging stage; the rendered GIF carries separate CC BY-NC attribution while raw assets stay excluded.
- Closing the charge port restores the original body and rear-light geometry and hides the added assembly, removing the protruding dark patch at the left rear corner. Leaving the charging chapter also closes the assembly; hood extraction stays independent of the charging cutout.
- Mobile charging replay brings the car into view using its current screen bounds, avoiding a stale visibility observer that could leave playback paused off screen.
- Seated the charging plug another 8 mm inside the bezel, while keeping its ready position aligned with the socket.
- Brought the charging connector's ready position to 2 mm from the actual socket face, matched the nose to the keyed Type 2 profile, and seated its handle shoulder against the inlet rim. Alignment tests now measure mesh surfaces and verify the approach ray throughout the insertion motion.
- The closed charge flap covers both socket sections; opening it exposes the contacts without body intersections. Geometry regression tests check occlusion, the body opening, and the insertion axis.
- Matched the flap curvature to the loaded body surface, kept the withdrawn plug near the inlet, and seated the connector nose inside the socket in the charging state. The cable follows the connector in world space during insertion and camera rotation.
- Replaced the inaccurate procedural vehicle geometry. The artist model's static body and trim limitations are stated in the source panel.
- Static serving supports GLB and reference assets, validates file paths, and provides an explicit image fallback if rendering fails.
