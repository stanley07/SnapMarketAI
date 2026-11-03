import React from 'react';
import Link from 'next/link';
import { Camera, Sparkles, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { SEEDED_PRODUCTS } from '@/lib/catalog';
import { ProductCard } from '@/components/ProductCard';

export default function HomePage() {
  const featuredProducts = SEEDED_PRODUCTS.slice(0, 4);

  return (
    <div className="space-y-16 sm:space-y-24 pb-16">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 sm:pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold tracking-wide uppercase shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Meta AI Hackathon Prototype
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 leading-[1.1]">
            Snap It. Find It. <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600">
              Sell It with AI.
            </span>
          </h1>

          <p className="text-base sm:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto font-normal">
            Visual commerce built for real-world retail. Discover products by snapping a photo, or transform raw cluttered shelf photos into studio marketplace listings in seconds.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/search"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-base shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2.5 transition-all group"
            >
              <Camera className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span>Find with a Photo</span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/sell"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2.5 transition-all group"
            >
              <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              <span>Sell with AI (Studio)</span>
              <ArrowRight className="w-4 h-4 text-emerald-200 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Multimodal Visual Search
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              SAM 3.1 Shelf Segmentation
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Studio E-Commerce In-Painting
            </span>
          </div>

        </div>
      </section>

      {/* Dual User Journeys Showcase (Buyer vs Seller) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">
            Symmetrical AI Architecture
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Two Sided Marketplace. One Shared Catalog.
          </h2>
          <p className="text-sm text-slate-500">
            Bridging discovery and inventory creation without manual keyword tagging.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Buyer Journey Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-6 hover:border-slate-300 transition-all">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                <Camera className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-600">For Buyers</span>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900">Snap to Search</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Ever held an empty sunscreen bottle, spotted a stylish sneaker, or had a replacement part you couldn’t name? Snap a photograph to find exact and visually similar matches from local sellers.
              </p>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 space-y-2.5 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center text-[10px]">1</span>
                  <span>Upload or take a photo of any item in real life</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center text-[10px]">2</span>
                  <span>Meta AI extracts category, color palette, and vector embeddings</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center text-[10px]">3</span>
                  <span>Cosine similarity ranks the best matching local listings</span>
                </div>
              </div>
            </div>

            <Link
              href="/search"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-all group"
            >
              <span>Test Visual Search</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Seller Journey Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-6 hover:border-emerald-300 transition-all">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">For Merchants</span>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900">Snap to Sell (Studio)</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Small shopkeepers don’t have professional studio lighting. Photograph your retail shelf or table, select a product, and let AI enhance lighting and studio backdrop for one-click publishing.
              </p>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 space-y-2.5 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px]">1</span>
                  <span>Photograph a cluttered retail shelf or table</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px]">2</span>
                  <span>SAM 3.1 isolates product with smart crop and centering</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px]">3</span>
                  <span>Authentic Canvas engine generates neutral studio lighting & publish</span>
                </div>
              </div>
            </div>

            <Link
              href="/sell"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 transition-all group"
            >
              <span>Open Seller Studio</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

        </div>
      </section>

      {/* Featured Demonstrations Catalog Preview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">
              Shared Product Catalog
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Featured Demonstration Listings
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              All prices formatted in Nigerian Naira (₦). Published items appear here automatically.
            </p>
          </div>

          <Link
            href="/catalog"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            <span>View All 24+ Listings</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Hackathon Trust & Fidelity Assurance */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-8 sm:p-12 shadow-xl space-y-6">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
              Product Fidelity & Consumer Trust Guarantee
            </h3>
          </div>

          <p className="text-slate-300 text-sm leading-relaxed max-w-3xl">
            In visual commerce, authenticity is everything. SnapMarket AI’s image processing improves lighting, contrast, and framing without fabricating logos, inventing nonexistent accessories, or erasing genuine wear. Buyers see what they actually purchase.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-700 text-xs">
            <div className="space-y-1">
              <span className="font-bold text-white block">Zero Brand Hallucination</span>
              <p className="text-slate-400">Preserves original labels, serial tags, and product typography.</p>
            </div>
            <div className="space-y-1">
              <span className="font-bold text-white block">True Condition Transparency</span>
              <p className="text-slate-400">Does not buff out scratches or falsely upgrade used items to new.</p>
            </div>
            <div className="space-y-1">
              <span className="font-bold text-white block">Side-by-Side Verification</span>
              <p className="text-slate-400">Buyers and sellers can always compare against original unedited captures.</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
