import { NextResponse } from "next/server";

export async function GET() {
  const hasVision = !!process.env.VISION_API_KEY;
  const hasCseKey = !!process.env.CSE_API_KEY; // سنستخدم CSE_API_KEY على السيرفر
  const hasCseCx  = !!process.env.CSE_CX;

  return NextResponse.json({
    ok: hasVision || (hasCseKey && hasCseCx),
    vision_key: hasVision ? "present" : "missing",
    cse_key: hasCseKey ? "present" : "missing",
    cse_cx: hasCseCx ? "present" : "missing",
    runtime: process.env.VERCEL ? "vercel" : "local"
  });
}
