import { ProductCategory } from './product';

export interface ImageUnderstandingResult {
  titleSuggestion: string;
  categorySuggestion: ProductCategory;
  descriptionSuggestion: string;
  visualTags: string[];
  dominantColors: string[];
  visibleMaterialOrTexture?: string;
  uncertainties?: string[];
  suggestedPriceRange: { min: number; max: number };
  detectedCondition: 'Brand New' | 'Like New' | 'Gently Used';
  confidenceScore: number;
  provider: string;
  isFallback: boolean;
}

export type StudioBackdropPreset = 'pure_white' | 'soft_gray' | 'warm_neutral' | 'custom' | 'transparent';

export interface ImageEditingOptions {
  removeBackground?: boolean;
  backdropPreset?: StudioBackdropPreset;
  customBackdropColor?: string;
  neutralBackdropColor?: string; // backward compatibility
  brightnessCorrection?: number; // -100 to 100
  contrastCorrection?: number; // -100 to 100
  sharpnessEnhancement?: boolean;
  addContactShadow?: boolean;
  shadowIntensity?: number; // 0 to 1
  cropCoordinates?: { x: number; y: number; width: number; height: number };
}

export interface ImageEditingResult {
  editedImageUrl: string;
  transparentCutoutUrl?: string; // Transparent PNG of foreground object
  appliedOperations: string[];
  processingDurationMs: number;
  provider: string;
  isFallback: boolean;
  fidelityNotice: string;
  backdropUsed?: string;
  hasContactShadow?: boolean;
  segmentationSuccess?: boolean;
  errorMessage?: string;
}

export interface SegmentationBoundingBox {
  id: string;
  label: string;
  confidence: number;
  box: { x: number; y: number; width: number; height: number }; // Percentage 0-100
}

export interface SegmentationResult {
  detectedObjects: SegmentationBoundingBox[];
  provider: string;
  isFallback: boolean;
}

export interface ImageUnderstandingProvider {
  name: string;
  analyzeImage(imageDataUrl: string): Promise<ImageUnderstandingResult>;
}

export interface ImageEditingProvider {
  name: string;
  editImage(imageDataUrl: string, options: ImageEditingOptions): Promise<ImageEditingResult>;
}

export interface ImageEmbeddingProvider {
  name: string;
  generateEmbedding(imageDataUrl: string): Promise<number[]>;
}

export interface ProductSegmentationProvider {
  name: string;
  segmentProducts(imageDataUrl: string): Promise<SegmentationResult>;
}

export interface AIProviderStatus {
  activeProvider: string;
  isFallbackMode: boolean;
  modelName?: string;
  museModel?: string;
  museImageModel?: string;
  modalEndpointConfigured?: boolean;
  authStatus?: 'authenticated' | 'unauthenticated' | 'invalid_key' | 'network_error';
  capabilities: {
    understanding: boolean;
    editing: boolean;
    segmentation: boolean;
    vectorSearch: boolean;
  };
  notes: string;
}
