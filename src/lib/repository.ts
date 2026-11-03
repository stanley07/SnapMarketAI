import { Product, VisualSearchResult } from '../types/product';
import { SEEDED_PRODUCTS } from './catalog';

const IDB_NAME = 'snapmarket_catalog_db';
const IDB_STORE = 'custom_listings';
const IDB_VERSION = 1;

// In-memory catalog cache
let memoryCatalog: Product[] = [...SEEDED_PRODUCTS];

// --- IndexedDB Browser Persistence Helper ---
function openDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const request = window.indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

// Load custom user-created listings from IndexedDB
export async function loadUserListings(): Promise<Product[]> {
  const db = await openDB();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(IDB_STORE, 'readonly');
      const store = transaction.objectStore(IDB_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const custom = (request.result as Product[]) || [];
        resolve(custom);
      };
      request.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

// Save a newly published product into IndexedDB & memory
export async function persistProduct(product: Product): Promise<void> {
  // Update memory
  const idx = memoryCatalog.findIndex((p) => p.id === product.id);
  if (idx >= 0) {
    memoryCatalog[idx] = product;
  } else {
    memoryCatalog = [product, ...memoryCatalog];
  }

  // Persist to IndexedDB
  const db = await openDB();
  if (!db) return;

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(IDB_STORE, 'readwrite');
      const store = transaction.objectStore(IDB_STORE);
      const request = store.put(product);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    } catch {
      resolve();
    }
  });
}

// Get all products (seeded + user-created)
export async function getAllProducts(): Promise<Product[]> {
  if (typeof window !== 'undefined') {
    const customListings = await loadUserListings();
    // Merge without duplicates
    const customIds = new Set(customListings.map((p) => p.id));
    const merged = [...customListings, ...SEEDED_PRODUCTS.filter((p) => !customIds.has(p.id))];
    memoryCatalog = merged;
    return merged;
  }
  return memoryCatalog;
}

// Get single product by ID
export async function getProductById(id: string): Promise<Product | null> {
  const all = await getAllProducts();
  return all.find((p) => p.id === id) || null;
}

// Reset catalog to initial seeded state (helpful for demo reset)
export async function resetCatalog(): Promise<void> {
  memoryCatalog = [...SEEDED_PRODUCTS];
  const db = await openDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(IDB_STORE, 'readwrite');
      const store = transaction.objectStore(IDB_STORE);
      store.clear().onsuccess = () => resolve();
    } catch {
      resolve();
    }
  });
}

