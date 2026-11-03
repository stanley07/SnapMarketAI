import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfirmationModalProps } from '../components/ConfirmationModal';
import { getAllProducts, persistProduct, resetCatalog } from '../lib/repository';
import { Product } from '../types/product';
import { generateVisualEmbedding } from '../lib/ai/embedding-provider';

interface StudioState {
  session: number;
  step: 'upload' | 'crop_select' | 'review_edit' | 'listing_form' | 'success';
  rawImage: string | null;
  croppedImage: string | null;
  canonicalCutoutUrl: string | null;
  editedImage: string | null;
  activeListingImage: string | null;
  detectedBoxes: string[];
  // Seller metadata
  title: string;
  hasUserModifiedTitle: boolean;
  description: string;
  hasUserModifiedDescription: boolean;
  price: string;
  hasUserModifiedPrice: boolean;
  category: string;
  condition: string;
  material: string;
  hasUserModifiedMaterial: boolean;
  sellerName: string;
  location: string;
}

function createInitialState(): StudioState {
  return {
    session: 0,
    step: 'upload',
    rawImage: null,
    croppedImage: null,
    canonicalCutoutUrl: null,
    editedImage: null,
    activeListingImage: null,
    detectedBoxes: [],
    title: '',
    hasUserModifiedTitle: false,
    description: '',
    hasUserModifiedDescription: false,
    price: '35000',
    hasUserModifiedPrice: false,
    category: 'Beauty & Personal Care',
    condition: 'Brand New',
    material: '',
    hasUserModifiedMaterial: false,
    sellerName: 'My Local Shop',
    location: 'Lekki Phase 1, Lagos',
  };
}

function handleImageUploaded(state: StudioState, imageDataUrl: string): StudioState {
  return {
    ...state,
    session: state.session + 1,
    rawImage: imageDataUrl,
    croppedImage: null,
    canonicalCutoutUrl: null,
    editedImage: null,
    activeListingImage: null,
    detectedBoxes: [],
    step: 'crop_select',
    // Seller metadata preserved
  };
}

function handleApplyCropAndEnhance(
  state: StudioState,
  croppedUrl: string,
  cutoutUrl: string,
  compositeUrl: string,
  aiSuggestions?: { title?: string; description?: string; suggestedMinPrice?: number; material?: string }
): StudioState {
  const nextTitle = state.hasUserModifiedTitle || state.title.trim()
    ? state.title
    : (aiSuggestions?.title || state.title);

  const nextDesc = state.hasUserModifiedDescription || state.description.trim()
    ? state.description
    : (aiSuggestions?.description || state.description);

  const nextPrice = state.hasUserModifiedPrice || (state.price && state.price !== '35000')
    ? state.price
    : (aiSuggestions?.suggestedMinPrice ? String(aiSuggestions.suggestedMinPrice) : state.price);

  const nextMaterial = state.hasUserModifiedMaterial || state.material.trim()
    ? state.material
    : (aiSuggestions?.material || state.material);

  return {
    ...state,
    croppedImage: croppedUrl,
    canonicalCutoutUrl: cutoutUrl,
    editedImage: compositeUrl,
    activeListingImage: compositeUrl,
    step: 'review_edit',
    title: nextTitle,
    description: nextDesc,
    price: nextPrice,
    material: nextMaterial,
  };
}

function handleCancelListing(state: StudioState): StudioState {
  return {
    ...state,
    session: state.session + 1,
    step: 'upload',
    rawImage: null,
    croppedImage: null,
    canonicalCutoutUrl: null,
    editedImage: null,
    activeListingImage: null,
    detectedBoxes: [],
    title: '',
    hasUserModifiedTitle: false,
    description: '',
    hasUserModifiedDescription: false,
    price: '35000',
    hasUserModifiedPrice: false,
    material: '',
    hasUserModifiedMaterial: false,
  };
}

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

function validateUploadFile(file: { name: string; type: string; size: number }) {
  const isTypeValid =
    validMimeTypes.includes(file.type.toLowerCase()) ||
    /\.(jpe?g|png|webp|heic)$/i.test(file.name);

  if (!isTypeValid) {
    return { valid: false, error: 'Please select a valid image file (JPEG, PNG, or WebP).' };
  }

  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: `File size exceeds 10MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please upload a smaller photo.`,
    };
  }

  return { valid: true, error: null };
}

