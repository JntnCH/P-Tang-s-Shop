import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyLineAccessToken } from "./line-auth";

afterEach(() => vi.unstubAllGlobals());

describe("LINE access token verification", () => {
  it("rejects a missing token before calling LINE", async () => {
    await expect(verifyLineAccessToken(undefined)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects a token from another channel", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ client_id: "different-channel", expires_in: 3600 }), { status: 200, headers: { "content-type": "application/json" } })));
    await expect(verifyLineAccessToken("foreign-token")).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("rejects an expired or invalid token response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("invalid", { status: 401 })));
    await expect(verifyLineAccessToken("expired-token")).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
