import { InfraiClient } from "./infrai_client.ts";
import { LoginCutoverService } from "./login_cutover_service.ts";

async function main() {
  const phone = process.env.DEMO_PHONE;
  const code = process.env.DEMO_CODE;
  if (!phone || !code) {
    throw new Error("DEMO_PHONE and DEMO_CODE are required to contact a phone number");
  }
  const infrai = new InfraiClient();
  const service = new LoginCutoverService(infrai);

  const start = await service.startTenantLogin({
    phone,
    purpose: "tenant-login",
    propertyId: "prop_9",
    unitId: "4B"
  });

  console.log("start", start);

  const verify = await service.verifyTenantLogin({
    phone,
    code,
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

  console.log("verify", verify);

  const smsSend = await service.sendInspectionReminderSms({
    phone,
    propertyId: "prop_9",
    unitId: "4B"
  });

  console.log("sms-send", smsSend.data);

  const smsId = (smsSend.data as { id?: string; message_id?: string } | undefined)?.id ?? (smsSend.data as { id?: string; message_id?: string } | undefined)?.message_id;
  if (smsId) {
    const delivery = await service.getDeliveryState(smsId);
    console.log("sms-status", delivery.data);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
