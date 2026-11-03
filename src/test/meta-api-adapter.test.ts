import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  verifyMetaModelApiConnection,
  analyzeProductPhotoWithMetaApi,
  generateOrEditProductPhotoWithMuseImage,
  parseStructuredJsonResponse,
  mapMetaResponseToImageUnderstanding,
  META_MUSE_SPARK_MODEL,
  META_MUSE_IMAGE_MODEL,
} from '../lib/ai/meta-model-client';
import { extractLocalVisualUnderstanding } from '../lib/ai/understanding-provider';
import { detectProductsOnShelf } from '../lib/ai/segmentation-provider';
import { generateVisualEmbedding } from '../lib/ai/embedding-provider';
import { searchSimilarProducts } from '../lib/repository';

describe('Meta Muse API Adapter & Verification', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('reports unconfigured status when MODEL_API_KEY is not set', async () => {
    delete process.env.MODEL_API_KEY;
    delete process.env.META_MODEL_API_KEY;

    const status = await verifyMetaModelApiConnection();
    expect(status.hasKey).toBe(false);
    expect(status.authenticated).toBe(false);
    expect(status.selectedModel).toBe(META_MUSE_SPARK_MODEL);
    expect(status.errorMessage).toContain('not configured');
  });

  it('rejects product photo analysis when MODEL_API_KEY is missing', async () => {
    delete process.env.MODEL_API_KEY;
    delete process.env.META_MODEL_API_KEY;

    await expect(
      analyzeProductPhotoWithMetaApi('data:image/jpeg;base64,dummy')
    ).rejects.toThrow('MODEL_API_KEY is not configured on server');
  });

  it('handles HTTP 401 unauthorized gracefully during verification', async () => {
    process.env.MODEL_API_KEY = 'invalid_test_key';

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: {
            code: 'invalid_api_key',
            message: 'Unauthorized',
            type: 'authentication_error',
          },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const status = await verifyMetaModelApiConnection();
    expect(status.hasKey).toBe(true);
    expect(status.authenticated).toBe(false);
    expect(status.statusCode).toBe(401);
    expect(status.errorMessage).toContain('Unauthorized');
  });

  it('handles network timeouts or fetch aborts gracefully', async () => {
    process.env.MODEL_API_KEY = 'test_key';

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
      new Error('The operation was aborted due to timeout')
    );

    const status = await verifyMetaModelApiConnection();
    expect(status.hasKey).toBe(true);
    expect(status.authenticated).toBe(false);
    expect(status.errorMessage).toContain('Network or timeout error');
  });

  it('correctly discovers models and identifies Muse Spark and Muse Image on 200 OK', async () => {
    process.env.MODEL_API_KEY = 'valid_test_key';

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
            { id: 'muse-spark-1.3' },
            { id: 'muse-image-1.0' },
            { id: 'llama-3.2-11b-vision-instruct' },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const status = await verifyMetaModelApiConnection();
    expect(status.authenticated).toBe(true);
    expect(status.hasMuseSpark).toBe(true);
    expect(status.hasMuseImage).toBe(true);
    expect(status.selectedModel).toBe(META_MUSE_SPARK_MODEL);
  });
});

describe('Meta Muse Image (muse-image-1.0) Integration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('rejects image editing if MODEL_API_KEY is not configured', async () => {
    delete process.env.MODEL_API_KEY;
    delete process.env.META_MODEL_API_KEY;

    await expect(
      generateOrEditProductPhotoWithMuseImage('data:image/jpeg;base64,dummy')
    ).rejects.toThrow('MODEL_API_KEY is not configured on server');
  });

  it('processes image conditioning response from Meta Muse Image', async () => {
    process.env.MODEL_API_KEY = 'valid_test_key';

    const mockResponsePayload = {
      id: 'resp_test123',
      status: 'completed',
      output: [
        {
          type: 'image_generation_call',
          id: 'ig_001',
          status: 'completed',
          result: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        },
      ],
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponsePayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await generateOrEditProductPhotoWithMuseImage(
      'data:image/jpeg;base64,input_test'
    );

    expect(result.isFallback).toBe(false);
    expect(result.provider).toBe(`Meta Muse Image (${META_MUSE_IMAGE_MODEL})`);
    expect(result.editedImageUrl).toContain('data:image/webp;base64,');
    expect(result.appliedOperations.length).toBeGreaterThan(0);
  });
});

