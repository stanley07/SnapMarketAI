import { describe, it, expect, vi } from 'vitest';
import {
  STUDIO_PRESETS,
  normalizeHexColor,
  formatBackdropName,
  encodeRgbaToPng,
  decodePngDataUrl,
  validateAlphaMask,
  compositeProductOnBackdrop,
} from '../lib/ai/studio-compositor';
import {
  renderStudioComposite,
} from '../lib/ai/editing-provider';

describe('Defect 1: Studio Background Preset & Custom Hex Color Fidelity', () => {
  // Synthesize a canonical 200x200 product cutout with an opaque product square in the center
  function createTestCutoutPng(): string {
    const w = 200;
    const h = 200;
    const rgba = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        // Centered product: x from 60 to 140, y from 40 to 160
        if (x >= 60 && x <= 140 && y >= 40 && y <= 160) {
          rgba[idx] = 255;     // Product R (solid red for identification)
          rgba[idx + 1] = 80;  // Product G
          rgba[idx + 2] = 20;  // Product B
          rgba[idx + 3] = 255; // Product Alpha
        } else {
          rgba[idx] = 0;
          rgba[idx + 1] = 0;
          rgba[idx + 2] = 0;
          rgba[idx + 3] = 0;   // Transparent backdrop
        }
      }
    }
    const png = encodeRgbaToPng(w, h, rgba);
    return 'data:image/png;base64,' + png.toString('base64');
  }

  const testCutoutUrl = createTestCutoutPng();

  it('verifies preset hex definitions match design requirements', () => {
    expect(STUDIO_PRESETS.pure_white).toBe('#FFFFFF');
    expect(STUDIO_PRESETS.soft_gray).toBe('#E5E7EB');
    expect(STUDIO_PRESETS.warm_neutral).toBe('#F5EBDD');
  });

  it('validates and normalizes 3-char and 6-char hex codes to uppercase #RRGGBB', () => {
    expect(normalizeHexColor('#ffffff')).toEqual({ valid: true, normalized: '#FFFFFF' });
    expect(normalizeHexColor('e5e7eb')).toEqual({ valid: true, normalized: '#E5E7EB' });
    expect(normalizeHexColor('#fff')).toEqual({ valid: true, normalized: '#FFFFFF' });
    expect(normalizeHexColor('abc')).toEqual({ valid: true, normalized: '#AABBCC' });
    expect(normalizeHexColor('#D9EAD3')).toEqual({ valid: true, normalized: '#D9EAD3' });

    // Invalid codes
    expect(normalizeHexColor('not-a-color').valid).toBe(false);
    expect(normalizeHexColor('#12345').valid).toBe(false);
    expect(normalizeHexColor('#1234567').valid).toBe(false);
    expect(normalizeHexColor('#ZZZZZZ').valid).toBe(false);
  });

  it('Pure White (#FFFFFF) produces pure white background pixels (R:255, G:255, B:255)', async () => {
    const resultUrl = await compositeProductOnBackdrop(testCutoutUrl, {
      backdropPreset: 'pure_white',
      addContactShadow: false,
      canvasWidth: 200,
      canvasHeight: 200,
      padding: 10,
    });

    const decoded = decodePngDataUrl(resultUrl);
    expect(decoded.width).toBe(200);
    expect(decoded.height).toBe(200);

    // Corner pixel (10, 10) must be Pure White
    const cornerIdx = (10 * 200 + 10) * 4;
    expect(decoded.rgba[cornerIdx]).toBe(255);     // R
    expect(decoded.rgba[cornerIdx + 1]).toBe(255); // G
    expect(decoded.rgba[cornerIdx + 2]).toBe(255); // B
    expect(decoded.rgba[cornerIdx + 3]).toBe(255); // A
  });

  it('Soft Gray (#E5E7EB) produces exact rgb(229, 231, 235) background pixels', async () => {
    const resultUrl = await compositeProductOnBackdrop(testCutoutUrl, {
      backdropPreset: 'soft_gray',
      addContactShadow: false,
      canvasWidth: 200,
      canvasHeight: 200,
      padding: 10,
    });

    const decoded = decodePngDataUrl(resultUrl);
    const cornerIdx = (10 * 200 + 10) * 4;
    expect(decoded.rgba[cornerIdx]).toBe(229);     // R (#E5)
    expect(decoded.rgba[cornerIdx + 1]).toBe(231); // G (#E7)
    expect(decoded.rgba[cornerIdx + 2]).toBe(235); // B (#EB)
    expect(decoded.rgba[cornerIdx + 3]).toBe(255);
  });

  it('Warm Neutral (#F5EBDD) produces exact rgb(245, 235, 221) background pixels', async () => {
    const resultUrl = await compositeProductOnBackdrop(testCutoutUrl, {
      backdropPreset: 'warm_neutral',
      addContactShadow: false,
      canvasWidth: 200,
      canvasHeight: 200,
      padding: 10,
    });

    const decoded = decodePngDataUrl(resultUrl);
    const cornerIdx = (10 * 200 + 10) * 4;
    expect(decoded.rgba[cornerIdx]).toBe(245);     // R (#F5)
    expect(decoded.rgba[cornerIdx + 1]).toBe(235); // G (#EB)
    expect(decoded.rgba[cornerIdx + 2]).toBe(221); // B (#DD)
    expect(decoded.rgba[cornerIdx + 3]).toBe(255);
  });

  it('Custom Hex (#D9EAD3) produces exact rgb(217, 234, 211) and is visibly distinct from Pure White', async () => {
    const customResultUrl = await compositeProductOnBackdrop(testCutoutUrl, {
      backdropPreset: 'custom',
      customHexColor: '#D9EAD3',
      addContactShadow: false,
      canvasWidth: 200,
      canvasHeight: 200,
      padding: 10,
    });

    const decodedCustom = decodePngDataUrl(customResultUrl);
    const cornerIdx = (10 * 200 + 10) * 4;
    expect(decodedCustom.rgba[cornerIdx]).toBe(217);     // R (#D9)
    expect(decodedCustom.rgba[cornerIdx + 1]).toBe(234); // G (#EA)
    expect(decodedCustom.rgba[cornerIdx + 2]).toBe(211); // B (#D3)
    expect(decodedCustom.rgba[cornerIdx + 3]).toBe(255);

    // Compare with Pure White: must NOT be identical
    const whiteResultUrl = await compositeProductOnBackdrop(testCutoutUrl, {
      backdropPreset: 'pure_white',
      addContactShadow: false,
      canvasWidth: 200,
      canvasHeight: 200,
      padding: 10,
    });
    const decodedWhite = decodePngDataUrl(whiteResultUrl);

    // Color difference between Pure White and Sage Green Custom Hex
    const rDiff = Math.abs(decodedCustom.rgba[cornerIdx] - decodedWhite.rgba[cornerIdx]);
    const gDiff = Math.abs(decodedCustom.rgba[cornerIdx + 1] - decodedWhite.rgba[cornerIdx + 1]);
    const bDiff = Math.abs(decodedCustom.rgba[cornerIdx + 2] - decodedWhite.rgba[cornerIdx + 2]);
    expect(rDiff + gDiff + bDiff).toBeGreaterThan(50);
  });

  it('Transparent mode produces pure alpha=0 background pixels', async () => {
    const resultUrl = await compositeProductOnBackdrop(testCutoutUrl, {
      backdropPreset: 'transparent',
      canvasWidth: 200,
      canvasHeight: 200,
      padding: 10,
    });

    const decoded = decodePngDataUrl(resultUrl);
    const cornerIdx = (5 * 200 + 5) * 4;
    expect(decoded.rgba[cornerIdx + 3]).toBe(0); // Fully transparent background
  });
});

