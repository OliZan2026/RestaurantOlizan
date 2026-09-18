import type { Config, Context } from "@netlify/functions";
import { customerDisabled } from "../lib/customer-disabled.mjs";

export default async (req: Request, context: Context) => {
  // Old tabs may still ask for the session; they must always become guests.
  return customerDisabled(req, req.method === "GET" && context.params.actiune === "me");
};
export const config: Config = { path: "/api/auth/:actiune" };
