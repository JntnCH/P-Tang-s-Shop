function firstDefined(...values: Array<string | undefined>) {
  return values.find((value) => Boolean(value?.trim()))?.trim() ?? "";
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Public identifiers may be injected by WebDev secrets or GitHub Actions at build/deploy time.
  lineLiffId: firstDefined(process.env.VITE_LINE_LIFF_ID, process.env.LINE_LIFF_ID),
  lineChannelId: firstDefined(process.env.LINE_CHANNEL_ID),
  // Server-only secrets are never exposed through VITE_* variables.
  lineChannelSecret: firstDefined(process.env.LINE_CHANNEL_SECRET),
  lineChannelAccessToken: firstDefined(process.env.LINE_CHANNEL_ACCESS_TOKEN),
  lineWriteUserIds: (process.env.LINE_WRITE_USER_IDS ?? "").split(",").map((value) => value.trim()).filter(Boolean),
};
