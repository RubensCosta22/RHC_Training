# Observability

## Structured logs

Application logs must be emitted as JSON with a stable `action` and one of these levels: `info`, `warn`, `error`, `fatal`.

Prefer contextual identifiers such as `requestId`, `userId` and `profileId` when they are available. Never attach raw request bodies, form payloads, sessions or Supabase auth objects to logs.

## Sensitive data

Passwords, credentials, tokens, authorization headers, cookies, API keys and direct personal data must not be intentionally passed to the logger. The logger redactor is a defense-in-depth layer and replaces known sensitive keys with `[REDACTED]`.

## Event naming

Use dot-separated actions that describe the operation and outcome, for example:

- `auth.login.success`
- `auth.login.failed`
- `workout.save.failed`
- `offline_sync.completed`
- `upload.avatar.failed`

Product analytics and operational logging are separate concerns. Do not use operational logs to store workout content, notes, measurements or other user-generated personal data.
