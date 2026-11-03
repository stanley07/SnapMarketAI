import { NextRequest, NextResponse } from 'next/server';
import { extractLocalVisualUnderstanding } from '@/lib/ai/understanding-provider';
import { analyzeProductPhotoWithMetaApi } from '@/lib/ai/meta-model-client';

/**
 * Server-Side Product Photo Analysis Route
 * 
 * Invoked by client when analyzing shelf photos, uploaded images, or camera snaps.
 * Integrates official Meta Model API (llama-3.2-11b-vision-instruct) via server runtime.
 * 
 * Security:
 * - MODEL_API_KEY is read strictly on the server and NEVER returned to the client.
 * - If key is missing or API errors, falls back to deterministic local heuristic engine.
 */
export async function POST(req: NextRequest) {
  try {
    let body: { image?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const imageDataUrl = body?.image;

    if (!imageDataUrl || typeof imageDataUrl !== 'string') {
      return NextResponse.json(
        { error: 'Valid image string (base64 data URL or URL) is required' },
        { status: 400 }
      );
    }

    // Basic format check
    if (!imageDataUrl.startsWith('data:image/') && !imageDataUrl.startsWith('http://') && !imageDataUrl.startsWith('https://')) {
      return NextResponse.json(
        { error: 'Unsupported image format. Must be a valid data URL or HTTP(S) image URL' },
        { status: 400 }
      );
    }

    const hasApiKey = Boolean(
      (process.env.MODEL_API_KEY || process.env.META_MODEL_API_KEY || '').trim()
    );

    let apiFailureReason = '';

    // 1. Live Meta Model API Attempt (Server-Side)
    if (hasApiKey) {
      try {
        const metaResult = await analyzeProductPhotoWithMetaApi(imageDataUrl);
        return NextResponse.json(metaResult);
      } catch (apiError: unknown) {
        // Safe logging without exposing credentials
        const message = apiError instanceof Error ? apiError.message : 'Unknown Meta API error';
        apiFailureReason = message;
        // eslint-disable-next-line no-console
        console.warn(`[SnapMarket API] Meta Model API call failed, engaging fallback: ${message}`);
        // Intentionally fall through to local fallback
      }
    }

    // 2. Verified Local Rule & Heuristic Fallback
    const localResult = extractLocalVisualUnderstanding(imageDataUrl);
    if (apiFailureReason) {
      localResult.uncertainties = [
        `Live AI analysis unavailable (${apiFailureReason}). Running in local fallback mode.`,
        ...(localResult.uncertainties || []),
      ];
    }
    return NextResponse.json(localResult);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: 'Failed to process image analysis', details: message },
      { status: 500 }
    );
  }
}
