'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  MapPin,
  UserCheck,
  ShieldCheck,
  Sparkles,
  Camera,
  Share2,
  Tag,
} from 'lucide-react';
import { Product } from '@/types/product';
import { getProductById, searchSimilarProducts } from '@/lib/repository';
import { CurrencyPrice } from '@/components/CurrencyPrice';
import { ProductCard } from '@/components/ProductCard';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewOriginal, setViewOriginal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!productId) return;
      setLoading(true);
      const prod = await getProductById(productId);
      setProduct(prod);

      if (prod) {
        // Query similar products based on embedding and tags
        const similar = await searchSimilarProducts(
          prod.embedding,
          prod.visualTags,
          prod.dominantColors,
          prod.category
        );
        // Exclude current product
        setSimilarProducts(
          similar.map((s) => s.product).filter((p) => p.id !== prod.id).slice(0, 4)
        );
      }
      setLoading(false);
    }
    loadData();
  }, [productId]);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Loading listing details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Product Not Found</h2>
        <p className="text-xs text-slate-500">This listing may have been removed or does not exist.</p>
        <Link
          href="/catalog"
          className="inline-block px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold"
        >
          Return to Catalog
        </Link>
      </div>
    );
  }

  const activeImage = viewOriginal && product.originalImageUrl ? product.originalImageUrl : product.imageUrl;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
      
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Listings
      </button>

      {/* Main Product Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        
        {/* Left: Image Viewer & Original Comparison Toggle */}
        <div className="space-y-4">
          <div className="relative aspect-square rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-sm flex items-center justify-center p-4">
            <img
              src={activeImage}
              alt={product.title}
              className="w-full h-full object-contain transition-all duration-300"
            />

            <div className="absolute top-4 left-4 flex gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide bg-white/90 backdrop-blur-md text-slate-900 shadow-sm border border-slate-200/60">
                {product.condition}
              </span>
              {product.isUserListed && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-sm flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Live Demo Listing
                </span>
              )}
            </div>

            {/* Toggle between Studio and Original Raw capture if available */}
            {product.originalImageUrl && (
              <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-md rounded-xl p-1 flex gap-1 border border-white/20">
                <button
                  type="button"
                  onClick={() => setViewOriginal(false)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    !viewOriginal ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  ✨ Studio Enhanced
                </button>
                <button
                  type="button"
                  onClick={() => setViewOriginal(true)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    viewOriginal ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  📷 Raw Capture
                </button>
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Verified Authenticity & Condition
            </span>
            <button
              onClick={handleShare}
              className="flex items-center gap-1 text-slate-700 hover:text-emerald-700 font-bold"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{copied ? 'Link Copied!' : 'Share'}</span>
            </button>
          </div>
        </div>

        {/* Right: Details, Price & Seller Info */}
        <div className="space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                {product.category}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug">
                {product.title}
              </h1>
            </div>

            {/* Price Box */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-baseline justify-between">
              <div>
                <span className="text-[11px] uppercase font-bold text-slate-500 block">Listing Price</span>
                <CurrencyPrice amount={product.price} size="xl" />
              </div>
              <span className="text-xs font-medium text-slate-500">Local pickup or delivery</span>
            </div>

            {/* Seller Contact & Verification Card */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm">
                    {product.sellerName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      {product.sellerName}
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{product.location}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    ★ {product.sellerRating || 4.9}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">About this Product</h3>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>

            {/* Technical Attributes Table */}
            {product.attributes && Object.keys(product.attributes).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Specifications</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(product.attributes).map(([key, val]) => (
                    <div key={key} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60">
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">{key}</span>
                      <span className="font-semibold text-slate-800">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Visual Tags */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Visual Features</h3>
              <div className="flex flex-wrap gap-1.5">
                {product.visualTags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium"
                  >
                    <Tag className="w-3 h-3 text-slate-400" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>

          </div>

          {/* Action CTAs */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row gap-3">
            <Link
              href="/search"
              className="flex-1 px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm text-center flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <Camera className="w-4 h-4 text-emerald-400" />
              <span>Search with Photo Like This</span>
            </Link>

            <Link
              href="/sell"
              className="flex-1 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm text-center flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/20 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>List Similar Item as Seller</span>
            </Link>
          </div>

        </div>

      </div>

      {/* Similar Listings Carousel / Grid */}
      {similarProducts.length > 0 && (
        <section className="pt-8 border-t border-slate-200 space-y-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Multimodal Recommendations
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Visually Similar Listings in Marketplace
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {similarProducts.map((simProd) => (
              <ProductCard key={simProd.id} product={simProd} />
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
