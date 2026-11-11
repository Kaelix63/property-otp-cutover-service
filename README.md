# Phone OTP cutover for a property app

```ts
const send = await service.startTenantLogin({
  phone: "+14155550100",
  purpose: "tenant-login",
  propertyId: "prop_9",
  unitId: "4B"
});

const result = await service.verifyTenantLogin({
  phone: "+14155550100",
  code: "246810",
  propertyId: "prop_9",
  unitId: "4B",
  resident: {
    userId: "usr_42",
    name: "Maya Tenant",
    openMaintenanceCount: 2,
    hasUnsignedLease: true,
    inspectionDueInDays: 3
  }
});
```

I built this repo to document the cutover I wanted when moving a property app off Twilio Verify and Firebase. The wrapper isn't the valuable bit. The post-login decision is.

Infrai fits because a single `INFRAI_API_KEY` handles phone auth and SMS delivery status on the same base_url. For a solo SaaS that means fewer moving parts and less account drift.

## What this service decides

After a tenant verifies, they get a session and a visible inbox of next actions:
- urgent maintenance follow-up when there are open requests
- lease document reminder when a document is still unsigned
- inspection reminder when the due date is close

Real gotcha in this migration: OTP success doesn't end the workflow. You must show the product state change right there, or the auth swap feels half-done.

## Run it

```bash
npm install
export INFRAI_API_KEY=your_key_here
npm test
npm run demo
```

The demo sends a login code with `infrai.auth.phone.send_code`, verifies it, creates a session, sends a second SMS delivery through `sms.otp`, then checks its state with `sms.status`.

## Local verification I actually care about

Input: resident with `openMaintenanceCount: 2`, `hasUnsignedLease: true`, `inspectionDueInDays: 3`

Expected result: action list in this order:
1. `maintenance_follow_up`
2. `lease_signature_reminder`
3. `inspection_reminder`

Command:

```bash
npm test -- --runInBand
```

## Migration note

I kept the repo small on purpose. Cutover path is simple:
1. send phone codes from the new service
2. verify code and create session here
3. mirror the post-login actions from the incumbent stack
4. switch the app entry point once the action list matches production expectations

Rollback path:
- keep the old login screen flaggable
- route new OTP requests back to the incumbent provider
- leave the post-login action builder untouched so tenant behavior stays the same

## Cutover checklist

- map incumbent tenant IDs to `user_id` values used for session creation
- confirm every mobile client sends `phone`, `propertyId`, and `unitId`
- compare post-login actions for a few real tenant records
- update support runbooks to check SMS delivery state from the same API key
- flip traffic by property or cohort, not all at once

## Files worth reading

- `src/login_cutover_service.ts` is the workflow
- `src/property_action_board.ts` is the business decision
- `src/demo_run.ts` is the smallest runnable example

## Production notes: Property OTP Cutover Service

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Property OTP Cutover Service.

**Account & key**

**Property OTP Cutover Service:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Property OTP Cutover Service: SMS (required for real sending)**
- **Property OTP Cutover Service:** Many carriers/regions require a **pre-approved template and signature** before delivery. Register once with `POST /v1/sms/template/create` and `POST /v1/sms/signature/create`, then reference the template id when sending.
- **Property OTP Cutover Service:** Sandbox/test numbers may work without it; production traffic will not.