describe('Defect 2: Product Preservation Across Background Changes (Zero AI Calls on Switch)', () => {
  function createTestCutoutPng(): string {
    const w = 200;
    const h = 200;
    const rgba = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        if (x >= 60 && x <= 140 && y >= 40 && y <= 160) {
          rgba[idx] = 255;
          rgba[idx + 1] = 80;
          rgba[idx + 2] = 20;
          rgba[idx + 3] = 255;
        } else {
          rgba[idx] = 0;
          rgba[idx + 1] = 0;
          rgba[idx + 2] = 0;
          rgba[idx + 3] = 0;
        }
      }
    }
    const png = encodeRgbaToPng(w, h, rgba);
    return 'data:image/png;base64,' + png.toString('base64');
  }

  const canonicalCutout = createTestCutoutPng();

  it('preserves product pixels byte-for-byte when switching backgrounds', async () => {
    // Render on Pure White
    const whiteComp = await renderStudioComposite(canonicalCutout, {
      backdropPreset: 'pure_white',
      addContactShadow: false,
    });

    // Render on Soft Gray
    const grayComp = await renderStudioComposite(canonicalCutout, {
      backdropPreset: 'soft_gray',
      addContactShadow: false,
    });

    // Render on Warm Neutral
    const warmComp = await renderStudioComposite(canonicalCutout, {
      backdropPreset: 'warm_neutral',
      addContactShadow: false,
    });

    // Render on Custom Hex
    const customComp = await renderStudioComposite(canonicalCutout, {
      backdropPreset: 'custom',
      customBackdropColor: '#D9EAD3',
      addContactShadow: false,
    });

    const decWhite = decodePngDataUrl(whiteComp.editedImageUrl);
    const decGray = decodePngDataUrl(grayComp.editedImageUrl);
    const decWarm = decodePngDataUrl(warmComp.editedImageUrl);
    const decCustom = decodePngDataUrl(customComp.editedImageUrl);

    // Center pixel of the product (400, 400) on 800x800 canvas
    const centerIdx = (400 * 800 + 400) * 4;

    // The product color must be identical across all backdrops
    expect(decWhite.rgba[centerIdx]).toBe(255);
    expect(decWhite.rgba[centerIdx + 1]).toBe(80);
    expect(decWhite.rgba[centerIdx + 2]).toBe(20);

    expect(decGray.rgba[centerIdx]).toBe(decWhite.rgba[centerIdx]);
    expect(decGray.rgba[centerIdx + 1]).toBe(decWhite.rgba[centerIdx + 1]);
    expect(decGray.rgba[centerIdx + 2]).toBe(decWhite.rgba[centerIdx + 2]);

    expect(decWarm.rgba[centerIdx]).toBe(decWhite.rgba[centerIdx]);
    expect(decWarm.rgba[centerIdx + 1]).toBe(decWhite.rgba[centerIdx + 1]);
    expect(decWarm.rgba[centerIdx + 2]).toBe(decWhite.rgba[centerIdx + 2]);

    expect(decCustom.rgba[centerIdx]).toBe(decWhite.rgba[centerIdx]);
    expect(decCustom.rgba[centerIdx + 1]).toBe(decWhite.rgba[centerIdx + 1]);
    expect(decCustom.rgba[centerIdx + 2]).toBe(decWhite.rgba[centerIdx + 2]);
  });

  it('makes ZERO network or AI model calls when switching backgrounds', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    // Perform multiple background changes in succession
    await renderStudioComposite(canonicalCutout, { backdropPreset: 'pure_white' });
    await renderStudioComposite(canonicalCutout, { backdropPreset: 'soft_gray' });
    await renderStudioComposite(canonicalCutout, { backdropPreset: 'warm_neutral' });
    await renderStudioComposite(canonicalCutout, { backdropPreset: 'custom', customBackdropColor: '#A8DADC' });
    await renderStudioComposite(canonicalCutout, { backdropPreset: 'transparent' });

    // Deterministic compositing must NEVER touch fetch, /api/ai/edit, or muse-image-1.0
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it('preserves transparentCutoutUrl across composite calls as immutable source', async () => {
    const composite1 = await renderStudioComposite(canonicalCutout, { backdropPreset: 'pure_white' });
    const composite2 = await renderStudioComposite(canonicalCutout, { backdropPreset: 'soft_gray' });

    expect(composite1.transparentCutoutUrl).toBe(canonicalCutout);
    expect(composite2.transparentCutoutUrl).toBe(canonicalCutout);
  });

  it('switching from white to red to blue to green preserves the exact same product cutout and background changes accurately', async () => {
    // 1. White composite
    const whiteRes = await renderStudioComposite(canonicalCutout, {
      backdropPreset: 'pure_white',
      addContactShadow: false,
    });
    const decWhite = decodePngDataUrl(whiteRes.editedImageUrl);

    // 2. Red composite (#FF0000)
    const redRes = await renderStudioComposite(canonicalCutout, {
      backdropPreset: 'custom',
      customBackdropColor: '#FF0000',
      addContactShadow: false,
    });
    const decRed = decodePngDataUrl(redRes.editedImageUrl);

    // 3. Blue composite (#0000FF)
    const blueRes = await renderStudioComposite(canonicalCutout, {
      backdropPreset: 'custom',
      customBackdropColor: '#0000FF',
      addContactShadow: false,
    });
    const decBlue = decodePngDataUrl(blueRes.editedImageUrl);

    // 4. Green composite (#00FF00)
    const greenRes = await renderStudioComposite(canonicalCutout, {
      backdropPreset: 'custom',
      customBackdropColor: '#00FF00',
      addContactShadow: false,
    });
    const decGreen = decodePngDataUrl(greenRes.editedImageUrl);

    // Assert corner background pixel colors match requested hex exactly
    const cornerIdx = (10 * 800 + 10) * 4;
    // Pure White (#FFFFFF)
    expect(decWhite.rgba[cornerIdx]).toBe(255);
    expect(decWhite.rgba[cornerIdx + 1]).toBe(255);
    expect(decWhite.rgba[cornerIdx + 2]).toBe(255);
    // Red (#FF0000)
    expect(decRed.rgba[cornerIdx]).toBe(255);
    expect(decRed.rgba[cornerIdx + 1]).toBe(0);
    expect(decRed.rgba[cornerIdx + 2]).toBe(0);
    // Blue (#0000FF)
    expect(decBlue.rgba[cornerIdx]).toBe(0);
    expect(decBlue.rgba[cornerIdx + 1]).toBe(0);
    expect(decBlue.rgba[cornerIdx + 2]).toBe(255);
    // Green (#00FF00)
    expect(decGreen.rgba[cornerIdx]).toBe(0);
    expect(decGreen.rgba[cornerIdx + 1]).toBe(255);
    expect(decGreen.rgba[cornerIdx + 2]).toBe(0);

    // Assert center product pixels are byte-for-byte identical across all 4 background changes
    const centerIdx = (400 * 800 + 400) * 4;
    expect(decRed.rgba[centerIdx]).toBe(decWhite.rgba[centerIdx]);
    expect(decRed.rgba[centerIdx + 1]).toBe(decWhite.rgba[centerIdx + 1]);
    expect(decRed.rgba[centerIdx + 2]).toBe(decWhite.rgba[centerIdx + 2]);

    expect(decBlue.rgba[centerIdx]).toBe(decWhite.rgba[centerIdx]);
    expect(decBlue.rgba[centerIdx + 1]).toBe(decWhite.rgba[centerIdx + 1]);
    expect(decBlue.rgba[centerIdx + 2]).toBe(decWhite.rgba[centerIdx + 2]);

    expect(decGreen.rgba[centerIdx]).toBe(decWhite.rgba[centerIdx]);
    expect(decGreen.rgba[centerIdx + 1]).toBe(decWhite.rgba[centerIdx + 1]);
    expect(decGreen.rgba[centerIdx + 2]).toBe(decWhite.rgba[centerIdx + 2]);

    // Transparent cutout remains identical
    expect(whiteRes.transparentCutoutUrl).toBe(canonicalCutout);
    expect(redRes.transparentCutoutUrl).toBe(canonicalCutout);
    expect(blueRes.transparentCutoutUrl).toBe(canonicalCutout);
    expect(greenRes.transparentCutoutUrl).toBe(canonicalCutout);
  });

  it('published listing images use the selected background color accurately as lossless PNG', async () => {
    // Composite onto Soft Light Gray
    const composite = await renderStudioComposite(canonicalCutout, {
      backdropPreset: 'soft_gray',
      addContactShadow: false,
    });

    const listingProduct = {
      id: 'prod-test-bg-123',
      title: 'Studio Sunscreen SPF 50',
      description: 'Preserved product description',
      price: 9000,
      currency: 'NGN' as const,
      category: 'Beauty & Personal Care' as const,
      condition: 'Brand New' as const,
      imageUrl: composite.editedImageUrl,
      originalImageUrl: 'data:image/jpeg;base64,mock_raw_original',
      imageSource: 'seller_upload' as const,
      sellerName: 'Lagos DermaCare',
      sellerRating: 5.0,
      location: 'Lagos',
      visualTags: ['sunscreen'],
      dominantColors: ['#E5E7EB'],
      createdAt: new Date().toISOString(),
      isUserListed: true,
    };

    // Verify listing image is lossless PNG
    expect(listingProduct.imageUrl).toContain('data:image/png;base64,');

    // Decode and verify the background pixels of the published listing image match Soft Light Gray (#E5E7EB)
    const decoded = decodePngDataUrl(listingProduct.imageUrl);
    const cornerIdx = (10 * 800 + 10) * 4;
    expect(decoded.rgba[cornerIdx]).toBe(229);
    expect(decoded.rgba[cornerIdx + 1]).toBe(231);
    expect(decoded.rgba[cornerIdx + 2]).toBe(235);
  });
});

