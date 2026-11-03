'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Camera, Check, X, AlertCircle } from 'lucide-react';
import { ImageUploader } from '@/components/ImageUploader';
import { BeforeAfterComparison } from '@/components/BeforeAfterComparison';
import { CropEditor } from '@/components/CropEditor';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { ProductCategory, ProductCondition, Product } from '@/types/product';
import { SegmentationBoundingBox, ImageEditingResult, ImageUnderstandingResult, StudioBackdropPreset } from '@/types/ai';
import { detectProductsOnShelf } from '@/lib/ai/segmentation-provider';
import { isolateProductCutout, renderStudioComposite } from '@/lib/ai/editing-provider';
import { analyzeImageContent } from '@/lib/ai/understanding-provider';
import { generateVisualEmbedding } from '@/lib/ai/embedding-provider';
import { persistProduct } from '@/lib/repository';

export default function SellPage() {
  const router = useRouter();

  // Workflow Steps: 'upload' -> 'crop_select' -> 'review_edit' -> 'listing_form' -> 'success'
  const [step, setStep] = useState<'upload' | 'crop_select' | 'review_edit' | 'listing_form' | 'success'>('upload');

  // Images state (3 distinct states to preserve raw image and allow loss-free retries)
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [canonicalCutoutUrl, setCanonicalCutoutUrl] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [activeListingImage, setActiveListingImage] = useState<string | null>(null);

  // Studio Backdrop Selection state
  const [activeBackdropPreset, setActiveBackdropPreset] = useState<StudioBackdropPreset>('pure_white');
  const [activeCustomColor, setActiveCustomColor] = useState<string>('#D9EAD3');
  const [activeAddShadow, setActiveAddShadow] = useState<boolean>(true);

  // Segmentation & Enhancement state
  const [detectedBoxes, setDetectedBoxes] = useState<SegmentationBoundingBox[]>([]);
  const [selectedBox, setSelectedBox] = useState<SegmentationBoundingBox | null>(null);
  const [isProcessingEdit, setIsProcessingEdit] = useState(false);
  const [editResult, setEditResult] = useState<ImageEditingResult | null>(null);
  const [understandingResult, setUnderstandingResult] = useState<ImageUnderstandingResult | null>(null);

  // Async session & file replacement management
  const uploadSessionRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCancelListingModal, setShowCancelListingModal] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Helper to revoke blob URLs and prevent memory leaks
  const revokeIfBlobUrl = (url: string | null | undefined) => {
    if (url && typeof url === 'string' && url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // safe catch
      }
    }
  };

  // Seller Pricing & Form Fields
  const [title, setTitle] = useState('');
  const [hasUserModifiedTitle, setHasUserModifiedTitle] = useState<boolean>(false);
  const [category, setCategory] = useState<ProductCategory>('Beauty & Personal Care');
  const [sellerPrice, setSellerPrice] = useState<string>('35000');
  const [hasUserModifiedPrice, setHasUserModifiedPrice] = useState<boolean>(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [aiSuggestedPriceRange, setAiSuggestedPriceRange] = useState<{ min: number; max: number } | null>(null);
  const [condition, setCondition] = useState<ProductCondition>('Brand New');
  const [description, setDescription] = useState('');
  const [hasUserModifiedDescription, setHasUserModifiedDescription] = useState<boolean>(false);
  const [material, setMaterial] = useState('');
  const [hasUserModifiedMaterial, setHasUserModifiedMaterial] = useState<boolean>(false);
  const [sellerName, setSellerName] = useState('My Local Shop');
  const [location, setLocation] = useState('Lekki Phase 1, Lagos');
  const [visualTags, setVisualTags] = useState<string[]>([]);
  const [dominantColors, setDominantColors] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);

  // 1. Raw Image Uploaded
  const handleImageUploaded = async (imageDataUrl: string) => {
    const currentSession = ++uploadSessionRef.current;

    // Revoke previous temporary blob URLs
    revokeIfBlobUrl(rawImage);
    revokeIfBlobUrl(croppedImage);
    revokeIfBlobUrl(canonicalCutoutUrl);
    revokeIfBlobUrl(editedImage);
    revokeIfBlobUrl(activeListingImage);

    setRawImage(imageDataUrl);
    setCroppedImage(null);
    setCanonicalCutoutUrl(null);
    setEditedImage(null);
    setActiveListingImage(null);
    setEditResult(null);
    setUnderstandingResult(null);
    setSelectedBox(null);
    setDetectedBoxes([]);
    setIsProcessingEdit(false);
    setUploadError(null);
    setStep('crop_select');

    // Propose candidate shelf segmentation boxes as starting points
    try {
      const seg = await detectProductsOnShelf(imageDataUrl);
      if (uploadSessionRef.current !== currentSession) return;
      setDetectedBoxes(seg.detectedObjects);
      if (seg.detectedObjects.length > 0) {
        setSelectedBox(seg.detectedObjects[0]); // Default to center product
      }
    } catch {
      // Non-blocking fallback
    }
  };

  // 2. Trigger Image Enhancement from Manual Crop
  const handleApplyCrop = async (
    croppedDataUrl: string,
    details?: {
      backdropPreset?: StudioBackdropPreset;
      customColor?: string;
      addContactShadow?: boolean;
    }
  ) => {
    const currentSession = uploadSessionRef.current;
    setCroppedImage(croppedDataUrl);
    setCanonicalCutoutUrl(null);
    setIsProcessingEdit(true);

    const chosenPreset = details?.backdropPreset || 'pure_white';
    const chosenColor = details?.customColor || '#D9EAD3';
    const chosenShadow = details?.addContactShadow ?? true;

    setActiveBackdropPreset(chosenPreset);
    setActiveCustomColor(chosenColor);
    setActiveAddShadow(chosenShadow);

    try {
      // Stage 1: Isolate Product Cutout ONCE
      const isolation = await isolateProductCutout(croppedDataUrl, {
        brightnessCorrection: 8,
        contrastCorrection: 12,
        sharpnessEnhancement: true,
      });

      if (uploadSessionRef.current !== currentSession) return;

      if (!isolation.segmentationSuccess || !isolation.transparentCutoutUrl) {
        // Honest failure handling
        setEditResult({
          editedImageUrl: croppedDataUrl,
          appliedOperations: isolation.appliedOperations || ['Semantic product isolation failed'],
          processingDurationMs: 0,
          provider: isolation.provider || 'SnapMarket Studio (Honest Fallback)',
          isFallback: true,
          segmentationSuccess: false,
          errorMessage: isolation.errorMessage || 'Live foreground segmentation could not isolate the product automatically.',
          fidelityNotice: isolation.fidelityNotice || 'Original unsegmented image retained.',
          hasContactShadow: false,
        });
        setEditedImage(croppedDataUrl);
        setActiveListingImage(croppedDataUrl);
        setStep('review_edit');
        return;
      }

      // Store canonical transparent cutout for all subsequent background changes
      setCanonicalCutoutUrl(isolation.transparentCutoutUrl);

      // Stage 2: Deterministic Studio Compositing on selected background
      const composite = await renderStudioComposite(isolation.transparentCutoutUrl, {
        backdropPreset: chosenPreset,
        customBackdropColor: chosenColor,
        addContactShadow: chosenShadow,
      });

      if (uploadSessionRef.current !== currentSession) return;

      setEditResult(composite);
      setEditedImage(composite.editedImageUrl);
      setActiveListingImage(composite.editedImageUrl);

      // Extract attributes and advisory price from the cropped product
      try {
        const understanding = await analyzeImageContent(croppedDataUrl);
        if (uploadSessionRef.current !== currentSession) return;

        setUnderstandingResult(understanding);
        setAiSuggestedPriceRange(understanding.suggestedPriceRange);

        // Preserve any seller-entered details; only fill empty fields
        if (!hasUserModifiedTitle && !title.trim()) setTitle(understanding.titleSuggestion);
        if (!hasUserModifiedDescription && !description.trim()) setDescription(understanding.descriptionSuggestion);
        if (!hasUserModifiedPrice && (!sellerPrice || sellerPrice === '35000')) {
          setSellerPrice(String(understanding.suggestedPriceRange.min));
        }
        if (visualTags.length === 0) setVisualTags(understanding.visualTags);
        if (dominantColors.length === 0) setDominantColors(understanding.dominantColors);
        if (!hasUserModifiedMaterial && !material.trim() && understanding.visibleMaterialOrTexture && understanding.visibleMaterialOrTexture !== 'unknown') {
          setMaterial(understanding.visibleMaterialOrTexture);
        }
      } catch {
        // Non-blocking metadata extraction
      }

      if (uploadSessionRef.current !== currentSession) return;
      setStep('review_edit');
    } catch {
      if (uploadSessionRef.current !== currentSession) return;
      // Gracefully handle processing failure with honest status
      setEditResult({
        editedImageUrl: croppedDataUrl,
        appliedOperations: ['Segmentation failed'],
        processingDurationMs: 0,
        provider: 'SnapMarket Error Handler',
        isFallback: true,
        segmentationSuccess: false,
        errorMessage: 'An unexpected error occurred during product isolation. Please adjust crop or retry.',
        fidelityNotice: 'Original unsegmented image retained.',
      });
      setEditedImage(croppedDataUrl);
      setActiveListingImage(croppedDataUrl || rawImage);
      setStep('review_edit');
    } finally {
      if (uploadSessionRef.current === currentSession) {
        setIsProcessingEdit(false);
      }
    }
  };

  // 3. Instant Background Switching (Reuses Canonical Cutout without calling AI model)
  const handleBackdropChange = async (
    newPreset: StudioBackdropPreset,
    newCustomColor?: string,
    newAddShadow?: boolean
  ) => {
    const currentSession = uploadSessionRef.current;
    setActiveBackdropPreset(newPreset);
    if (newCustomColor) setActiveCustomColor(newCustomColor);
    if (typeof newAddShadow === 'boolean') setActiveAddShadow(newAddShadow);

    if (!canonicalCutoutUrl) return;

    try {
      const composite = await renderStudioComposite(canonicalCutoutUrl, {
        backdropPreset: newPreset,
        customBackdropColor: newCustomColor || activeCustomColor,
        addContactShadow: typeof newAddShadow === 'boolean' ? newAddShadow : activeAddShadow,
      });

      if (uploadSessionRef.current !== currentSession) return;

      setEditResult(composite);
      setEditedImage(composite.editedImageUrl);
      setActiveListingImage(composite.editedImageUrl);
    } catch {
      // Safe catch
    }
  };

  // Choose Another Photo handler - directly opens device file picker
  const handleChooseAnotherPhoto = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Ensure selecting the same file triggers onChange
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    // Validate type (JPEG, PNG, WebP, HEIC)
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (!validTypes.includes(file.type.toLowerCase()) && !file.name.match(/\.(jpe?g|png|webp|heic)$/i)) {
      setUploadError('Please select a valid image file (JPEG, PNG, or WebP).');
      return;
    }

    // Validate size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setUploadError(`File size exceeds 10MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please upload a smaller photo.`);
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const result = loadEvent.target?.result;
      if (typeof result === 'string') {
        handleImageUploaded(result);
      }
    };
    reader.onerror = () => {
      setUploadError('Failed to read image file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  // Discard & Cancel Listing handlers
  const handleDiscardAndCancelListing = () => {
    uploadSessionRef.current += 1; // Invalidate any pending async callbacks
    setShowCancelListingModal(false);

    // Revoke any temporary blob URLs
    revokeIfBlobUrl(rawImage);
    revokeIfBlobUrl(croppedImage);
    revokeIfBlobUrl(canonicalCutoutUrl);
    revokeIfBlobUrl(editedImage);
    revokeIfBlobUrl(activeListingImage);

    // Reset image and editing states
    setRawImage(null);
    setCroppedImage(null);
    setCanonicalCutoutUrl(null);
    setEditedImage(null);
    setActiveListingImage(null);
    setEditResult(null);
    setUnderstandingResult(null);
    setSelectedBox(null);
    setDetectedBoxes([]);
    setIsProcessingEdit(false);
    setUploadError(null);

    // Reset listing metadata states
    setTitle('');
    setHasUserModifiedTitle(false);
    setCategory('Beauty & Personal Care');
    setSellerPrice('35000');
    setHasUserModifiedPrice(false);
    setPriceError(null);
    setAiSuggestedPriceRange(null);
    setCondition('Brand New');
    setDescription('');
    setHasUserModifiedDescription(false);
    setMaterial('');
    setHasUserModifiedMaterial(false);
    setVisualTags([]);
    setDominantColors([]);
    setCreatedProductId(null);

    // Return to upload step
    setStep('upload');
  };

  // 3. Accept Edited Image & Move to Form
  const handleAcceptEditedImage = () => {
    setActiveListingImage(editedImage);
    setStep('listing_form');
  };

  // Restore Original Unedited Image
  const handleRestoreOriginal = () => {
    setActiveListingImage(rawImage);
    setStep('listing_form');
  };

  // 4. Publish Product Listing with Seller Price Validation
  const handlePublishListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeListingImage || isPublishing) return;

    // Validate seller price: must be finite positive number
    const numPrice = Number(sellerPrice);
    if (!sellerPrice.trim() || isNaN(numPrice) || numPrice <= 0 || !Number.isFinite(numPrice)) {
      setPriceError('Please enter a valid positive selling price greater than ₦0');
      return;
    }
    setPriceError(null);
    setIsPublishing(true);

    try {
      const embedding = await generateVisualEmbedding(category, visualTags, dominantColors, material);
      const newProduct: Product = {
        id: `prod-${Date.now()}`,
        title: title.trim() || 'Untitled Product',
        description: description.trim() || 'Quality authentic item listed on SnapMarket.',
        category,
        price: numPrice,
        currency: 'NGN',
        condition,
        imageUrl: activeListingImage,
        originalImageUrl: rawImage || undefined,
        imageSource: 'seller_upload',
        sellerName: sellerName.trim() || 'Retail Merchant',
        sellerRating: 5.0,
        location: location.trim() || 'Lagos, Nigeria',
        visualTags: visualTags.length > 0 ? visualTags : ['marketplace', 'listing'],
        dominantColors: dominantColors.length > 0 ? dominantColors : ['#ffffff', '#0f172a'],
        embedding,
        createdAt: new Date().toISOString(),
        isUserListed: true,
      };

      await persistProduct(newProduct);
      setCreatedProductId(newProduct.id);
      setStep('success');
    } catch {
      // Handle publish error gracefully
    } finally {
      setIsPublishing(false);
    }
  };

  const categories: ProductCategory[] = [
    'Beauty & Personal Care',
    'Fashion & Footwear',
    'Electronics & Gadgets',
    'Bags & Accessories',
    'Home & Living',
    'Groceries & Essentials',
  ];

  const conditions: ProductCondition[] = ['Brand New', 'Like New', 'Gently Used', 'Refurbished'];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      
      {/* Workflow Progress Breadcrumb */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            Seller AI Studio
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Snap to Sell
          </h1>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-400">
          <span className={step === 'upload' ? 'text-emerald-600 font-bold' : ''}>1. Capture</span>
          <span>&rarr;</span>
          <span className={step === 'crop_select' ? 'text-emerald-600 font-bold' : ''}>2. Select</span>
          <span>&rarr;</span>
          <span className={step === 'review_edit' ? 'text-emerald-600 font-bold' : ''}>3. Enhance</span>
          <span>&rarr;</span>
          <span className={step === 'listing_form' ? 'text-emerald-600 font-bold' : ''}>4. Publish</span>
        </div>
      </div>

      {/* Upload Error Banner */}
      {uploadError && (
        <div
          data-testid="sell-upload-error-banner"
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-xs flex items-center justify-between gap-2 shadow-xs"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{uploadError}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="p-1 hover:bg-red-100 rounded-lg text-red-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Enhancement Processing Overlay */}
      {isProcessingEdit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600">
              <Sparkles className="w-7 h-7 animate-spin" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Enhancing Product Image...</h3>
              <p className="text-xs text-slate-500 mt-1">
                Applying studio lighting, background normalization, and aspect ratio centering.
              </p>
            </div>
            <button
              type="button"
              data-testid="processing-choose-another-photo-btn"
              onClick={handleChooseAnotherPhoto}
              className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-slate-500" />
              <span>Choose Another Photo</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 1: Upload Raw Photograph */}
      {step === 'upload' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Step 1: Photograph Your Retail Shelf or Product</h2>
            <p className="text-xs text-slate-500 mt-1">
              No photo studio needed. Take a photo of your shelves or tables right in your shop.
            </p>
          </div>

          <ImageUploader
            onImageSelected={handleImageUploaded}
            title="Upload Raw Shelf or Product Photo"
            subtitle="Or click one of the 1-click test samples to see automatic product isolation in action"
          />
        </div>
      )}

      {/* STEP 2: Interactive Crop & Framing Studio (3-State Image Architecture) */}
      {step === 'crop_select' && rawImage && (
        <div className="space-y-4">
          {detectedBoxes.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Auto-Detected Shelf Objects:
                </span>
                <span className="text-slate-500 text-[11px]">
                  Click to pre-align the crop frame, or drag handles freely below.
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {detectedBoxes.map((bbox) => (
                  <button
                    key={bbox.id}
                    type="button"
                    onClick={() => setSelectedBox(bbox)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                      selectedBox?.id === bbox.id
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {bbox.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <CropEditor
            imageSrc={rawImage}
            initialCropBox={selectedBox?.box}
            onApplyCrop={handleApplyCrop}
            onCancel={() => setStep('upload')}
            onChooseAnotherPhoto={handleChooseAnotherPhoto}
          />
        </div>
      )}

      {/* STEP 3: Before & After Review with Adjust Crop & Try Again */}
      {step === 'review_edit' && rawImage && editedImage && editResult && (
        <BeforeAfterComparison
          originalImage={croppedImage || rawImage}
          editedImage={editedImage}
          transparentCutoutUrl={canonicalCutoutUrl || editResult.transparentCutoutUrl}
          appliedOperations={editResult.appliedOperations}
          fidelityNotice={editResult.fidelityNotice}
          segmentationSuccess={editResult.segmentationSuccess !== false}
          errorMessage={editResult.errorMessage}
          currentBackdropPreset={activeBackdropPreset}
          currentCustomColor={activeCustomColor}
          currentAddShadow={activeAddShadow}
          onChangeBackdrop={handleBackdropChange}
          onAccept={handleAcceptEditedImage}
          onRestoreOriginal={handleRestoreOriginal}
          onRetry={() => setStep('crop_select')}
          onChooseAnotherPhoto={handleChooseAnotherPhoto}
        />
      )}

      {/* STEP 4: Listing Details Form */}
      {step === 'listing_form' && activeListingImage && (
        <form onSubmit={handlePublishListing} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Final Step
              </span>
              <h2 className="text-xl font-bold text-slate-900">Review & Publish Listing</h2>
            </div>
            <button
              type="button"
              onClick={() => setStep('review_edit')}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline"
            >
              Back to Image Review
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Listing Approved Image Preview */}
            <div className="space-y-3">
              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1">Listing Image:</span>
                <div className="aspect-square rounded-2xl overflow-hidden border border-emerald-300 bg-slate-50 shadow-sm">
                  <img src={activeListingImage} alt="Listing Preview" className="w-full h-full object-contain" />
                </div>
                <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 justify-center mt-1.5">
                  <Check className="w-3 h-3" />
                  Enhanced Studio Ready
                </span>
              </div>

              <button
                type="button"
                data-testid="listing-choose-another-photo-btn"
                onClick={handleChooseAnotherPhoto}
                className="w-full py-2.5 px-3 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-2xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5 text-slate-600" />
                Choose Another Photo
              </button>
            </div>

            {/* Form Fields */}
            <div className="md:col-span-2 space-y-4">
              
              {/* Title */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Product Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setHasUserModifiedTitle(true);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:border-emerald-500 focus:outline-hidden"
                  placeholder="e.g. Eucerin Oil Control SPF 50+ 50ml"
                />
              </div>

              {/* Category & Condition */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ProductCategory)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:border-emerald-500 focus:outline-hidden bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Condition *</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as ProductCondition)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:border-emerald-500 focus:outline-hidden bg-white"
                  >
                    {conditions.map((cond) => (
                      <option key={cond} value={cond}>
                        {cond}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Price (₦ NGN) with AI Guidance and Strict Validation */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 block">
                    Your Selling Price (₦) *
                  </label>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                    Seller Controlled
                  </span>
                </div>

                {/* AI Advisory Price Guidance (Non-intrusive) */}
                {aiSuggestedPriceRange && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/80 text-xs text-emerald-900">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      AI Suggested Market Range:{' '}
                      <strong className="text-emerald-800">
                        ₦{aiSuggestedPriceRange.min.toLocaleString()} – ₦{aiSuggestedPriceRange.max.toLocaleString()}
                      </strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSellerPrice(String(aiSuggestedPriceRange.min));
                        setHasUserModifiedPrice(true);
                        setPriceError(null);
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-lg border border-emerald-300 shadow-2xs transition-colors self-start sm:self-auto cursor-pointer"
                    >
                      Apply Suggested (₦{aiSuggestedPriceRange.min.toLocaleString()})
                    </button>
                  </div>
                )}

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">
                    ₦
                  </span>
                  <input
                    type="number"
                    required
                    min={1}
                    step="any"
                    value={sellerPrice}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSellerPrice(val);
                      setHasUserModifiedPrice(true);
                      const num = Number(val);
                      if (!val.trim() || isNaN(num) || num <= 0 || !Number.isFinite(num)) {
                        setPriceError('Please enter a valid positive selling price greater than ₦0');
                      } else {
                        setPriceError(null);
                      }
                    }}
                    className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm font-bold focus:outline-hidden transition-colors ${
                      priceError
                        ? 'border-rose-400 focus:border-rose-500 bg-rose-50/30'
                        : 'border-slate-200 focus:border-emerald-500 bg-white'
                    }`}
                    placeholder="e.g. 38500"
                  />
                </div>
                {priceError && (
                  <p className="text-xs text-rose-600 font-semibold flex items-center gap-1 mt-1">
                    <span>⚠️</span> {priceError}
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Description *</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setHasUserModifiedDescription(true);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 focus:outline-hidden resize-none"
                  placeholder="Describe key features, volume, shade, and condition details..."
                />
              </div>

              {/* Material & AI Attribute Identification */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Identified Material / Texture</label>
                <input
                  type="text"
                  value={material}
                  onChange={(e) => {
                    setMaterial(e.target.value);
                    setHasUserModifiedMaterial(true);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:border-emerald-500 focus:outline-hidden"
                  placeholder="e.g. Full-grain leather, Recyclable polymer, Tempered glass"
                />
              </div>

              {/* AI Understanding Diagnostics Card */}
              {understandingResult && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      AI Analysis Source
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {understandingResult.provider}
                    </span>
                  </div>
                  {understandingResult.uncertainties && understandingResult.uncertainties.length > 0 && (
                    <div className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                      <strong>Visual Uncertainties Noted: </strong>
                      {understandingResult.uncertainties.join(' • ')}
                    </div>
                  )}
                </div>
              )}

              {/* Seller & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Seller Name</label>
                  <input
                    type="text"
                    value={sellerName}
                    onChange={(e) => setSellerName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

            </div>

          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-slate-400">
              Product will be published to the shared demonstration catalog.
            </span>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                data-testid="cancel-listing-btn"
                onClick={() => setShowCancelListingModal(true)}
                disabled={isPublishing}
                className="px-6 py-3.5 rounded-2xl bg-white hover:bg-red-50 text-slate-700 hover:text-red-600 font-bold text-sm border border-slate-300 hover:border-red-200 shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <X className="w-4 h-4 text-slate-400" />
                <span>Cancel Listing</span>
              </button>

              <button
                type="submit"
                data-testid="publish-listing-btn"
                disabled={isPublishing}
                className="px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{isPublishing ? 'Publishing...' : 'Publish Listing'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* STEP 5: Success Notification & Cross-Workflow Link */}
      {step === 'success' && createdProductId && (
        <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-emerald-200 shadow-lg max-w-lg mx-auto space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
            <Check className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Listing Published Successfully!
            </span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {title}
            </h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Your item has been enhanced and immediately published into the shared catalog. It is now discoverable via the Buyer Visual Search!
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => router.push(`/products/${createdProductId}`)}
              className="px-6 py-3 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors"
            >
              View Listing Page
            </button>
            <button
              type="button"
              onClick={() => router.push('/search')}
              className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5"
            >
              <Camera className="w-4 h-4" />
              <span>Find It via Buyer Search</span>
            </button>
          </div>
        </div>
      )}

      {/* Hidden File Input for "Choose Another Photo" */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,.jpg,.jpeg,.png,.webp,.heic"
        className="hidden"
        onChange={handleFileInputChange}
        data-testid="sell-hidden-file-input"
      />

      {/* Confirmation Modal: Cancel this listing? */}
      <ConfirmationModal
        isOpen={showCancelListingModal}
        title="Cancel this listing?"
        message="If you cancel now, all changes made to your photo, including cropping, AI enhancement, product isolation, and background edits, will be lost. Your listing details and selected price will also be discarded. This action cannot be undone."
        confirmLabel="Discard Changes & Cancel"
        cancelLabel="Keep Editing"
        variant="danger"
        confirmTestId="confirm-discard-listing-btn"
        cancelTestId="cancel-discard-listing-btn"
        onConfirm={handleDiscardAndCancelListing}
        onCancel={() => setShowCancelListingModal(false)}
      />

    </div>
  );
}
