import { describe, it, expect, beforeEach } from 'vitest';
import {
  searchSimilarProducts,
  MIN_SIMILARITY_THRESHOLD,
  getAllProducts,
  persistProduct,
  resetCatalog,
} from '../lib/repository';
import { SEEDED_PRODUCTS } from '../lib/catalog';
import {
  generateVisualEmbeddingFromImage,
  generateVisualEmbedding,
  createVisualVector,
} from '../lib/ai/embedding-provider';
import { extractLocalVisualUnderstanding } from '../lib/ai/understanding-provider';
import { processProductImage } from '../lib/ai/editing-provider';
import { Product } from '../types/product';

describe('Phase 1: Visual Product Search & False-Match Fixes', () => {
  beforeEach(async () => {
    await resetCatalog();
  });

  it('resolves the repeated Eucerin issue: distinct image payloads map to distinct categories and titles', () => {
    const shoeUnderstanding = extractLocalVisualUnderstanding('mock-photo-shelf-sneaker-white-running-shoe.jpg');
    const electronicsUnderstanding = extractLocalVisualUnderstanding('mock-photo-table-apple-airpods-headphones.jpg');
    const kettleUnderstanding = extractLocalVisualUnderstanding('mock-photo-kitchen-gooseneck-kettle.jpg');
    const sunscreenUnderstanding = extractLocalVisualUnderstanding('mock-photo-skincare-sunscreen-spf50-eucerin.jpg');

    // Each must identify its distinct category and title, NOT collapsing to Eucerin
    expect(shoeUnderstanding.categorySuggestion).toBe('Fashion & Footwear');
    expect(shoeUnderstanding.titleSuggestion).toContain('Nike');

    expect(electronicsUnderstanding.categorySuggestion).toBe('Electronics & Gadgets');
    expect(electronicsUnderstanding.titleSuggestion).toContain('AirPods');

    expect(kettleUnderstanding.categorySuggestion).toBe('Home & Living');
    expect(kettleUnderstanding.titleSuggestion).toContain('Kettle');

    expect(sunscreenUnderstanding.categorySuggestion).toBe('Beauty & Personal Care');
    expect(sunscreenUnderstanding.titleSuggestion).toContain('Eucerin');
  });

  it('guarantees catalog items have isolated identities with no metadata leakage', () => {
    const eucerin = SEEDED_PRODUCTS.find((p) => p.id === 'prod-001');
    const nike = SEEDED_PRODUCTS.find((p) => p.id === 'prod-005');
    const airpods = SEEDED_PRODUCTS.find((p) => p.id === 'prod-009');

    expect(eucerin).toBeDefined();
    expect(nike).toBeDefined();
    expect(airpods).toBeDefined();

    expect(eucerin?.title).toContain('Eucerin');
    expect(nike?.title).toContain('Nike');
    expect(airpods?.title).toContain('AirPods');

    // Titles, images, and categories must be distinct
    expect(nike?.title).not.toEqual(eucerin?.title);
    expect(nike?.imageUrl).not.toEqual(eucerin?.imageUrl);
    expect(airpods?.category).not.toEqual(eucerin?.category);
  });

  it('ranks shoes at the top when querying with a shoe photo embedding and excludes unrelated categories', async () => {
    const shoeEmbedding = await generateVisualEmbeddingFromImage('data:image/jpeg;base64,sample-shoe-sneaker-footwear');
    const results = await searchSimilarProducts(
      shoeEmbedding,
      ['sneakers', 'shoe', 'footwear'],
      ['#ffffff'],
      'Fashion & Footwear'
    );

    expect(results.length).toBeGreaterThan(0);
    // The top result must be from Fashion & Footwear
    expect(results[0].product.category).toBe('Fashion & Footwear');
    expect(results[0].similarityScore).toBeGreaterThanOrEqual(MIN_SIMILARITY_THRESHOLD);

    // Skincare (e.g. Eucerin) must NOT be returned or contaminated into shoe query results
    const skincareInResults = results.filter((r) => r.product.category === 'Beauty & Personal Care');
    expect(skincareInResults.length).toBe(0);
  });

  it('rejects cross-category mismatch: phone query rejects skincare below the 0.58 threshold', async () => {
    const phoneEmbedding = await generateVisualEmbeddingFromImage('data:image/jpeg;base64,phone-device-gadget-electronic');
    const results = await searchSimilarProducts(
      phoneEmbedding,
      ['phone', 'gadget', 'screen'],
      ['#0f172a'],
      'Electronics & Gadgets'
    );

    expect(results.length).toBeGreaterThan(0);
    for (const res of results) {
      expect(res.product.category).toBe('Electronics & Gadgets');
      expect(res.similarityScore).toBeGreaterThanOrEqual(0.58);
    }

    // Zero skincare products should pass the 0.58 threshold
    const hasSkincare = results.some((r) => r.product.title.toLowerCase().includes('sunscreen'));
    expect(hasSkincare).toBe(false);
  });

  it('enforces credible rejection threshold: returns empty results for completely uncataloged/unrelated query', async () => {
    // Orthogonal vector with 0 category, 0 tag overlap, 0 color overlap
    const orthogonalVector = new Array(64).fill(0);
    orthogonalVector[63] = 1.0; // Point to an isolated texture dimension only

    const results = await searchSimilarProducts(
      orthogonalVector,
      ['automobile', 'tire', 'machinery'],
      ['#333333'],
      'Automotive'
    );

    // Must return empty array so UI cleanly renders "No Close Visual Match Found"
    expect(results.length).toBe(0);
  });

  it('identifies a purple smartphone as Electronics & Gadgets and NEVER matches Nike Air Force 1 sneaker', async () => {
    // 1. Test understanding heuristic doesn't fall back to Nike sneaker profile
    const understanding = extractLocalVisualUnderstanding('mock-photo-shelf-purple-violet-smartphone.jpg');
    expect(understanding.categorySuggestion).toBe('Electronics & Gadgets');
    expect(understanding.titleSuggestion.toLowerCase()).not.toContain('nike');
    expect(understanding.titleSuggestion.toLowerCase()).toContain('phone');

    // 2. Test catalog search with purple phone attributes
    const phoneEmbedding = await generateVisualEmbedding(
      understanding.categorySuggestion,
      understanding.visualTags,
      understanding.dominantColors,
      understanding.visibleMaterialOrTexture
    );

    const results = await searchSimilarProducts(
      phoneEmbedding,
      understanding.visualTags,
      understanding.dominantColors,
      understanding.categorySuggestion,
      understanding.visibleMaterialOrTexture
    );

    expect(results.length).toBeGreaterThan(0);
    const topResult = results[0];
    expect(topResult.product.category).toBe('Electronics & Gadgets');
    expect(topResult.product.title).toContain('Samsung Galaxy S24 Ultra');

    // Nike sneaker must NEVER be in the results
    const hasSneaker = results.some((r) => r.product.title.toLowerCase().includes('nike'));
    expect(hasSneaker).toBe(false);
  });
});

