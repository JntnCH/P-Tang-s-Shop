import liff from "@line/liff";

let accessToken: string | null = null;

export function getLiffAccessToken() {
  return accessToken;
}

export async function initLineMiniApp() {
  const liffId = import.meta.env.VITE_LINE_LIFF_ID?.trim();
  if (!liffId) throw new Error("ยังไม่ได้ตั้งค่า VITE_LINE_LIFF_ID สำหรับ LINE MINI App");
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      liff.init({ liffId }),
      new Promise<never>((_, reject) => { timeoutId = setTimeout(() => reject(new Error("การเชื่อมต่อ LINE ใช้เวลานานเกินไป")), 8000); }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
  if (!liff.isLoggedIn()) {
    liff.login();
    return null;
  }
  accessToken = liff.getAccessToken();
  if (!accessToken) throw new Error("ไม่พบ LIFF access token");
  return accessToken;
}
