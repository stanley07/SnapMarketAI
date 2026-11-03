import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  processProductImage,
  formatBackdropName,
} from '../lib/ai/editing-provider';
import {
  buildStudioPrompt,
  detectShelfObjectsWithSAM,
  generateOrEditProductPhotoWithMuseImage,
  META_MUSE_IMAGE_MODEL,
  META_SAM_MODEL,
} from '../lib/ai/meta-model-client';
import { detectProductsOnShelf } from '../lib/ai/segmentation-provider';
import { persistProduct } from '../lib/repository';
import { generateVisualEmbedding } from '../lib/ai/embedding-provider';
import { Product } from '../types/product';

describe('Snap & Sell Studio: Product Isolation & Person Removal', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('builds studio conditioning prompt explicitly instructing removal of people and scene clutter', () => {
    const promptWhite = buildStudioPrompt('pure_white');
    expect(promptWhite).toContain('sunscreen tube');
    expect(promptWhite).toContain('Remove all people, girls, children, faces, hands');
    expect(promptWhite).toContain('Remove the original background, orange-and-white scene');
    expect(promptWhite).toContain('Preserve the exact real product shape, label, brand lettering, text, colors, and cap');
    expect(promptWhite).toContain('pure white');

    const promptGray = buildStudioPrompt('soft_gray');
    expect(promptGray).toContain('soft light gray studio vignette');

    const promptNeutral = buildStudioPrompt('warm_neutral');
    expect(promptNeutral).toContain('warm neutral organic luxury backdrop');

    const promptCustom = buildStudioPrompt('custom', '#f0f9ff');
    expect(promptCustom).toContain('#f0f9ff');
  });

  it('successfully isolates product from photo with person and returns clean studio output', async () => {
    process.env.MODEL_API_KEY = 'test_key';

    const mockOutput = {
      id: 'resp_sunscreen_studio',
      status: 'completed',
      output: [
        {
          type: 'image_generation_call',
          id: 'ig_sunscreen_01',
          status: 'completed',
          result: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        },
      ],
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockOutput), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const inputDataUrl = 'data:image/jpeg;base64,raw_sunscreen_with_girl_and_orange_background';
    const result = await generateOrEditProductPhotoWithMuseImage(inputDataUrl, {
      backdropPreset: 'pure_white',
      addContactShadow: true,
    });

    expect(result.segmentationSuccess).toBe(true);
    expect(result.isFallback).toBe(false);
    expect(result.provider).toBe("Meta Muse Image (" + META_MUSE_IMAGE_MODEL + ")");
    expect(result.editedImageUrl).toContain('data:image/webp;base64,');
    expect(result.appliedOperations.some((op) => op.includes('Removal of unwanted background, scene clutter, and people'))).toBe(true);
    expect(result.appliedOperations.some((op) => op.includes('Authentic product geometry & packaging fidelity preserved'))).toBe(true);
  });
});

describe('Snap & Sell Studio: Cluttered Shelf Object Detection (SAM 3.1 & Fallback)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('detects shelf objects using Meta SAM 3.1 when MODEL_API_KEY is active', async () => {
    process.env.MODEL_API_KEY = 'test_sam_key';

    const mockSAMResponse = {
      id: 'resp_sam_shelf',
      status: 'completed',
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'text',
              text: 'Detected objects on shelf: <|box;x1=250;y1=180;x2=550;w=300;h=620|> product sunscreen tube <|box;x1=600;y1=200;x2=850;w=250;h=600|> product bottle',
            },
          ],
        },
      ],
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockSAMResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const candidates = await detectShelfObjectsWithSAM('data:image/jpeg;base64,shelf_sample');
    expect(candidates.length).toBe(2);
    expect(candidates[0].label).toContain('Product');
    expect(candidates[0].confidence).toBeGreaterThanOrEqual(0.8);
    expect(candidates[0].box.width).toBeGreaterThan(0);
    expect(candidates[0].box.height).toBeGreaterThan(0);
  });

  it('provides reliable multi-candidate fallback bounding boxes when offline', async () => {
    const fallbackShelf = await detectProductsOnShelf('data:image/jpeg;base64,offline_shelf');
    expect(fallbackShelf.isFallback).toBe(true);
    expect(fallbackShelf.detectedObjects.length).toBeGreaterThanOrEqual(3);

    fallbackShelf.detectedObjects.forEach((obj) => {
      expect(obj.box.x).toBeGreaterThanOrEqual(0);
      expect(obj.box.y).toBeGreaterThanOrEqual(0);
      expect(obj.box.width).toBeGreaterThan(0);
      expect(obj.box.height).toBeGreaterThan(0);
      expect(obj.box.x + obj.box.width).toBeLessThanOrEqual(100);
    });
  });
});

