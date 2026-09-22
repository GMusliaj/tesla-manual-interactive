# Security policy

This is a static educational site. It does not receive account credentials,
vehicle telemetry, payment data, or form submissions. Learning progress and
language preference are kept in the browser's local storage.

Please report a reproducible security issue privately to the repository owner
before opening a public issue. Do not include credentials, personal data, or
private asset files in a report. For ordinary bugs, use the issue tracker.

The local preview server serves only a configured public directory, accepts
`GET` and `HEAD`, rejects malformed URLs, and refuses symlinks that resolve
outside that directory. `npm run check` covers those boundaries.
