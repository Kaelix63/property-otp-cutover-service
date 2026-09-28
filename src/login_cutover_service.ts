import { z } from "zod";
import { InfraiClient } from "./infrai_client.ts";
import { buildTenantActionBoard, type ResidentSnapshot } from "./property_action_board.ts";

const startTenantLoginSchema = z.object({
  phone: z.string().min(8),
  purpose: z.string().min(1),
  propertyId: z.string().min(1),
  unitId: z.string().min(1)
});

const residentSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1),
  openMaintenanceCount: z.number().int().min(0),
  hasUnsignedLease: z.boolean(),
  inspectionDueInDays: z.number().int().nullable()
});

const verifyTenantLoginSchema = z.object({
  phone: z.string().min(8),
  code: z.string().min(1),
  propertyId: z.string().min(1),
  unitId: z.string().min(1),
  resident: residentSchema
});

export class LoginCutoverService {
  private infrai: InfraiClient;

  constructor(infrai: InfraiClient) {
    this.infrai = infrai;
  }

  async startTenantLogin(input: unknown) {
    const parsed = startTenantLoginSchema.parse(input);

    await this.infrai.auth.phone.send_code({
      phone: parsed.phone,
      purpose: parsed.purpose,
      locale: "en"
    });

    return {
      status: "code_sent",
      propertyId: parsed.propertyId,
      unitId: parsed.unitId,
      phone: parsed.phone
    };
  }

  async verifyTenantLogin(input: unknown) {
    const parsed = verifyTenantLoginSchema.parse(input);

    await this.infrai.auth.phone.verify({
      phone: parsed.phone,
      code: parsed.code,
      login: true
    });

    const sessionEnvelope = await this.infrai.auth.session.create({
      user_id: parsed.resident.userId,
      method: "phone_otp"
    });

    const actions = buildTenantActionBoard(parsed.resident as ResidentSnapshot);

    return {
      status: "logged_in",
      propertyId: parsed.propertyId,
      unitId: parsed.unitId,
      resident: {
        userId: parsed.resident.userId,
        name: parsed.resident.name
      },
      session: sessionEnvelope.data,
      actions
    };
  }

  async sendInspectionReminderSms(input: { phone: string; propertyId: string; unitId: string }) {
    return this.infrai.sms.otp({
      to: input.phone
    });
  }

  async getDeliveryState(id: string) {
    return this.infrai.sms.status(id);
  }
}
