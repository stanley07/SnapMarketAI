import React from 'react';
import Link from 'next/link';
import { Camera, Sparkles, ShieldCheck, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-2">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold">
                <Camera className="w-4 h-4" />
              </span>
              <span className="text-xl font-bold text-white tracking-tight">SnapMarket AI</span>
            </div>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              Snap It. Find It. Sell It. A visual commerce experience connecting buyers and local sellers through multimodal search, AI shelf crop, and studio image enhancement.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>Independent Hackathon Prototype &bull; Non-Endorsed Educational Concept</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Experience</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link href="/search" className="hover:text-emerald-400 transition-colors">
                  Find with a Photo (Buyer)
                </Link>
              </li>
              <li>
                <Link href="/sell" className="hover:text-emerald-400 transition-colors">
                  Sell with AI (Seller Studio)
                </Link>
              </li>
              <li>
                <Link href="/catalog" className="hover:text-emerald-400 transition-colors">
                  Browse Demonstration Listings
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-emerald-400 transition-colors">
                  AI Architecture & Diagnostics
                </Link>
              </li>
            </ul>
          </div>

          {/* Tech Stack */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Meta AI Stack</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>SAM 3.1 Shelf Segmentation</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Muse Spark Reasoning</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Muse Image Studio In-Painting</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cosine Vector Similarity Search</span>
              </li>
            </ul>
          </div>

        </div>

        <div className="pt-8 mt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <p>&copy; {new Date().getFullYear()} SnapMarket AI. Built for the Meta AI Hackathon.</p>
          <p className="flex items-center gap-1">
            Engineered with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> for small merchants everywhere.
          </p>
        </div>
      </div>
    </footer>
  );
};
