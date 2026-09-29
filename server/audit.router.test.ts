import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createCaller(ip: string) {
  const ctx = {
    user: null,
    req: { ip, socket: { remoteAddress: ip } },
    res: {},
  } as unknown as TrpcContext;
  return appRouter.createCaller(ctx);
}

describe("audit router safeguards", () => {
  it("returns a client error for a private destination", async () => {
    const caller = createCaller(`test-${randomUUID()}`);
    await expect(caller.audit.analyze({ domain: "http://127.0.0.1" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("privada"),
    });
  });

  it("caps repeated requests from one address", async () => {
    const caller = createCaller(`test-${randomUUID()}`);
    for (let attempt = 0; attempt < 6; attempt += 1) {
      await expect(caller.audit.analyze({ domain: "http://127.0.0.1" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
    await expect(caller.audit.analyze({ domain: "http://127.0.0.1" })).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
  });
});