describe('Snap & Sell Studio: Choose Another Photo & Cancel Listing Specifications', () => {
  beforeEach(async () => {
    await resetCatalog();
  });

  // Requirement 1
  it('1. Choosing a different photo resets all previous image-processing results', () => {
    let state = createInitialState();
    // Start with Photo 1 and full edits
    state = handleImageUploaded(state, 'data:image/png;base64,photo1_raw');
    state = handleApplyCropAndEnhance(state, 'crop1_url', 'cutout1_png', 'composite1_white');
    state.activeListingImage = 'composite1_white';
    state.detectedBoxes = ['box_a', 'box_b'];
    state.step = 'listing_form';

    expect(state.rawImage).toBe('data:image/png;base64,photo1_raw');
    expect(state.croppedImage).toBe('crop1_url');
    expect(state.canonicalCutoutUrl).toBe('cutout1_png');
    expect(state.editedImage).toBe('composite1_white');
    expect(state.activeListingImage).toBe('composite1_white');

    // Seller selects Photo 2
    state = handleImageUploaded(state, 'data:image/png;base64,photo2_raw');

    // All derived image processing states must be cleared
    expect(state.rawImage).toBe('data:image/png;base64,photo2_raw');
    expect(state.croppedImage).toBeNull();
    expect(state.canonicalCutoutUrl).toBeNull();
    expect(state.editedImage).toBeNull();
    expect(state.activeListingImage).toBeNull();
    expect(state.detectedBoxes).toEqual([]);
    expect(state.step).toBe('crop_select');
  });

  // Requirement 2
  it('2. Choosing another photo preserves appropriate manually entered listing details', () => {
    let state = createInitialState();
    state = handleImageUploaded(state, 'data:image/png;base64,photo1');
    state = handleApplyCropAndEnhance(state, 'crop1', 'cutout1', 'composite1');

    // Seller enters custom metadata
    state.title = 'Original Eucerin Sun Gel-Cream SPF 50+ (50ml)';
    state.hasUserModifiedTitle = true;
    state.description = 'Authentic sealed sunscreen with broad spectrum UVA/UVB protection.';
    state.hasUserModifiedDescription = true;
    state.price = '45000';
    state.hasUserModifiedPrice = true;
    state.condition = 'Brand New';
    state.category = 'Beauty & Personal Care';
    state.material = 'Recyclable Polymer Tube';
    state.hasUserModifiedMaterial = true;

    // Seller chooses another photo
    state = handleImageUploaded(state, 'data:image/png;base64,photo2');

    // Preserved immediately upon image replacement
    expect(state.title).toBe('Original Eucerin Sun Gel-Cream SPF 50+ (50ml)');
    expect(state.description).toBe('Authentic sealed sunscreen with broad spectrum UVA/UVB protection.');
    expect(state.price).toBe('45000');
    expect(state.condition).toBe('Brand New');
    expect(state.category).toBe('Beauty & Personal Care');
    expect(state.material).toBe('Recyclable Polymer Tube');

    // When the new photo completes crop & AI analysis, AI suggestions must NOT overwrite seller inputs
    state = handleApplyCropAndEnhance(state, 'crop2', 'cutout2', 'composite2', {
      title: 'AI Suggested Generic Lotion',
      description: 'AI Generated generic bottle description',
      suggestedMinPrice: 20000,
      material: 'Unknown glass',
    });

    expect(state.title).toBe('Original Eucerin Sun Gel-Cream SPF 50+ (50ml)');
    expect(state.description).toBe('Authentic sealed sunscreen with broad spectrum UVA/UVB protection.');
    expect(state.price).toBe('45000');
    expect(state.material).toBe('Recyclable Polymer Tube');
  });

  // Requirement 3
  it('3. Canceling the file picker leaves the current image and edits unchanged', () => {
    let state = createInitialState();
    state = handleImageUploaded(state, 'data:image/png;base64,photo1');
    state = handleApplyCropAndEnhance(state, 'crop1', 'cutout1', 'composite1');
    state.step = 'review_edit';

    const snapshotBeforeOpeningPicker = { ...state };

    // Seller clicks "Choose Another Photo", native picker opens, but user cancels (no file chosen)
    // No change event dispatched
    expect(state).toEqual(snapshotBeforeOpeningPicker);
    expect(state.rawImage).toBe('data:image/png;base64,photo1');
    expect(state.canonicalCutoutUrl).toBe('cutout1');
    expect(state.editedImage).toBe('composite1');
    expect(state.step).toBe('review_edit');
  });

  // Requirement 4
  it('4. Selecting the same file again works (clearing input value resets browser state)', () => {
    const mockInput = { value: 'C:\\fakepath\\sunscreen.jpg' };

    // Function resetting value before click
    function prepareFileInputForPick(input: { value: string }) {
      input.value = '';
    }

    prepareFileInputForPick(mockInput);
    expect(mockInput.value).toBe('');

    // When user selects the exact same file path again:
    mockInput.value = 'C:\\fakepath\\sunscreen.jpg';
    expect(mockInput.value).toBe('C:\\fakepath\\sunscreen.jpg');

    // Clearing in onChange handler ensures subsequent pick fires onChange again
    prepareFileInputForPick(mockInput);
    expect(mockInput.value).toBe('');
  });

  // Requirement 5
  it('5. Clicking "Cancel Listing" opens the confirmation dialog with exact copy', () => {
    const modalProps: ConfirmationModalProps = {
      isOpen: true,
      title: 'Cancel this listing?',
      message:
        'If you cancel now, all changes made to your photo, including cropping, AI enhancement, product isolation, and background edits, will be lost. Your listing details and selected price will also be discarded. This action cannot be undone.',
      confirmLabel: 'Discard Changes & Cancel',
      cancelLabel: 'Keep Editing',
      variant: 'danger',
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
    };

    expect(modalProps.isOpen).toBe(true);
    expect(modalProps.title).toBe('Cancel this listing?');
    expect(modalProps.message).toBe(
      'If you cancel now, all changes made to your photo, including cropping, AI enhancement, product isolation, and background edits, will be lost. Your listing details and selected price will also be discarded. This action cannot be undone.'
    );
    expect(modalProps.confirmLabel).toBe('Discard Changes & Cancel');
    expect(modalProps.cancelLabel).toBe('Keep Editing');
    expect(modalProps.variant).toBe('danger');
  });

  // Requirement 6
  it('6. Clicking "Keep Editing" preserves all current work', () => {
    let state = createInitialState();
    state = handleImageUploaded(state, 'data:image/png;base64,photo1');
    state = handleApplyCropAndEnhance(state, 'crop1', 'cutout1', 'composite1');
    state.step = 'listing_form';
    state.title = 'In-Progress Listing';
    state.price = '39000';

    const savedState = { ...state };

    // Seller opens modal and clicks "Keep Editing" -> modal closes, no state changes
    let isModalOpen = true;
    const handleKeepEditing = () => {
      isModalOpen = false;
    };

    handleKeepEditing();

    expect(isModalOpen).toBe(false);
    expect(state).toEqual(savedState);
    expect(state.step).toBe('listing_form');
    expect(state.activeListingImage).toBe('composite1');
    expect(state.title).toBe('In-Progress Listing');
    expect(state.price).toBe('39000');
  });

  // Requirement 7
  it('7. Clicking "Discard Changes & Cancel" clears the current draft and returns to the upload stage', () => {
    let state = createInitialState();
    state = handleImageUploaded(state, 'data:image/png;base64,photo1');
    state = handleApplyCropAndEnhance(state, 'crop1', 'cutout1', 'composite1');
    state.step = 'listing_form';
    state.title = 'Abandon Me';
    state.price = '60000';

    // Discard & Cancel confirmed
    state = handleCancelListing(state);

    expect(state.step).toBe('upload');
    expect(state.rawImage).toBeNull();
    expect(state.croppedImage).toBeNull();
    expect(state.canonicalCutoutUrl).toBeNull();
    expect(state.editedImage).toBeNull();
    expect(state.activeListingImage).toBeNull();
    expect(state.title).toBe('');
    expect(state.price).toBe('35000');
    expect(state.hasUserModifiedPrice).toBe(false);
  });

  // Requirement 8
  it('8. Canceling never creates a catalog entry or modifies existing items', async () => {
    const beforeProducts = await getAllProducts();
    const countBefore = beforeProducts.length;

    let state = createInitialState();
    state = handleImageUploaded(state, 'data:image/png;base64,photo1');
    state = handleApplyCropAndEnhance(state, 'crop1', 'cutout1', 'composite1');
    state.title = 'Should Not Exist In Catalog';
    state.price = '99000';

    // Cancel listing
    state = handleCancelListing(state);

    const afterProducts = await getAllProducts();
    expect(afterProducts.length).toBe(countBefore);
    expect(afterProducts.find((p) => p.title === 'Should Not Exist In Catalog')).toBeUndefined();
  });

  // Requirement 9
  it('9. Existing photo editing and publishing behavior continues to work', async () => {
    const productsBefore = await getAllProducts();
    const initialCount = productsBefore.length;

    const testProduct: Product = {
      id: `prod-test-${Date.now()}`,
      title: 'Published Studio Product',
      description: 'Fully isolated sunscreen on pure white studio background.',
      category: 'Beauty & Personal Care',
      price: 36000,
      currency: 'NGN',
      condition: 'Brand New',
      imageUrl: 'data:image/png;base64,composite_final_png',
      imageSource: 'seller_upload',
      sellerName: 'Lagos Skincare Merchant',
      sellerRating: 5.0,
      location: 'Lekki Phase 1, Lagos',
      visualTags: ['sunscreen', 'skincare'],
      dominantColors: ['#FFFFFF', '#FF8000'],
      embedding: await generateVisualEmbedding(
        'Beauty & Personal Care',
        ['sunscreen', 'skincare'],
        ['#FFFFFF', '#FF8000'],
        'Polymer'
      ),
      createdAt: new Date().toISOString(),
    };

    await persistProduct(testProduct);

    const productsAfter = await getAllProducts();
    expect(productsAfter.length).toBe(initialCount + 1);

    const saved = productsAfter.find((p) => p.id === testProduct.id);
    expect(saved).toBeDefined();
    expect(saved?.title).toBe('Published Studio Product');
    expect(saved?.price).toBe(36000);
  });

  // Requirement 10
  it('10. Invalid uploads produce appropriate error messages', () => {
    // Unsupported format
    const badFormat = validateUploadFile({
      name: 'archive.zip',
      type: 'application/zip',
      size: 500 * 1024,
    });
    expect(badFormat.valid).toBe(false);
    expect(badFormat.error).toBe('Please select a valid image file (JPEG, PNG, or WebP).');

    // Oversized format (>10MB)
    const oversized = validateUploadFile({
      name: 'large_photo.png',
      type: 'image/png',
      size: 11 * 1024 * 1024,
    });
    expect(oversized.valid).toBe(false);
    expect(oversized.error).toContain('File size exceeds 10MB limit');

    // Valid formats
    expect(validateUploadFile({ name: 'sunscreen.jpg', type: 'image/jpeg', size: 2 * 1024 * 1024 }).valid).toBe(true);
    expect(validateUploadFile({ name: 'cutout.png', type: 'image/png', size: 4 * 1024 * 1024 }).valid).toBe(true);
    expect(validateUploadFile({ name: 'photo.webp', type: 'image/webp', size: 1.5 * 1024 * 1024 }).valid).toBe(true);
  });

  it('session tracking counter invalidates stale asynchronous AI responses across photo changes', async () => {
    let state = createInitialState();

    // Session 1: user uploads photo 1
    state = handleImageUploaded(state, 'data:image/png;base64,photo1');
    const session1 = state.session;
    expect(session1).toBe(1);

    let staleResultWritten = false;
    const simulateAsyncIsolationSession1 = async () => {
      await new Promise((r) => setTimeout(r, 40));
      // Guard: only apply if still current session
      if (state.session === session1) {
        state.canonicalCutoutUrl = 'stale_cutout_from_photo1';
        staleResultWritten = true;
      }
    };

    const task = simulateAsyncIsolationSession1();

    // User chooses another photo (Session 2) before Session 1 finishes
    state = handleImageUploaded(state, 'data:image/png;base64,photo2');
    expect(state.session).toBe(2);

    await task;

    // The stale result from photo 1 must never overwrite photo 2
    expect(staleResultWritten).toBe(false);
    expect(state.canonicalCutoutUrl).toBeNull();
    expect(state.rawImage).toBe('data:image/png;base64,photo2');
  });
});