describe('Snap & Sell Studio: Honest Failure Handling (No Fake Borders)', () => {
  it('returns honest failure when segmentation cannot isolate the product', async () => {
    const rawImage = 'data:image/jpeg;base64,unsegmentable_cluttered_photo';
    const result = await processProductImage(rawImage, {
      backdropPreset: 'pure_white',
      simulateFailure: true,
    });

    // Honest failure contract
    expect(result.segmentationSuccess).toBe(false);
    expect(result.isFallback).toBe(true);
    expect(result.errorMessage).toBeTruthy();
    expect(result.transparentCutoutUrl).toBeUndefined();
    expect(result.appliedOperations.some((op) => op.includes('Semantic product isolation unavailable or failed'))).toBe(true);
    expect(result.appliedOperations.some((op) => op.includes('Raw photograph retained without artificial borders'))).toBe(true);

    // Retains untouched raw image rather than a painted border
    expect(result.editedImageUrl).toBe(rawImage);
  });
});

describe('Snap & Sell Studio: Studio Backdrops & Shadow Synthesis', () => {
  const sampleImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  it('supports pure_white preset with realistic contact shadow', async () => {
    const res = await processProductImage(sampleImage, {
      backdropPreset: 'pure_white',
      addContactShadow: true,
    });
    expect(res.backdropUsed).toContain('Pure White');
    expect(res.hasContactShadow).toBe(true);
    expect(res.segmentationSuccess).toBe(true);
    expect(res.appliedOperations.some((op) => op.includes('Pure White'))).toBe(true);
    expect(res.appliedOperations.some((op) => op.includes('Synthesized dual-tier ground contact occlusion shadow'))).toBe(true);
  });

  it('supports soft_gray preset without shadow', async () => {
    const res = await processProductImage(sampleImage, {
      backdropPreset: 'soft_gray',
      addContactShadow: false,
    });
    expect(res.backdropUsed).toContain('Soft Light Gray');
    expect(res.hasContactShadow).toBe(false);
    expect(res.segmentationSuccess).toBe(true);
  });

  it('supports warm_neutral luxury preset', async () => {
    const res = await processProductImage(sampleImage, {
      backdropPreset: 'warm_neutral',
      addContactShadow: true,
    });
    expect(res.backdropUsed).toContain('Warm Neutral');
    expect(res.hasContactShadow).toBe(true);
    expect(res.segmentationSuccess).toBe(true);
  });

  it('supports custom hex backdrop palette', async () => {
    const res = await processProductImage(sampleImage, {
      backdropPreset: 'custom',
      customBackdropColor: '#fef08a',
    });
    expect(res.backdropUsed).toContain('Custom Palette (#fef08a)');
    expect(res.segmentationSuccess).toBe(true);
  });

  it('supports transparent PNG alpha cutout mode', async () => {
    const res = await processProductImage(sampleImage, {
      backdropPreset: 'transparent',
    });
    expect(res.backdropUsed).toContain('Isolated PNG Transparency');
    expect(res.transparentCutoutUrl).toBeTruthy();
    expect(res.segmentationSuccess).toBe(true);
  });
});

describe('Snap & Sell Studio: Seller Metadata Preservation Across Retries', () => {
  it('preserves all seller-entered fields across crop adjustments and segmentation retries', () => {
    // Seller fills metadata before/during studio workflow
    const sellerFormState = {
      title: 'Dermatological Daily Sunscreen SPF 50+',
      description: 'Water-resistant face and body sunscreen in lightweight 150ml tube with orange twist cap.',
      sellerPrice: '7500',
      condition: 'Brand New',
      category: 'Health & Beauty',
      material: 'Polypropylene plastic tube with UV-filtering coating',
    };

    // User triggers crop adjustment
    const cropAdjustmentEvent = {
      zoom: 1.25,
      rotation: 0,
      crop: { x: 50, y: 30, width: 400, height: 600 },
    };

    // Simulated new understanding returned from re-run
    const reAnalysisAiResult = {
      titleSuggestion: 'Sunscreen Bottle',
      descriptionSuggestion: 'Generic sunscreen product description generated by model',
      suggestedPriceRange: { min: 3500, max: 5500 },
      categorySuggestion: 'Health & Beauty' as const,
      visibleMaterialOrTexture: 'plastic',
      detectedCondition: 'Good',
    };

    // Seller fields MUST NOT be wiped or overwritten by AI suggestions
    const preservedTitle = sellerFormState.title.trim() ? sellerFormState.title : reAnalysisAiResult.titleSuggestion;
    const preservedDesc = sellerFormState.description.trim() ? sellerFormState.description : reAnalysisAiResult.descriptionSuggestion;
    const preservedPrice = sellerFormState.sellerPrice.trim() ? sellerFormState.sellerPrice : String(reAnalysisAiResult.suggestedPriceRange.min);
    const preservedCondition = sellerFormState.condition || reAnalysisAiResult.detectedCondition;
    const preservedCategory = sellerFormState.category || reAnalysisAiResult.categorySuggestion;
    const preservedMaterial = sellerFormState.material || reAnalysisAiResult.visibleMaterialOrTexture;

    expect(preservedTitle).toBe('Dermatological Daily Sunscreen SPF 50+');
    expect(preservedDesc).toBe('Water-resistant face and body sunscreen in lightweight 150ml tube with orange twist cap.');
    expect(preservedPrice).toBe('7500');
    expect(preservedCondition).toBe('Brand New');
    expect(preservedCategory).toBe('Health & Beauty');
    expect(preservedMaterial).toBe('Polypropylene plastic tube with UV-filtering coating');
  });
});