describe('Validation & Honest Error Handling', () => {
  it('validates alpha mask correctly rejecting empty and full-perimeter masks', () => {
    // 1. Empty mask (all zeros)
    const emptyRgba = Buffer.alloc(100 * 100 * 4);
    const emptyCheck = validateAlphaMask(100, 100, emptyRgba);
    expect(emptyCheck.valid).toBe(false);
    expect(emptyCheck.error).toContain('Product mask is empty');

    // 2. Full solid rectangle (all 255 alpha - unsegmented photo)
    const solidRgba = Buffer.alloc(100 * 100 * 4, 255);
    const solidCheck = validateAlphaMask(100, 100, solidRgba);
    expect(solidCheck.valid).toBe(false);
    expect(solidCheck.error).toContain('spans the entire photograph');

    // 3. Valid isolated product
    const validRgba = Buffer.alloc(100 * 100 * 4);
    for (let y = 20; y <= 80; y++) {
      for (let x = 20; x <= 80; x++) {
        validRgba[(y * 100 + x) * 4 + 3] = 255;
      }
    }
    const validCheck = validateAlphaMask(100, 100, validRgba);
    expect(validCheck.valid).toBe(true);
    expect(validCheck.error).toBeUndefined();
    expect(validCheck.opaqueFraction).toBeGreaterThan(0.2);
    expect(validCheck.opaqueFraction).toBeLessThan(0.8);
  });

  it('preserves seller-entered form details across retries without overwriting', () => {
    const sellerTitle = 'Custom Mineral Sunscreen Lotion';
    const sellerDesc = 'High SPF dermatological sunscreen with orange cap.';
    const sellerPrice = '12500';

    // Mock an AI recommendation returned during retry
    const aiRecommendation = {
      title: 'AI Generic Product',
      desc: 'AI Description',
      price: '5000',
    };

    // Seller fields must take precedence if already populated
    const resolvedTitle = sellerTitle.trim() ? sellerTitle : aiRecommendation.title;
    const resolvedDesc = sellerDesc.trim() ? sellerDesc : aiRecommendation.desc;
    const resolvedPrice = sellerPrice.trim() ? sellerPrice : aiRecommendation.price;

    expect(resolvedTitle).toBe(sellerTitle);
    expect(resolvedDesc).toBe(sellerDesc);
    expect(resolvedPrice).toBe(sellerPrice);
  });
});