describe('JSON Parsing & Schema Normalization', () => {
  it('parses raw JSON string', () => {
    const raw = '{"title":"Test Item","priceRange":{"min":1000,"max":2000}}';
    const parsed = parseStructuredJsonResponse(raw);
    expect(parsed.title).toBe('Test Item');
  });

  it('parses markdown code-fenced JSON responses', () => {
    const raw = '```json\n{"title":"Leather Backpack","category":"Bags & Accessories"}\n```';
    const parsed = parseStructuredJsonResponse(raw);
    expect(parsed.title).toBe('Leather Backpack');
    expect(parsed.category).toBe('Bags & Accessories');
  });

  it('maps and validates all structured attributes including material and uncertainties', () => {
    const mockMetaPayload = {
      category: 'Bags & Accessories',
      title: 'Handcrafted Vintage Messenger Bag',
      description: 'Brown leather shoulder bag with brass buckles and adjustable strap.',
      dominantColors: ['#78350f', '#451a03'],
      visibleMaterialOrTexture: 'Full-grain oiled leather with brass hardware',
      visualTags: ['leather', 'messenger bag', 'vintage', 'accessories'],
      detectedCondition: 'Brand New',
      priceRange: { min: 45000, max: 65000 },
      confidenceScore: 0.95,
      uncertainties: ['Internal laptop compartment dimensions cannot be determined visually'],
    };

    const mapped = mapMetaResponseToImageUnderstanding(mockMetaPayload);
    expect(mapped.categorySuggestion).toBe('Bags & Accessories');
    expect(mapped.titleSuggestion).toBe('Handcrafted Vintage Messenger Bag');
    expect(mapped.visibleMaterialOrTexture).toBe('Full-grain oiled leather with brass hardware');
    expect(mapped.uncertainties).toHaveLength(1);
    expect(mapped.uncertainties?.[0]).toContain('Internal laptop compartment');
    expect(mapped.isFallback).toBe(false);
    expect(mapped.provider).toContain('Meta Muse Spark');
  });

  it('falls back to safe defaults when optional or invalid fields are returned', () => {
    const invalidPayload = {
      category: 'Unknown Random Non-Existent Category',
      title: '',
      confidenceScore: 'invalid_number',
    };

    const mapped = mapMetaResponseToImageUnderstanding(invalidPayload);
    expect(mapped.categorySuggestion).toBe('Home & Living');
    expect(mapped.titleSuggestion).toBe('Identified Product');
    expect(mapped.visibleMaterialOrTexture).toBe('unknown');
    expect(mapped.uncertainties).toEqual([]);
    expect(mapped.isFallback).toBe(false);
  });
});

describe('Fallback Engine & Modal Segmentation Integration', () => {
  it('local fallback returns complete attributes with isFallback: true', () => {
    const result = extractLocalVisualUnderstanding('test-shelf-image');
    expect(result.isFallback).toBe(true);
    expect(result.provider).toContain('Fallback');
    expect(result.visibleMaterialOrTexture).toBeTruthy();
    expect(result.uncertainties).toBeDefined();
    expect(result.uncertainties!.length).toBeGreaterThan(0);
    expect(result.visualTags.length).toBeGreaterThan(0);
  });

  it('detectProductsOnShelf returns 3-zone candidate bounding boxes', async () => {
    const seg = await detectProductsOnShelf('data:image/jpeg;base64,dummy_shelf');
    expect(seg.detectedObjects.length).toBeGreaterThanOrEqual(3);
    expect(seg.isFallback).toBe(true);
    expect(seg.detectedObjects.some((b) => b.id === 'box-center')).toBe(true);
  });

  it('generateVisualEmbedding incorporates material parameter', async () => {
    const vecWithLeather = await generateVisualEmbedding(
      'Bags & Accessories',
      ['bag'],
      ['#78350f'],
      'Full-grain leather'
    );
    const vecWithPlastic = await generateVisualEmbedding(
      'Bags & Accessories',
      ['bag'],
      ['#78350f'],
      'Molded polymer plastic'
    );

    expect(vecWithLeather[11]).toBeGreaterThan(vecWithPlastic[11]);
    expect(vecWithPlastic[12]).toBeGreaterThan(vecWithLeather[12]);
  });

  it('searchSimilarProducts leverages material alignment for ranking', async () => {
    const resultsWithLeather = await searchSimilarProducts(
      undefined,
      ['wallet'],
      ['#78350f'],
      'Bags & Accessories',
      'leather'
    );

    expect(resultsWithLeather.length).toBeGreaterThan(0);
    const topResult = resultsWithLeather[0];
    expect(topResult.matchedFeatures.some((f) => f.includes('Material correspondence: leather'))).toBe(true);
  });
});
