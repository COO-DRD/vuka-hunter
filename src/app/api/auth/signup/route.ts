import { NextResponse } from "next/server";

// Sign-up is handled by Clerk. This endpoint is no longer active.
// New users register via /sign-up (Clerk-hosted UI).
export async function POST() {
  return NextResponse.json(
    { error: "Sign-up is handled by Clerk. Use /sign-up." },
    { status: 410 }
  );
}