// --- Vector Math & Cosine Similarity ---
export const MIN_SIMILARITY_THRESHOLD = 0.58;

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  const len = Math.min(vecA.length, vecB.length);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// --- Visual Similarity Search Function ---
export async function searchSimilarProducts(
  queryEmbedding?: number[],
  queryTags: string[] = [],
  queryColors: string[] = [],
  queryCategory?: string,
  queryMaterial?: string,
  minThreshold: number = MIN_SIMILARITY_THRESHOLD
): Promise<VisualSearchResult[]> {
  const all = await getAllProducts();
  const hasEmbedding = queryEmbedding && queryEmbedding.length > 0;

  const scoredResults: VisualSearchResult[] = all.map((product) => {
    let similarityScore = 0;
    const matchedFeatures: string[] = [];

    if (hasEmbedding && product.embedding) {
      // 1. Primary Signal: 64-dim Visual Feature Cosine Similarity (Weight: 70%)
      const cosSim = cosineSimilarity(queryEmbedding, product.embedding);
      similarityScore += Math.max(0, cosSim) * 0.70;
      if (cosSim > 0.65) {
        matchedFeatures.push('High visual geometry & silhouette match');
      }

      // 2. Secondary Signal: Category Compatibility (Weight: 20%)
      if (queryCategory) {
        const isCatMatch = product.category.toLowerCase().includes(queryCategory.toLowerCase()) ||
          queryCategory.toLowerCase().includes(product.category.toLowerCase());
        if (isCatMatch) {
          similarityScore += 0.20;
          matchedFeatures.push(`Category: ${product.category}`);
        }
      }

      // 3. Secondary Signal: Dominant Color Palette Alignment (Weight: 5%)
      if (queryColors && queryColors.length > 0 && product.dominantColors) {
        const lowerQueryColors = queryColors.map((c) => c.toLowerCase());
        const matchingColors = product.dominantColors.filter((c) =>
          lowerQueryColors.includes(c.toLowerCase())
        );
        if (matchingColors.length > 0) {
          const colorRatio = matchingColors.length / Math.max(queryColors.length, product.dominantColors.length);
          similarityScore += 0.02 + colorRatio * 0.05;
          matchedFeatures.push('Matched color signature');
        }
      }

      // 4. Secondary Signal: Visual Tag Overlap (Weight: 5%)
      if (queryTags.length > 0 && product.visualTags) {
        const lowerQueryTags = queryTags.map((t) => t.toLowerCase());
        const commonTags = product.visualTags.filter((t) =>
          lowerQueryTags.some((qt) => t.toLowerCase().includes(qt) || qt.includes(t.toLowerCase()))
        );
        if (commonTags.length > 0) {
          const tagRatio = commonTags.length / Math.max(queryTags.length, product.visualTags.length);
          similarityScore += 0.02 + tagRatio * 0.06;
          matchedFeatures.push(...commonTags.slice(0, 3).map((t) => `Matched: ${t}`));
        }
      }
    } else {
      // Attribute-only query fallback
      if (queryCategory && product.category.toLowerCase().includes(queryCategory.toLowerCase())) {
        similarityScore += 0.50;
        matchedFeatures.push(`Category: ${product.category}`);
      }
      if (queryTags.length > 0 && product.visualTags) {
        const lowerQueryTags = queryTags.map((t) => t.toLowerCase());
        const commonTags = product.visualTags.filter((t) =>
          lowerQueryTags.some((qt) => t.toLowerCase().includes(qt) || qt.includes(t.toLowerCase()))
        );
        if (commonTags.length > 0) {
          const tagRatio = Math.min(1.0, commonTags.length / Math.max(1, queryTags.length));
          similarityScore += tagRatio * 0.35;
          matchedFeatures.push(...commonTags.slice(0, 2).map((t) => `Matched: ${t}`));
        }
      }
      if (queryColors && queryColors.length > 0 && product.dominantColors) {
        const lowerQueryColors = queryColors.map((c) => c.toLowerCase());
        if (product.dominantColors.some((c) => lowerQueryColors.includes(c.toLowerCase()))) {
          similarityScore += 0.10;
          matchedFeatures.push('Matched color signature');
        }
      }
    }

    // Material alignment bonus
    if (queryMaterial && queryMaterial !== 'unknown' && queryMaterial.trim().length > 0) {
      const lowerMat = queryMaterial.toLowerCase();
      const productText = (product.title + ' ' + product.description + ' ' + (product.visualTags || []).join(' ')).toLowerCase();
      const materialTokens = ['leather', 'cotton', 'metal', 'plastic', 'glass', 'ceramic', 'wood', 'steel', 'polymer', 'canvas']
        .filter((tok) => lowerMat.includes(tok));
      const hasMaterialMatch = materialTokens.some((tok) => productText.includes(tok));
      if (hasMaterialMatch) {
        similarityScore += 0.05;
        matchedFeatures.push(`Material correspondence: ${queryMaterial}`);
      }
    }

    // Round score between 0 and 0.99
    similarityScore = Math.min(0.99, Number(similarityScore.toFixed(3)));

    let explanation = 'Visual match based on form factor and features.';
    if (similarityScore > 0.8) {
      explanation = 'Excellent visual & category correspondence with query.';
    } else if (similarityScore > 0.6) {
      explanation = 'Strong stylistic similarity in form and color palette.';
    } else {
      explanation = 'Moderate resemblance in category and characteristics.';
    }

    return {
      product,
      similarityScore,
      matchedFeatures: Array.from(new Set(matchedFeatures)),
      explanation,
    };
  });

  // Strict rejection threshold: exclude unrelated products below threshold
  const filteredResults = scoredResults.filter((r) => r.similarityScore >= minThreshold);

  // Sort descending by similarity score
  filteredResults.sort((a, b) => b.similarityScore - a.similarityScore);
  return filteredResults;
}
