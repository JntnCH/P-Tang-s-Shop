import { createServerFn } from "@tanstack/react-start";

export interface SendLineOrderPayload {
  toUserIdOrGroupId?: string | undefined;
  orderSummary: string;
  flexMessage?: unknown;
}

export const getLineServerConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  return {
    hasChannelId: Boolean(process.env["LINE_CHANNEL_ID"]),
    hasChannelSecret: Boolean(process.env["LINE_CHANNEL_SECRET"]),
    hasAccessToken: Boolean(process.env["LINE_CHANNEL_ACCESS_TOKEN"]),
    hasServerLiffId: Boolean(process.env["LINE_LIFF_ID"]),
  };
});

export const sendLineMessagingApiFn = createServerFn({ method: "POST" })
  .validator((data: SendLineOrderPayload) => data)
  .handler(async ({ data }) => {
    const token = process.env["LINE_CHANNEL_ACCESS_TOKEN"];

    if (!token) {
      return {
        success: false,
        configured: false,
        error: "LINE_CHANNEL_ACCESS_TOKEN ยังไม่ได้ตั้งค่าบน Server Environment",
      };
    }

    const target = data.toUserIdOrGroupId;
    if (!target) {
      return {
        success: false,
        configured: true,
        error: "ยังไม่ได้ระบุ LINE Group ID หรือ User ID สำหรับส่งผ่าน Messaging API",
      };
    }

    try {
      const res = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: target,
          messages: data.flexMessage
            ? [data.flexMessage]
            : [{ type: "text", text: data.orderSummary }],
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        return { success: false, configured: true, error: text };
      }

      return { success: true, configured: true };
    } catch (err: unknown) {
      return { success: false, configured: true, error: String(err) };
    }
  });
