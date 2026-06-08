import { getOrgId } from "@/lib/session";
import { checkScrapeLimit, ANON_HOURLY_LIMIT } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { orgId, isAnon } = await getOrgId();
    if (!isAnon) return NextResponse.json({ isAnon: false, unlimited: true });
    const { used, remaining, limit } = await checkScrapeLimit(orgId);
    return NextResponse.json({ isAnon: true, used, remaining, limit });
  } catch {
    return NextResponse.json({ isAnon: true, used: 0, remaining: ANON_HOURLY_LIMIT, limit: ANON_HOURLY_LIMIT });
  }
}
