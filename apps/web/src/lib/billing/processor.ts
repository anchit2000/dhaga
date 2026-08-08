import { headers } from "next/headers";
import { RAZORPAY_COUNTRIES } from "@/utils/constants/razorpay";

export type Processor = "stripe" | "razorpay";

/**
 * Which processor to show FIRST. Deliberately a default, never a lock: the
 * settings UI still offers the other one when it's configured.
 *
 * VPNs, travel, corporate egress and plain bad geo data are guaranteed, and a
 * customer who cannot pay at all is far worse than one paying in a currency
 * they didn't expect. So this only reorders buttons — it never removes one.
 *
 * `x-vercel-ip-country` is set by Vercel's edge on every request at no cost
 * and with no third-party geo service. Absent locally and on other hosts, in
 * which case Stripe (the broader-coverage processor) leads.
 */
export async function preferredProcessor(): Promise<Processor> {
  const country = (await headers()).get("x-vercel-ip-country");
  if (!country) return "stripe";
  return RAZORPAY_COUNTRIES.includes(country.toUpperCase()) ? "razorpay" : "stripe";
}
