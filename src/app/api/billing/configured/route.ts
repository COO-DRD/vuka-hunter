import { NextResponse } from "next/server";

export async function GET() {
  const configured = !!process.env.PAYSTACK_SECRET_KEY;
  return NextResponse.json({ configured });
}
