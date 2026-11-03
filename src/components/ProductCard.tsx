'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MapPin, Sparkles, UserCheck } from 'lucide-react';
import { Product } from '@/types/product';
import { CurrencyPrice } from './CurrencyPrice';

interface ProductCardProps {
  product: Product;
  similarityScore?: number;
  matchedFeatures?: string[];
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  similarityScore,
  matchedFeatures,
}) => {
  const [imageError, setImageError] = useState(false);

  // Fallback SVG representation if network/image URL fails
  const fallbackSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400" fill="%23f1f5f9"><rect width="400" height="400" fill="%23f8fafc"/><text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui" font-size="48" fill="%2394a3b8">🛍️</text><text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui" font-size="14" font-weight="600" fill="%2364748b">${encodeURIComponent(
    product.category
  )}</text></svg>`;

  const displayImage = imageError ? fallbackSvg : product.imageUrl;

  return (
    <div className="group bg-white rounded-2xl border border-slate-200/80 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-200 flex flex-col overflow-hidden">
      
      {/* Image Container with Badges */}
      <Link href={`/products/${product.id}`} className="relative aspect-square w-full bg-slate-50 overflow-hidden block">
        <img
          src={displayImage}
          alt={product.title}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-white/90 backdrop-blur-md text-slate-800 shadow-sm border border-slate-200/50">
            {product.condition}
          </span>

          {product.isUserListed && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-sm flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              New Listing
            </span>
          )}

          {similarityScore !== undefined && (
            <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-slate-900/90 text-emerald-400 backdrop-blur-md shadow-sm border border-emerald-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              {Math.round(similarityScore * 100)}% Match
            </span>
          )}
        </div>
      </Link>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
            {product.category}
          </span>
          <Link href={`/products/${product.id}`}>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base line-clamp-2 hover:text-emerald-700 transition-colors">
              {product.title}
            </h3>
          </Link>
        </div>

        {/* Matched tags preview if in search mode */}
        {matchedFeatures && matchedFeatures.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {matchedFeatures.slice(0, 2).map((feat, idx) => (
              <span
                key={idx}
                className="inline-block px-1.5 py-0.5 rounded bg-emerald-50 text-[10px] font-medium text-emerald-800 border border-emerald-200/60"
              >
                {feat}
              </span>
            ))}
          </div>
        )}

        {/* Price & Location Footer */}
        <div className="pt-2 border-t border-slate-100 flex items-end justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Price</div>
            <CurrencyPrice amount={product.price} size="md" />
          </div>

          <div className="text-right text-[11px] text-slate-500">
            <div className="flex items-center justify-end gap-1 font-medium text-slate-700">
              <UserCheck className="w-3 h-3 text-emerald-600" />
              <span className="truncate max-w-[110px]">{product.sellerName}</span>
            </div>
            <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400">
              <MapPin className="w-2.5 h-2.5" />
              <span className="truncate max-w-[110px]">{product.location}</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
