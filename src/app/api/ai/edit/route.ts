import { NextRequest, NextResponse } from 'next/server';
import { generateOrEditProductPhotoWithMuseImage } from '@/lib/ai/meta-model-client';

/**
 * Server-Side Product Image Enhancement & Editing Route
 * 
 * Powered by Meta Muse Image (muse-image-1.0) on the Responses API.
 * 
 * Flow:
 * - If MODEL_API_KEY is configured: dispatches to Meta Muse Image for neural studio editing.
 * - If unavailable / unauthorized: returns fallback signal so high-fidelity Canvas pipeline executes.
 */
export async function POST(req: NextRequest) {
  try {
    let body: { image?: unknown; prompt?: unknown };
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

    if (
      !imageDataUrl.startsWith('data:image/') &&
      !imageDataUrl.startsWith('http://') &&
      !imageDataUrl.startsWith('https://')
    ) {
      return NextResponse.json(
        { error: 'Unsupported image format. Must be a data URL or HTTP(S) image URL' },
        { status: 400 }
      );
    }

    // Protect against payloads > 10MB
    if (imageDataUrl.length > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Image payload exceeds 10MB limit' },
        { status: 413 }
      );
    }

    const hasApiKey = Boolean(
      (process.env.MODEL_API_KEY || process.env.META_MODEL_API_KEY || '').trim()
    );

    const options = {
      prompt: typeof body.prompt === 'string' && body.prompt.trim().length > 0 ? body.prompt.trim() : undefined,
      backdropPreset: (body as { backdropPreset?: string })?.backdropPreset as any,
      customBackdropColor: (body as { customBackdropColor?: string })?.customBackdropColor,
      addContactShadow: (body as { addContactShadow?: boolean })?.addContactShadow,
    };

    // 1. Live Meta Muse Image Attempt
    if (hasApiKey) {
      try {
        const museResult = await generateOrEditProductPhotoWithMuseImage(imageDataUrl, options);
        return NextResponse.json(museResult);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Meta Muse Image call failed';
        // eslint-disable-next-line no-console
        console.warn(`[SnapMarket API] Muse Image request failed: ${msg}. Falling back to honest local handler.`);
      }
    }

    // 2. Fallback Directive: Signal client that live segmentation is unavailable
    return NextResponse.json({
      fallbackRequired: true,
      segmentationSuccess: false,
      provider: 'SnapMarket Studio Engine (Fallback Mode)',
      isFallback: true,
      message: 'Meta Muse Image unavailable or unauthenticated. Cannot perform automatic semantic product segmentation.',
      editedImageUrl: imageDataUrl,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: 'Failed to process image editing', details: message },
      { status: 500 }
    );
  }
}
