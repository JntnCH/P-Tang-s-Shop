import { TRPCError } from "@trpc/server";
import { upsertLineIdentity, type LineIdentity } from "./db-line";
import { ENV } from "./_core/env";

function unauthorized(message: string): never {
  throw new TRPCError({ code: "UNAUTHORIZED", message });
}

export async function verifyLineAccessToken(token: string | undefined): Promise<LineIdentity> {
  if (!token) unauthorized("กรุณาเปิดหน้านี้จาก LINE MINI App");
  const verifyResponse = await fetch(`https://api.line.me/oauth2/v2.1/verify?access_token=${encodeURIComponent(token)}`);
  if (!verifyResponse.ok) unauthorized("LINE access token ไม่ถูกต้องหรือหมดอายุ");
  const verified = (await verifyResponse.json()) as { client_id?: string; expires_in?: number };
  if (verified.client_id !== ENV.lineChannelId) unauthorized("LINE channel ไม่ตรงกับระบบนี้");
  if (!verified.expires_in || verified.expires_in <= 0) unauthorized("LINE access token หมดอายุ");

  const profileResponse = await fetch("https://api.line.me/v2/profile", { headers: { Authorization: `Bearer ${token}` } });
  if (!profileResponse.ok) unauthorized("ไม่สามารถยืนยันโปรไฟล์ LINE ได้");
  const profile = (await profileResponse.json()) as { userId?: string; displayName?: string; pictureUrl?: string };
  if (!profile.userId) unauthorized("ไม่พบ LINE user ID");
  return upsertLineIdentity({ lineUserId: profile.userId, channelId: verified.client_id, displayName: profile.displayName, pictureUrl: profile.pictureUrl });
}
