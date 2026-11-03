export type ProductCategory =
  | 'Fashion & Footwear'
  | 'Electronics & Gadgets'
  | 'Home & Living'
  | 'Bags & Accessories'
  | 'Beauty & Personal Care'
  | 'Groceries & Essentials';

export type ProductCondition = 'Brand New' | 'Like New' | 'Gently Used' | 'Refurbished';

export interface Product {
  id: string;
  title: string;
  description: string;
  category: ProductCategory;
  price: number; // in NGN (Nigerian Naira)
  currency: 'NGN';
  condition: ProductCondition;
  imageUrl: string;
  originalImageUrl?: string;
  imageSource: 'catalog_seed' | 'seller_camera' | 'seller_upload';
  sellerName: string;
  sellerRating?: number;
  location: string;
  visualTags: string[];
  dominantColors: string[];
  attributes?: Record<string, string>;
  embedding?: number[]; // Normalized vector for cosine similarity
  createdAt: string;
  isUserListed?: boolean;
}

export interface VisualSearchResult {
  product: Product;
  similarityScore: number; // 0.0 to 1.0 (or percentage)
  matchedFeatures: string[];
  explanation: string;
}

export interface CatalogFilterState {
  category?: ProductCategory | 'All';
  minPrice?: number;
  maxPrice?: number;
  condition?: ProductCondition | 'All';
  sortBy?: 'relevance' | 'price_low' | 'price_high' | 'newest';
}
