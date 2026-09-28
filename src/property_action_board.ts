export type ResidentSnapshot = {
  userId: string;
  name: string;
  openMaintenanceCount: number;
  hasUnsignedLease: boolean;
  inspectionDueInDays: number | null;
};

export type TenantAction = {
  type: "maintenance_follow_up" | "lease_signature_reminder" | "inspection_reminder";
  priority: "high" | "medium";
  message: string;
};

export function buildTenantActionBoard(resident: ResidentSnapshot): TenantAction[] {
  const actions: TenantAction[] = [];

  if (resident.openMaintenanceCount > 0) {
    actions.push({
      type: "maintenance_follow_up",
      priority: "high",
      message: `${resident.openMaintenanceCount} maintenance request${resident.openMaintenanceCount === 1 ? "" : "s"} still open`
    });
  }

  if (resident.hasUnsignedLease) {
    actions.push({
      type: "lease_signature_reminder",
      priority: "high",
      message: "Lease document still needs a signature"
    });
  }

  if (resident.inspectionDueInDays !== null && resident.inspectionDueInDays <= 7) {
    actions.push({
      type: "inspection_reminder",
      priority: "medium",
      message: `Inspection due in ${resident.inspectionDueInDays} day${resident.inspectionDueInDays === 1 ? "" : "s"}`
    });
  }

  return actions;
}
