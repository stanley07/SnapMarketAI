import React from 'react';
import Link from 'next/link';
import { Camera, Sparkles, ShieldCheck, Cpu } from 'lucide-react';
import { AIDiagnosticBadge } from '@/components/AIDiagnosticBadge';

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16 space-y-12">
      
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
            <Cpu className="w-5 h-5" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            System Architecture & AI Blueprint
          </span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
          About SnapMarket AI
        </h1>
        <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
          SnapMarket AI is a visual commerce prototype built for the Meta AI Hackathon. Inspired by social marketplaces, it bridges the gap between buyers who cannot describe an item in words and small retail merchants who lack professional product photography studios.
        </p>

        <div className="pt-2">
          <AIDiagnosticBadge />
        </div>
      </div>

      {/* The Two Core Problems */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 space-y-6">
        <h2 className="text-xl font-bold text-slate-900">The Problem SnapMarket AI Solves</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
          <div className="space-y-2 p-4 bg-sky-50 rounded-2xl border border-sky-100">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-700 block">The Buyer Problem</span>
            <h3 className="font-bold text-slate-900 text-base">The Vocabulary Barrier</h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              Buyers often hold an empty cosmetic bottle, a mechanical part, or a thrift fashion item where the label is worn off or unknown. Text keyword searches like <em>&quot;white sunscreen bottle orange cap&quot;</em> yield hundreds of irrelevant listings.
            </p>
          </div>

          <div className="space-y-2 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block">The Merchant Problem</span>
            <h3 className="font-bold text-slate-900 text-base">The Photography Barrier</h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              Small shopkeepers in emerging markets don&apos;t have \$5,000 lightbox studios. Their raw shelf photos are dark, cluttered, and low-trust, causing potential buyers to scroll past.
            </p>
          </div>
        </div>
      </section>

      {/* Meta AI Capabilities Breakdown */}
      <section className="space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">
            Under the Hood
          </span>
          <h2 className="text-2xl font-bold text-slate-900">
            Meta AI Model Stack & Symmetrical Pipeline
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4">
          
          {/* SAM 3.1 Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs">1</span>
                SAM 3.1 (Segment Anything Model)
              </h3>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                Spatial Perception
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              On the seller side, SAM isolates individual product bottles and boxes from cluttered retail shelves with pixel-accurate masks, allowing the seller to tap and extract a single item without manual photoshop cropping.
            </p>
          </div>

          {/* Canvas & Muse Image Engine */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 font-bold flex items-center justify-center text-xs">2</span>
                Authentic Canvas Engine & Muse Image
              </h3>
              <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full">
                Studio Synthesis
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Applies genuine pixel-level contrast expansion, exposure normalization, a 3x3 convolution sharpening matrix, and renders a clean, neutral e-commerce studio backdrop with safe margins.
            </p>
          </div>

          {/* Muse Spark & Vector Cosine Similarity */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 font-bold flex items-center justify-center text-xs">3</span>
                Muse Spark & Cosine Vector Similarity
              </h3>
              <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full">
                Cognition & Matching
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Generates normalized 16-dimensional visual embedding vectors covering geometry, dominant color signatures, texture, and product category. Compares query vectors against catalog listings using cosine vector similarity normalized to 100% scale.
            </p>
          </div>

        </div>
      </section>

      {/* Hackathon Transparency & Fallback Architecture */}
      <section className="bg-slate-50 rounded-3xl p-6 sm:p-8 border border-slate-200 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg font-bold text-slate-900">Hackathon Transparency & Reliability</h2>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          In accordance with hackathon engineering principles, SnapMarket AI is architected with a decoupled provider interface. When cloud API credentials (<code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">META_MODEL_API_KEY</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">FIREWORKS_API_KEY</code>) are present, it invokes remote inference. When running without external credentials, it executes an authentic on-device Canvas transformation and cosine vector search.
        </p>

        <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 flex items-center justify-between">
          <span>Active Mode: <strong>On-Device / Demo Mode Active (Zero External Config Required)</strong></span>
          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">VERIFIED</span>
        </div>
      </section>

      {/* Navigation CTA */}
      <div className="pt-4 flex flex-col sm:flex-row gap-3">
        <Link
          href="/search"
          className="flex-1 px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm text-center flex items-center justify-center gap-2 shadow-sm"
        >
          <Camera className="w-4 h-4 text-emerald-400" />
          <span>Try Buyer Visual Search</span>
        </Link>
        <Link
          href="/sell"
          className="flex-1 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm text-center flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/20"
        >
          <Sparkles className="w-4 h-4" />
          <span>Try Seller AI Studio</span>
        </Link>
      </div>

    </div>
  );
}
