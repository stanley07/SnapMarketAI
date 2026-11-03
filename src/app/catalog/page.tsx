'use client';

import React, { useState, useEffect } from 'react';
import { ShoppingBag, Filter, ArrowUpDown, RefreshCw, Sparkles } from 'lucide-react';
import { Product, ProductCategory, ProductCondition } from '@/types/product';
import { getAllProducts, resetCatalog } from '@/lib/repository';
import { ProductCard } from '@/components/ProductCard';

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [category, setCategory] = useState<ProductCategory | 'All'>('All');
  const [condition, setCondition] = useState<ProductCondition | 'All'>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'price_low' | 'price_high'>('newest');
  const [userOnly, setUserOnly] = useState(false);

  const loadCatalog = async () => {
    setLoading(true);
    const all = await getAllProducts();
    setProducts(all);
    setFilteredProducts(all);
    setLoading(false);
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  useEffect(() => {
    let list = [...products];

    if (category !== 'All') {
      list = list.filter((p) => p.category === category);
    }

    if (condition !== 'All') {
      list = list.filter((p) => p.condition === condition);
    }

    if (userOnly) {
      list = list.filter((p) => p.isUserListed);
    }

    if (sortBy === 'price_low') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_high') {
      list.sort((a, b) => b.price - a.price);
    } else {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    setFilteredProducts(list);
  }, [category, condition, sortBy, userOnly, products]);

  const handleResetCatalog = async () => {
    if (confirm('Reset catalog to initial 24 demonstration listings?')) {
      await resetCatalog();
      await loadCatalog();
    }
  };

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
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4" />
            Shared Marketplace Inventory
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Demonstration Catalog
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">
            Browse all seeded items and newly published seller listings. All listings here are instantly searchable through the Buyer Visual Search experience.
          </p>
        </div>

        <button
          onClick={handleResetCatalog}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 self-start sm:self-auto transition-colors"
          title="Reset to 24 default seeded products"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reset Seeded State
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ProductCategory | 'All')}
              className="bg-transparent font-medium focus:outline-hidden cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Condition Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700">
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as ProductCondition | 'All')}
              className="bg-transparent font-medium focus:outline-hidden cursor-pointer"
            >
              <option value="All">All Conditions</option>
              <option value="Brand New">Brand New</option>
              <option value="Like New">Like New</option>
              <option value="Gently Used">Gently Used</option>
            </select>
          </div>

          {/* Seller Listed Filter Toggle */}
          <button
            onClick={() => setUserOnly(!userOnly)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              userOnly
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Newly Published Only</span>
          </button>
        </div>

        {/* Sort By */}
        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'price_low' | 'price_high')}
            className="bg-transparent font-medium focus:outline-hidden cursor-pointer"
          >
            <option value="newest">Sort: Newest First</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
          </select>
        </div>

      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3 animate-pulse">
              <div className="aspect-square bg-slate-200 rounded-xl" />
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-4 bg-slate-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="space-y-4">
          <div className="text-xs font-semibold text-slate-500">
            Showing {filteredProducts.length} listings in catalog
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((prod) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-md mx-auto space-y-3">
          <h3 className="font-bold text-slate-900">No Listings Match Filters</h3>
          <p className="text-xs text-slate-500">Try selecting &quot;All&quot; categories or conditions.</p>
          <button
            onClick={() => {
              setCategory('All');
              setCondition('All');
              setUserOnly(false);
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50"
          >
            Clear Filters
          </button>
        </div>
      )}

    </div>
  );
}
