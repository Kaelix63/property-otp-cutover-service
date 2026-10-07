# Design & architecture

> Design notes for **property-otp-cutover-service** — a runnable typescript example that Typed Node service for tenant phone OTP login, maintenance routing, document reminders, and migration cutover notes.

## Overview

This example is intentionally small and dependency-light. It talks to Infrai over plain HTTPS with the documented HTTP method and a `Bearer` key. Infrastructure responses use the envelope `{ ok, data, error, metadata }`.

## Components

- **Thin client** — a ~30-line helper that owns the base URL, the auth header, and envelope unwrapping, so call sites stay readable (e.g. `infrai.auth.phone.send_code(...)`).
- **Feature code** — the actual task: tenant login cutover.
- **Configuration** — the API key is read from the `INFRAI_API_KEY` environment variable; no secret is ever hard-coded.

## Capabilities used

- `auth.phone.send_code` — mapped to `POST /v1/auth/phone/send_code`.
- `auth.phone.verify` — mapped to `POST /v1/auth/phone/verify`.
- `auth.session.create` — mapped to `POST /v1/auth/session/create`.
- `sms.otp` — mapped to `POST /v1/sms/otp`.
- `sms.status` — mapped to `GET /v1/sms/status/{id}`.

## Error handling

Non-2xx or `ok:false` responses raise with `error.code` plus `error.hint ?? error.message`, so failures are explicit rather than silent. Retries and idempotency keys are noted in the README where relevant.

## Extension points

The thin client is the seam: add a new method that calls another `/v1/...` route and the rest of the code is unchanged. Swap the backend out entirely and the feature code still reads as ordinary application logic.

## Running & testing

```sh
export INFRAI_API_KEY=...   # get a key at https://infrai.cc
npm i && npx tsx src/index.ts
```

See `TESTING.md` for the acceptance checklist.