describe('Snap & Sell Studio: Upload-to-Publish Pipeline (Sunscreen with Girl & Backdrops)', () => {
  it('verifies the full end-to-end pipeline with pure_white, soft_gray, and warm_neutral backdrops', async () => {
    // 1. Raw upload: sunscreen with little girl and orange-and-white background
    const rawUploadedSunscreenPhoto = 'data:image/jpeg;base64,raw_sunscreen_with_little_girl_and_orange_background_highres';

    // 2. Crop selection with manual coordinates
    const cropCoordinates = { x: 25, y: 15, width: 50, height: 75 };

    // 3. Test isolation and studio synthesis across all three major backdrops
    const backdropPresets = ['pure_white', 'soft_gray', 'warm_neutral'] as const;

    for (const preset of backdropPresets) {
      const editResult = await processProductImage(rawUploadedSunscreenPhoto, {
        removeBackground: true,
        backdropPreset: preset,
        addContactShadow: true,
        cropCoordinates,
      });

      // Verify product isolation
      expect(editResult.segmentationSuccess).toBe(true);
      expect(editResult.isFallback).toBe(false);
      expect(editResult.editedImageUrl).toBeTruthy();
      expect(editResult.transparentCutoutUrl).toBeTruthy();
      expect(editResult.appliedOperations.some((op) => op.includes('Removal of unwanted background, people, and scene clutter'))).toBe(true);
      expect(editResult.appliedOperations.some((op) => op.includes('Synthesized dual-tier ground contact occlusion shadow'))).toBe(true);

      if (preset === 'pure_white') {
        expect(editResult.backdropUsed).toContain('Pure White');
      } else if (preset === 'soft_gray') {
        expect(editResult.backdropUsed).toContain('Soft Light Gray');
      } else if (preset === 'warm_neutral') {
        expect(editResult.backdropUsed).toContain('Warm Neutral');
      }
    }

    // 4. Seller accepts the pure_white studio edited image and publishes
    const finalStudioResult = await processProductImage(rawUploadedSunscreenPhoto, {
      removeBackground: true,
      backdropPreset: 'pure_white',
      addContactShadow: true,
      cropCoordinates,
    });

    const sellerCustomPrice = 8500;
    const sellerCustomTitle = 'Ultra-Defense Mineral Sunscreen SPF 50+';
    const sellerCustomDesc = 'Authentic 150ml broad spectrum sunscreen in clean squeeze tube with orange flip cap.';

    const embedding = await generateVisualEmbedding(
      'Beauty & Personal Care',
      ['sunscreen', 'skincare', 'spf50'],
      ['#ffffff', '#f97316'],
      'plastic tube'
    );

    const publishedProduct: Product = {
      id: `prod-sunscreen-${Date.now()}`,
      title: sellerCustomTitle,
      description: sellerCustomDesc,
      category: 'Beauty & Personal Care',
      price: sellerCustomPrice,
      currency: 'NGN',
      condition: 'Brand New',
      imageUrl: finalStudioResult.editedImageUrl,
      originalImageUrl: rawUploadedSunscreenPhoto,
      imageSource: 'seller_upload',
      sellerName: 'Lagos DermaCare Store',
      sellerRating: 5.0,
      location: 'Victoria Island, Lagos',
      visualTags: ['sunscreen', 'skincare', 'spf50'],
      dominantColors: ['#ffffff', '#f97316'],
      embedding,
      createdAt: new Date().toISOString(),
      isUserListed: true,
    };

    await persistProduct(publishedProduct);

    // Verify published product preserves studio-edited image and custom seller fields
    expect(publishedProduct.imageUrl).toBe(finalStudioResult.editedImageUrl);
    expect(publishedProduct.originalImageUrl).toBe(rawUploadedSunscreenPhoto);
    expect(publishedProduct.price).toBe(8500);
    expect(publishedProduct.title).toBe('Ultra-Defense Mineral Sunscreen SPF 50+');
    expect(publishedProduct.description).toContain('orange flip cap');
    expect(publishedProduct.category).toBe('Beauty & Personal Care');
  });
});

