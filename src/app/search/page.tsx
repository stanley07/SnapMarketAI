'use client';

import React, { useState, useEffect } from 'react';
import { Camera, Sparkles, Filter, RefreshCw, AlertCircle, ArrowUpDown } from 'lucide-react';
import { ImageUploader } from '@/components/ImageUploader';
import { ProductCard } from '@/components/ProductCard';
import { ProductCategory, VisualSearchResult } from '@/types/product';
import { ImageUnderstandingResult } from '@/types/ai';
import { analyzeImageContent } from '@/lib/ai/understanding-provider';
import { generateVisualEmbeddingFromImage } from '@/lib/ai/embedding-provider';
import { searchSimilarProducts } from '@/lib/repository';

export default function SearchPage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ImageUnderstandingResult | null>(null);
  const [searchResults, setSearchResults] = useState<VisualSearchResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<VisualSearchResult[]>([]);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'All'>('All');
  const [maxPriceFilter, setMaxPriceFilter] = useState<number>(500000);
  const [sortBy, setSortBy] = useState<'relevance' | 'price_low' | 'price_high'>('relevance');

  // When an image is selected by the buyer
  const handleImageSelected = async (imageDataUrl: string) => {
    setSelectedImage(imageDataUrl);
    setAnalyzing(true);
    setAnalysisResult(null);
    setSearchResults([]);

    try {
      // 1. Analyze image attributes (category, tags, colors, material) via server route
      const analysis = await analyzeImageContent(imageDataUrl);
      setAnalysisResult(analysis);

      // 2. Generate authentic 64-dimensional visual perceptual embedding directly from image pixels
      const visualEmbedding = await generateVisualEmbeddingFromImage(imageDataUrl);

      // 3. Search catalog via cosine vector similarity with category & material alignment and strict cutoff
      const results = await searchSimilarProducts(
        visualEmbedding,
        analysis.visualTags,
        analysis.dominantColors,
        analysis.categorySuggestion,
        analysis.visibleMaterialOrTexture
      );

      setSearchResults(results);
      setFilteredResults(results);
    } catch {
      // Gracefully handle search failure without halting UI
    } finally {
      setAnalyzing(false);
    }
  };

  // Handle client-side category and price filtering
  useEffect(() => {
    let list = [...searchResults];

    if (selectedCategory !== 'All') {
      list = list.filter((r) => r.product.category === selectedCategory);
    }

    list = list.filter((r) => r.product.price <= maxPriceFilter);

    if (sortBy === 'price_low') {
      list.sort((a, b) => a.product.price - b.product.price);
    } else if (sortBy === 'price_high') {
      list.sort((a, b) => b.product.price - a.product.price);
    } else {
      list.sort((a, b) => b.similarityScore - a.similarityScore);
    }

    setFilteredResults(list);
  }, [selectedCategory, maxPriceFilter, sortBy, searchResults]);

  const categories: (ProductCategory | 'All')[] = [
    'All',
    'Beauty & Personal Care',
    'Fashion & Footwear',
    'Electronics & Gadgets',
    'Bags & Accessories',
    'Home & Living',
    'Groceries & Essentials',
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
          <Camera className="w-4 h-4" />
          Buyer Visual Discovery
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Find with a Photograph
        </h1>
        <p className="text-sm text-slate-500 max-w-2xl">
          Point your camera at an empty container, a pair of sneakers, or a favorite snack. Our visual AI matches your photo against local marketplace listings in real time.
        </p>
      </div>

      {/* Step 1: Image Input or Preview */}
      {!selectedImage ? (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
          <ImageUploader
            onImageSelected={handleImageSelected}
            title="Snap or Select an Image to Search"
            subtitle="Upload from your phone, take a live photo, or tap an instant demo sample below"
          />
        </div>
      ) : (
        /* Image Preview & Active Search State */
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 flex-shrink-0">
                <img src={selectedImage} alt="Query" className="w-full h-full object-cover" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Visual Query Active
                </span>
                <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                  {analysisResult?.titleSuggestion || 'Analyzing Image Attributes...'}
                </h3>
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedImage(null);
                setAnalysisResult(null);
                setSearchResults([]);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Another Photo
            </button>
          </div>

          {/* AI Extracted Visual Attributes */}
          {analysisResult && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Detected Visual Attributes:
                </span>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      analysisResult.isFallback ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                  />
                  <span className="text-slate-600 font-medium">
                    {analysisResult.provider} ({Math.round(analysisResult.confidenceScore * 100)}%)
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold">
                  {analysisResult.categorySuggestion}
                </span>
                {analysisResult.visibleMaterialOrTexture && analysisResult.visibleMaterialOrTexture !== 'unknown' && (
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-200">
                    Material: {analysisResult.visibleMaterialOrTexture}
                  </span>
                )}
                {analysisResult.visualTags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-white text-slate-700 text-xs font-medium border border-slate-200 shadow-2xs"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-slate-500 font-medium">Dominant Color Signatures:</span>
                <div className="flex items-center gap-1.5">
                  {analysisResult.dominantColors.map((color, idx) => (
                    <span
                      key={idx}
                      className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {analysisResult.uncertainties && analysisResult.uncertainties.length > 0 && (
                <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-600">Visual Uncertainties: </span>
                  {analysisResult.uncertainties.join(' • ')}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Search Results Section */}
      {selectedImage && (
        <div className="space-y-6">
          
          {/* Results Bar & Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <span>Matching Catalog Listings</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-900 text-white font-bold">
                  {filteredResults.length} Found
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ranked by multimodal cosine similarity against local merchant inventories.
              </p>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as ProductCategory | 'All')}
                  className="bg-transparent font-medium focus:outline-hidden cursor-pointer"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'relevance' | 'price_low' | 'price_high')}
                  className="bg-transparent font-medium focus:outline-hidden cursor-pointer"
                >
                  <option value="relevance">Sort: Highest Match %</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Loading Skeleton */}
          {analyzing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3 animate-pulse">
                  <div className="aspect-square bg-slate-200 rounded-xl" />
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          )}

          {/* Matching Products Grid */}
          {!analyzing && filteredResults.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredResults.map((result) => (
                <ProductCard
                  key={result.product.id}
                  product={result.product}
                  similarityScore={result.similarityScore}
                  matchedFeatures={result.matchedFeatures}
                />
              ))}
            </div>
          )}

          {/* Empty / Low-Confidence State */}
          {!analyzing && filteredResults.length === 0 && (
            <div className="bg-white rounded-3xl p-10 sm:p-12 text-center border border-slate-200/90 max-w-xl mx-auto space-y-5 shadow-xs">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shadow-2xs">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h3 className="font-extrabold text-slate-900 text-lg">No Close Visual Match Found</h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                  We checked your photograph against active marketplace listings, but none reached our minimum visual similarity confidence threshold (58%).
                </p>
              </div>

              {/* Tips */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-left text-xs text-slate-600 space-y-1.5">
                <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">Tips for better visual matching:</span>
                <p>• Center the product and crop out shelf clutter or surrounding background.</p>
                <p>• Avoid harsh glare or deep shadows on packaging and logos.</p>
                <p>• Try searching with an angle showing distinctive brand lettering or front label.</p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImage(null);
                    setAnalysisResult(null);
                    setSearchResults([]);
                    setFilteredResults([]);
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Take or Choose Another Photo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('All');
                    setMaxPriceFilter(500000);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                >
                  Reset Category & Price Filters
                </button>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
