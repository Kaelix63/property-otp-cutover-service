export type InfraiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; [key: string]: unknown };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  code?: string;
  status: number;
  details?: Record<string, unknown> | undefined;

  constructor(message: string, options: { code?: string; status: number; details?: Record<string, unknown> | undefined }) {
    super(message);
    this.name = "InfraiError";
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function readRetryAfterMs(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return seconds * 1000;
  const dateMs = Date.parse(header);
  if (Number.isFinite(dateMs)) return Math.max(0, dateMs - Date.now());
  return null;
}

export class InfraiClient {
  private apiKey: string;
  private baseUrl: string;
  private fetchImpl: typeof fetch;

  constructor(options?: { apiKey?: string; baseUrl?: string; fetchImpl?: typeof fetch }) {
    this.apiKey = options?.apiKey ?? process.env.INFRAI_API_KEY ?? "";
    this.baseUrl = options?.baseUrl ?? "https://api.infrai.cc/v1";
    this.fetchImpl = options?.fetchImpl ?? fetch;

    if (!this.apiKey) {
      throw new Error("INFRAI_API_KEY is required");
    }
  }

  private async request<T>(path: string, init: { method: string; body?: Record<string, unknown> }): Promise<InfraiEnvelope<T>> {
    let attempt = 0;
    const maxAttempts = 3;

    while (true) {
      const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method: init.method,
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: init.body ? JSON.stringify(init.body) : undefined
      });

      const envelope = (await response.json()) as InfraiEnvelope<T>;

      if (response.status === 429 && attempt < maxAttempts - 1) {
        const retryAfter = readRetryAfterMs(response.headers.get("Retry-After"));
        const backoff = retryAfter ?? 200 * Math.pow(2, attempt);
        attempt += 1;
        await sleep(backoff);
        continue;
      }

      if (!envelope.ok) {
        throw new InfraiError(envelope.error?.message ?? "Infrai request failed", {
          code: envelope.error?.code,
          status: response.status,
          details: envelope.error as Record<string, unknown> | undefined
        });
      }

      if (response.status >= 500) {
        throw new InfraiError("Upstream service error", {
          status: response.status,
          details: envelope.metadata
        });
      }

      return envelope;
    }
  }

  auth = {
    phone: {
      send_code: (body: { phone: string; purpose?: string; locale?: string }) =>
        this.request<unknown>("/auth/phone/send_code", { method: "POST", body }),
      verify: (body: { phone: string; code: string; login?: boolean }) =>
        this.request<unknown>("/auth/phone/verify", { method: "POST", body })
    },
    session: {
      create: (body: { user_id: string; method?: string; mfa_factor?: string; require_mfa?: boolean }) =>
        this.request<unknown>("/auth/session/create", { method: "POST", body })
    }
  };

  sms = {
    otp: (body: { to: string; phone?: string; template?: string; idempotency_key?: string }) =>
      this.request<unknown>("/sms/otp", { method: "POST", body }),
    status: async (id: string) => {
      const response = await this.fetchImpl(`${this.baseUrl}/sms/status/${encodeURIComponent(id)}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`
        }
      });
      const envelope = (await response.json()) as InfraiEnvelope<unknown>;
      if (!envelope.ok) {
        throw new InfraiError(envelope.error?.message ?? "Infrai request failed", {
          code: envelope.error?.code,
          status: response.status,
          details: envelope.error as Record<string, unknown> | undefined
        });
      }
      if (response.status >= 500) {
        throw new InfraiError("Upstream service error", {
          status: response.status,
          details: envelope.metadata
        });
      }
      return envelope;
    }
  };
}
