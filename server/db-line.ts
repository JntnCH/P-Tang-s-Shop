import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { lineUsers } from "../drizzle/schema";
import { ENV } from "./_core/env";

export type LineIdentity = {
  lineUserId: string;
  channelId: string;
  displayName?: string;
  pictureUrl?: string;
  canWrite: boolean;
};

export async function upsertLineIdentity(identity: Omit<LineIdentity, "canWrite">) {
  const db = await getDb();
  if (!db) throw new Error("ยังเชื่อมต่อฐานข้อมูลไม่ได้");
  const canWrite = ENV.lineWriteUserIds.includes(identity.lineUserId) ? 1 : 0;
  await db.insert(lineUsers).values({ ...identity, canWrite }).onDuplicateKeyUpdate({
    set: { channelId: identity.channelId, displayName: identity.displayName, pictureUrl: identity.pictureUrl, canWrite, lastSeenAt: new Date() },
  });
  return { ...identity, canWrite: canWrite === 1 };
}

export async function getLineIdentity(lineUserId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const row = (await db.select().from(lineUsers).where(eq(lineUsers.lineUserId, lineUserId)).limit(1))[0];
  return row ? { lineUserId: row.lineUserId, channelId: row.channelId, displayName: row.displayName ?? undefined, pictureUrl: row.pictureUrl ?? undefined, canWrite: Boolean(row.canWrite) } : undefined;
}
