export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  lineLiffId: process.env.VITE_LINE_LIFF_ID ?? "2011710261-sOMIoQ5X",
  lineChannelId: process.env.LINE_CHANNEL_ID ?? "2011710261",
  lineWriteUserIds: (process.env.LINE_WRITE_USER_IDS ?? "").split(",").map((value) => value.trim()).filter(Boolean),
};
