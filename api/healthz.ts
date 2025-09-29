import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const hasVision = !!process.env.VISION_API_KEY;
  const hasCseKey = !!process.env.CSE_API_KEY;
  const hasCseCx  = !!process.env.CSE_CX;

  res.status(200).json({
    ok: hasVision || (hasCseKey && hasCseCx),
    vision_key: hasVision ? 'present' : 'missing',
    cse_key: hasCseKey ? 'present' : 'missing',
    cse_cx: hasCseCx ? 'present' : 'missing',
    runtime: process.env.VERCEL ? 'vercel' : 'local'
  });
}
