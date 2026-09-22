# Contributing

Keep contributions focused on the original application code, tests, source
metadata, and documentation. Do not commit vehicle models, Tesla screenshots,
manual illustrations, `.env` files, browser profiles, or generated `dist/`
output. The repository intentionally ignores those paths.

Before opening a pull request, run:

```sh
npm ci
npm run check
npm run test:public
```

If you work with separately licensed local assets, keep them in the ignored
paths and document their provenance in `public/references.json` or
`public/models/CREDITS.md`; do not change the asset boundary without checking
the upstream licence first.
