import { NextResponse } from 'next/server';
import { AIProviderStatus } from '@/types/ai';
import {
  verifyMetaModelApiConnection,
  META_MUSE_SPARK_MODEL,
  META_MUSE_IMAGE_MODEL,
} from '@/lib/ai/meta-model-client';

/**
 * AI Provider Status & Diagnostics Route
 * 
 * Reports live status across Meta Muse suite and Modal serverless endpoint.
 * Protects credentials by never returning secrets to the caller.
 */
export async function GET() {
  const apiKey = (process.env.MODEL_API_KEY || process.env.META_MODEL_API_KEY || '').trim();
  const modalEndpoint = (
    process.env.MODAL_SEGMENTATION_ENDPOINT ||
    process.env.META_SAM_ENDPOINT ||
    ''
  ).trim();

  let activeProvider = 'SnapMarket Edge Engine (On-Device Fallback)';
  let isFallbackMode = true;
  let modelName = META_MUSE_SPARK_MODEL;
  let authStatus: 'authenticated' | 'unauthenticated' | 'invalid_key' | 'network_error' = 'unauthenticated';
  let notes = 'MODEL_API_KEY not configured. Running in high-fidelity on-device fallback mode with Canvas image enhancement and vector similarity search.';

  if (apiKey) {
    const conn = await verifyMetaModelApiConnection();
    if (conn.authenticated) {
      activeProvider = `Meta Muse Spark (${conn.selectedModel})`;
      isFallbackMode = false;
      modelName = conn.selectedModel;
      authStatus = 'authenticated';
      notes = `Live cloud AI inference active via Meta Muse (${conn.selectedModel}). Available models verified: ${conn.availableModels.length}.`;
    } else {
      activeProvider = 'SnapMarket Edge Engine (On-Device Fallback)';
      isFallbackMode = true;
      modelName = conn.selectedModel;
      authStatus = conn.statusCode === 401 || conn.statusCode === 403 ? 'invalid_key' : 'network_error';
      notes = `MODEL_API_KEY provided but failed authentication (${conn.errorMessage || 'Invalid credentials'}). Safely running in verified fallback mode.`;
    }
  }

  const status: AIProviderStatus = {
    activeProvider,
    isFallbackMode,
    modelName,
    museModel: META_MUSE_SPARK_MODEL,
    museImageModel: META_MUSE_IMAGE_MODEL,
    modalEndpointConfigured: Boolean(modalEndpoint),
    authStatus,
    capabilities: {
      understanding: true,
      editing: true,
      segmentation: true,
      vectorSearch: true,
    },
    notes: modalEndpoint
      ? `${notes} Modal Serverless segmentation endpoint configured.`
      : `${notes} Modal segmentation unconfigured (using spatial heuristic fallback).`,
  };

  return NextResponse.json(status);
}
