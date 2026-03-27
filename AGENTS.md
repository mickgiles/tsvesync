# TSVeSync Agent Guide

## Overview
- `tsvesync` is the TypeScript library layer in the VeSync stack.
- Source of truth is `src/` plus the YAML specs in `api/`; `dist/` is build output and should not be edited directly.
- The library is expected to track `pyvesync` behavior closely, especially for device models, payload shape, auth/version rules, and response parsing.

## Where To Look
- `package.json`: package version and build lifecycle
- `src/index.ts`: public exports
- `src/lib/vesync.ts`: client entry point
- `src/lib/helpers.ts`: auth/version/header helpers
- `src/lib/vesync*Impl.ts`: model-family mappings
- `src/lib/fans/*.ts`: device-specific implementations
- `api/vesync*/**/*.yaml`: request/response specs
- `test/*.ts`: targeted ts-node parity and live-api tests
- `docs/implementation-comparison.md`: parity notes

## Working Rules
- Never edit `dist/` by hand.
- When adding or fixing a device, compare against `pyvesync` first, then update TypeScript implementation, then update or confirm the YAML spec.
- Treat APP_VERSION, region routing, and auth/header changes as API-compatibility work, not device work.
- Keep model mappings, class behavior, and YAML payloads aligned; do not patch only one layer.
- Prefer small, targeted fixes over broad refactors.

## Validation
- Run `npm run build` after code changes.
- Use the targeted `test/*.ts` scripts relevant to the device or API path you changed.
- If a fix affects parity or auth flow, verify the exact request/response path rather than relying on build success alone.

## Release Notes
- `tsvesync` version is expected to stay in lockstep with `homebridge-tsvesync`.
- Changelog and version bumps should be coordinated across both repos.
