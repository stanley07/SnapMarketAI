'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Camera, Sparkles, Menu, X, ArrowRight } from 'lucide-react';
import { AIDiagnosticBadge } from './AIDiagnosticBadge';

export const Header: React.FC = () => {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Browse Catalog', href: '/catalog' },
    { label: 'About & Tech', href: '/about' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-sky-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/10 group-hover:scale-105 transition-transform">
                <Camera className="w-5 h-5" />
              </span>
              <div>
                <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors">
                  SnapMarket<span className="text-emerald-600">.ai</span>
                </span>
                <span className="hidden md:block text-[10px] uppercase font-bold tracking-widest text-slate-500">
                  Snap It. Find It. Sell It.
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links & Action CTAs */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-semibold transition-colors ${
                  pathname === link.href ? 'text-emerald-700 font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {link.label}
              </Link>
            ))}

            <div className="h-5 w-px bg-slate-200" />

            <AIDiagnosticBadge />

            {/* Buyer CTA */}
            <Link
              href="/search"
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                pathname === '/search'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
              }`}
            >
              <Camera className="w-4 h-4 text-emerald-600" />
              <span>Find with Photo</span>
            </Link>

            {/* Seller CTA */}
            <Link
              href="/sell"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 shadow-sm shadow-emerald-600/20 hover:shadow-md transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Sell with AI</span>
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <AIDiagnosticBadge />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-3 pb-5 space-y-3 shadow-lg">
          <div className="space-y-1">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-100"
            >
              Home
            </Link>
            <Link
              href="/catalog"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-100"
            >
              Browse Catalog
            </Link>
            <Link
              href="/about"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-100"
            >
              About & AI Capabilities
            </Link>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <Link
              href="/search"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-100 text-slate-900 font-semibold text-sm"
            >
              <span className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-600" />
                Find with a Photo
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>
            <Link
              href="/sell"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm shadow-sm"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Sell with AI
              </span>
              <ArrowRight className="w-4 h-4 text-white/80" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
