import test from "node:test";
import assert from "node:assert/strict";
import { buildTenantActionBoard } from "../src/property_action_board.ts";

test("buildTenantActionBoard orders the post-login actions for an at-risk tenant", () => {
  const actions = buildTenantActionBoard({
    userId: "usr_42",
    name: "Maya Tenant",
    openMaintenanceCount: 2,
    hasUnsignedLease: true,
    inspectionDueInDays: 3
  });

  assert.deepEqual(
    actions.map((action) => action.type),
    ["maintenance_follow_up", "lease_signature_reminder", "inspection_reminder"]
  );

  assert.equal(actions[0]?.priority, "high");
  assert.match(actions[2]?.message ?? "", /Inspection due in 3 days/);
});
