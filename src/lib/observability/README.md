# Observability

RHC Training uses structured JSON logs for operational diagnostics. Product analytics remain separate in `telemetryService`.

## Levels

- `info`: successful operational milestones such as login, workout save and completed offline sync.
- `warn`: recoverable conditions such as invalid local cache, denied access, rate limiting and retryable sync failures.
- `error`: failed operations such as database writes, authentication dependencies and upload stages.
- `fatal`: unhandled application errors, rejected promises and React render failures.

## Required context

Use `requestId` for correlation and add `userId`, `profileId` and `action` whenever they are available and relevant.

## Security rules

Never pass full request bodies, form payloads, Supabase sessions, Authorization headers, cookies, signed URLs or secrets to the logger.

The sanitizer is defense in depth. It redacts known sensitive keys and also masks e-mail addresses, Bearer credentials and common secret assignments embedded inside strings.

## Current coverage

- authentication and password recovery
- workout save/archive
- offline workout synchronization
- local pending-workout parsing failures
- dashboard last-measurement lookup
- telemetry delivery failures
- secure image upload Edge Function
- global browser errors and unhandled promise rejections
- React render failures through `AppErrorBoundary`

## Naming

Prefer stable domain-oriented event names such as `workout.save_failed`, `offline_sync.item_failed` and `secure_image_upload.access_denied`. Do not include user-provided text in event names.
