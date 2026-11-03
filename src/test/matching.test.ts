import { describe, it, expect } from 'vitest';
import { cosineSimilarity, searchSimilarProducts } from '../lib/repository';
import { SEEDED_PRODUCTS } from '../lib/catalog';
import { extractLocalVisualUnderstanding } from '../lib/ai/understanding-provider';
import { generateVisualEmbedding } from '../lib/ai/embedding-provider';

describe('SnapMarket AI: Core Vector Math & Similarity', () => {
  it('should compute exact cosine similarity for identical unit vectors', () => {
    const vecA = [1, 0, 0, 0];
    const vecB = [1, 0, 0, 0];
    const sim = cosineSimilarity(vecA, vecB);
    expect(sim).toBeCloseTo(1.0, 5);
  });

  it('should compute 0 cosine similarity for orthogonal vectors', () => {
    const vecA = [1, 0, 0, 0];
    const vecB = [0, 1, 0, 0];
    const sim = cosineSimilarity(vecA, vecB);
    expect(sim).toBe(0);
  });

  it('should correctly handle normalized embeddings', () => {
    const vecA = [0.7071, 0.7071];
    const vecB = [0.7071, 0.7071];
    const sim = cosineSimilarity(vecA, vecB);
    expect(sim).toBeCloseTo(1.0, 3);
  });
});

describe('SnapMarket AI: Catalog & Search Integration', () => {
  it('should contain at least 20 seeded demonstration listings with Nigerian Naira pricing', () => {
    expect(SEEDED_PRODUCTS.length).toBeGreaterThanOrEqual(20);
    for (const prod of SEEDED_PRODUCTS) {
      expect(prod.currency).toBe('NGN');
      expect(prod.price).toBeGreaterThan(0);
      expect(prod.title).toBeTruthy();
      expect(prod.category).toBeTruthy();
      expect(prod.embedding).toBeDefined();
    }
  });

  it('should match skincare queries with high similarity to relevant catalog items', async () => {
    const queryTags = ['sunscreen', 'bottle', 'skincare'];
    const queryCategory = 'Beauty & Personal Care';
    const queryEmbedding = await generateVisualEmbedding(queryCategory, queryTags, ['#ffffff', '#f97316']);

    const results = await searchSimilarProducts(queryEmbedding, queryTags, ['#ffffff'], queryCategory);
    expect(results.length).toBeGreaterThan(0);

    // Top result should be in Beauty & Personal Care with a high match score
    const topResult = results[0];
    expect(topResult.product.category).toBe('Beauty & Personal Care');
    expect(topResult.similarityScore).toBeGreaterThan(0.7);
  });

  it('should extract valid visual attributes and price suggestions', () => {
    const analysis = extractLocalVisualUnderstanding('sample-data-url-sunscreen');
    expect(analysis.titleSuggestion).toBeTruthy();
    expect(analysis.categorySuggestion).toBeTruthy();
    expect(analysis.visualTags.length).toBeGreaterThan(0);
    expect(analysis.suggestedPriceRange.max).toBeGreaterThan(analysis.suggestedPriceRange.min);
    expect(analysis.isFallback).toBe(true);
  });
});
