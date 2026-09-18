import type { Config } from "@netlify/functions";
import { customerDisabled } from "../lib/customer-disabled.mjs";

export default async (req: Request) => customerDisabled(req);
export const config: Config = { path: ["/api/account/:resursa", "/api/account/:resursa/:id"] };