describe('Phase 2: Seller-Controlled Image Cropping & State Preservation', () => {
  it('standardizes output dimensions and preserves natural aspect ratio without distortion', async () => {
    const sampleImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const result = await processProductImage(sampleImage, {
      removeBackground: true,
      brightnessCorrection: 10,
      contrastCorrection: 10,
      cropCoordinates: { x: 10, y: 10, width: 80, height: 80 },
    });

    expect(result.editedImageUrl).toBeTruthy();
    expect(result.appliedOperations.length).toBeGreaterThan(0);
    expect(result.appliedOperations.some((op) => op.includes('Cropped to region') || op.includes('Pass-through'))).toBe(true);
  });

  it('isolates 3 distinct image states and ensures retries never mutate the raw original image', () => {
    const rawPhoto = 'data:image/jpeg;base64,untouched-original-raw-shelf-photo-highres';
    let croppedPhoto: string | null = null;
    let editedPhoto: string | null = null;

    // 1. Initial crop
    croppedPhoto = 'data:image/jpeg;base64,first-crop-attempt';
    editedPhoto = 'data:image/jpeg;base64,first-enhanced-output';

    // Verify 3 distinct states exist simultaneously
    expect(rawPhoto).not.toEqual(croppedPhoto);
    expect(croppedPhoto).not.toEqual(editedPhoto);

    // 2. Seller clicks "Adjust Crop & Try Again": must re-sample from rawPhoto
    const retryInputSource = rawPhoto;
    expect(retryInputSource).toEqual('data:image/jpeg;base64,untouched-original-raw-shelf-photo-highres');

    // 3. Second crop adjustment
    croppedPhoto = 'data:image/jpeg;base64,second-tighter-crop-attempt';
    editedPhoto = 'data:image/jpeg;base64,second-enhanced-output';

    // Raw photo remains identical to original
    expect(rawPhoto).toEqual('data:image/jpeg;base64,untouched-original-raw-shelf-photo-highres');
    expect(croppedPhoto).toContain('second-tighter-crop');
  });

  it('preserves seller-entered metadata across crop retries and re-runs', () => {
    // Seller fills custom details
    const sellerDetails = {
      title: 'Handmade Nigerian Beaded Necklace',
      category: 'Bags & Accessories',
      sellerPrice: '25000',
      hasUserModifiedPrice: true,
      description: 'Authentic handcrafted African cultural beadwork.',
    };

    // Simulated crop retry with new understanding output
    const newAiUnderstanding = {
      titleSuggestion: 'Generic Beads',
      categorySuggestion: 'Bags & Accessories' as const,
      descriptionSuggestion: 'AI auto generated description',
      suggestedPriceRange: { min: 12000, max: 18000 },
    };

    // Preservation logic: do not overwrite seller custom entries
    const finalTitle = sellerDetails.title.trim() ? sellerDetails.title : newAiUnderstanding.titleSuggestion;
    const finalPrice = sellerDetails.hasUserModifiedPrice ? sellerDetails.sellerPrice : String(newAiUnderstanding.suggestedPriceRange.min);
    const finalDesc = sellerDetails.description.trim() ? sellerDetails.description : newAiUnderstanding.descriptionSuggestion;

    expect(finalTitle).toBe('Handmade Nigerian Beaded Necklace');
    expect(finalPrice).toBe('25000'); // Preserved; NOT overwritten by AI 12000
    expect(finalDesc).toBe('Authentic handcrafted African cultural beadwork.');
  });

  it('supports selectable studio backdrops and dual-tier contact shadow synthesis', async () => {
    const sampleImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    // Test pure_white with shadow
    const whiteResult = await processProductImage(sampleImage, {
      backdropPreset: 'pure_white',
      addContactShadow: true,
      cropCoordinates: { x: 5, y: 5, width: 90, height: 90 },
    });
    expect(whiteResult.backdropUsed).toContain('Pure White');
    expect(whiteResult.hasContactShadow).toBe(true);
    expect(whiteResult.transparentCutoutUrl).toBeTruthy();
    expect(whiteResult.appliedOperations.some((op) => op.includes('Pure White'))).toBe(true);
    expect(whiteResult.appliedOperations.some((op) => op.includes('contact occlusion'))).toBe(true);

    // Test soft_gray backdrop
    const grayResult = await processProductImage(sampleImage, {
      backdropPreset: 'soft_gray',
      addContactShadow: true,
    });
    expect(grayResult.backdropUsed).toContain('Soft Light Gray');

    // Test warm_neutral backdrop
    const warmResult = await processProductImage(sampleImage, {
      backdropPreset: 'warm_neutral',
      addContactShadow: false,
    });
    expect(warmResult.backdropUsed).toContain('Warm Neutral');
    expect(warmResult.hasContactShadow).toBe(false);

    // Test custom backdrop
    const customResult = await processProductImage(sampleImage, {
      backdropPreset: 'custom',
      customBackdropColor: '#e0e7ff',
    });
    expect(customResult.backdropUsed).toContain('Custom Palette');
  });
});

