import { fetchViteEnv } from "nitro/vite/runtime";

export default function ssrRenderer(event: { req: Request }) {
  return fetchViteEnv("ssr", event.req);
}