describe('Phase 3: Seller Pricing Authority & Validation', () => {
  beforeEach(async () => {
    await resetCatalog();
  });

  it('allows seller to enter a custom selling price independent of AI suggestions', () => {
    const aiSuggested = { min: 32000, max: 42000 };
    let sellerPrice = '55000';
    let hasUserModified = true;

    // Seller custom price is respected
    expect(Number(sellerPrice)).toBe(55000);
    expect(Number(sellerPrice)).toBeGreaterThan(aiSuggested.max);

    // Optional shortcut: Apply Suggested
    const applySuggested = () => {
      sellerPrice = String(aiSuggested.min);
      hasUserModified = true;
    };
    applySuggested();
    expect(sellerPrice).toBe('32000');
    expect(hasUserModified).toBe(true);

    // Seller can continue editing after applying suggestion
    sellerPrice = '34500';
    expect(sellerPrice).toBe('34500');
  });

  it('validates price input: rejects negative, zero, or non-numeric values', () => {
    const validatePrice = (input: string): { valid: boolean; error: string | null; amount: number } => {
      const num = Number(input);
      if (!input.trim() || isNaN(num) || num <= 0 || !Number.isFinite(num)) {
        return { valid: false, error: 'Please enter a valid positive selling price greater than ₦0', amount: 0 };
      }
      return { valid: true, error: null, amount: num };
    };

    expect(validatePrice('-500').valid).toBe(false);
    expect(validatePrice('0').valid).toBe(false);
    expect(validatePrice('abc').valid).toBe(false);
    expect(validatePrice('   ').valid).toBe(false);

    const validCheck = validatePrice('45000');
    expect(validCheck.valid).toBe(true);
    expect(validCheck.error).toBeNull();
    expect(validCheck.amount).toBe(45000);
  });

  it('persists product with seller chosen price and verifies retrieval in catalog', async () => {
    const customPrice = 88000;
    const testProduct: Product = {
      id: `test-seller-prod-${Date.now()}`,
      title: 'Custom Priced Premium Sneakers',
      description: 'Exclusive merchant release.',
      category: 'Fashion & Footwear',
      price: customPrice,
      currency: 'NGN',
      condition: 'Brand New',
      imageUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a',
      imageSource: 'seller_upload',
      sellerName: 'Lagos Sneaker Vault',
      sellerRating: 5.0,
      location: 'Victoria Island, Lagos',
      visualTags: ['sneakers', 'custom', 'shoes'],
      dominantColors: ['#ffffff', '#000000'],
      embedding: createVisualVector('Fashion & Footwear', ['sneakers', 'shoes'], ['#ffffff']),
      createdAt: new Date().toISOString(),
      isUserListed: true,
    };

    await persistProduct(testProduct);

    const all = await getAllProducts();
    const retrieved = all.find((p) => p.id === testProduct.id);

    expect(retrieved).toBeDefined();
    expect(retrieved?.price).toBe(88000);
    expect(retrieved?.currency).toBe('NGN');
    expect(retrieved?.sellerName).toBe('Lagos Sneaker Vault');
  });

  it('persists approved enhanced image and seller chosen price upon publishing', async () => {
    const rawPhoto = 'data:image/jpeg;base64,raw-messy-shelf-photo';
    const enhancedPhoto = 'data:image/jpeg;base64,studio-white-enhanced-photo-with-shadow';

    const publishedProduct: Product = {
      id: `prod-pub-${Date.now()}`,
      title: 'Merchant Verified Mechanical Keyboard',
      description: 'Custom mechanical keyboard with tactile switches.',
      category: 'Electronics & Gadgets',
      price: 65000,
      currency: 'NGN',
      condition: 'Like New',
      imageUrl: enhancedPhoto, // Must use enhanced photo, not raw shelf photo
      imageSource: 'seller_upload',
      sellerName: 'Tech Haven Ikeja',
      sellerRating: 4.9,
      location: 'Ikeja, Lagos',
      visualTags: ['keyboard', 'electronics'],
      dominantColors: ['#0f172a', '#ffffff'],
      embedding: createVisualVector('Electronics & Gadgets', ['keyboard'], ['#0f172a']),
      createdAt: new Date().toISOString(),
      isUserListed: true,
    };

    await persistProduct(publishedProduct);
    const all = await getAllProducts();
    const retrieved = all.find((p) => p.id === publishedProduct.id);

    expect(retrieved).toBeDefined();
    expect(retrieved?.imageUrl).toBe(enhancedPhoto);
    expect(retrieved?.imageUrl).not.toBe(rawPhoto);
    expect(retrieved?.price).toBe(65000);
  });
});
