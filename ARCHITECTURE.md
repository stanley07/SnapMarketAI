# SnapMarket AI — Architecture Specification

## 1. System Topology & Dual Workflow Overview

```mermaid
graph TD
    subgraph Client Application (Next.js 14 App Router)
        Buyer[👤 Buyer: /search]
        Seller[🏪 Seller: /sell]
        CatalogUI[🛍️ Catalog: /catalog]
        ProductUI[📄 Details: /products/:id]
    end

    subgraph AI Provider Abstraction Layer
        Understanding[ImageUnderstandingProvider]
        Segmentation[ProductSegmentationProvider]
        Editing[ImageEditingProvider]
        Embedding[ImageEmbeddingProvider]
    end

    subgraph Execution Engines
        CanvasEngine[Authentic Canvas Pixel Engine]
        VectorMath[Cosine Vector Similarity Engine]
        MetaAPI[Optional Meta Model / Fireworks API]
    end

    subgraph Unified Data Persistence Layer
        Repo[Catalog Repository Abstraction]
        Memory[In-Memory Catalog Cache]
        IndexedDB[(Browser IndexedDB: snapmarket_catalog_db)]
    end

    Buyer -->|Query Image| Understanding
    Buyer -->|Vector + Tags| VectorMath
    VectorMath --> Repo

    Seller -->|Shelf Photo| Segmentation
    Seller -->|Execute Edit| Editing
    Editing --> CanvasEngine
    Seller -->|Publish Listing| Repo

    Repo <--> Memory
    Repo <--> IndexedDB
    Repo --> CatalogUI
    Repo --> ProductUI
```

---

## 2. Core Subsystems

### A. Symmetrical Catalog Repository (`src/lib/repository.ts`)
* **Dual-Tier Storage:** Uses an in-memory catalog pre-seeded with 24 realistic listings across 6 categories, hydrated from browser `IndexedDB` (`snapmarket_catalog_db`).
* **Instant Persistence:** Newly published listings from `/sell` are saved to IndexedDB and prepended to the memory array. This guarantees that newly published listings immediately appear in `/catalog` and can be retrieved by visual search.

### B. Canvas Image Editing Pipeline (`src/lib/ai/editing-provider.ts`)
Performs genuine pixel-level transformations:
1. **Geometric Standardization:** Normalizes the cropped bounding box to an 800x800 square 1:1 e-commerce format with safe margins.
2. **Backdrop Synthesis:** Replaces raw shelf backgrounds with a subtle, neutral radial studio gradient.
3. **Adaptive Exposure & Contrast:** Calculates pixel luminance and applies contrast expansion factor $F = \frac{259(C + 255)}{255(259 - C)}$ with controlled brightness boosting.
4. **Convolution Sharpening:** Applies a 3x3 convolution kernel $[0, -0.25, 0, -0.25, 2.0, -0.25, 0, -0.25, 0]$ to accentuate contours without distorting branding or colors.

### C. Multimodal Vector Similarity Search (`src/lib/repository.ts`)
* **Vector Dimensionality:** 16-dimensional unit vectors representing categories (dims 0-5), dominant colors (dims 6-10), materials/textures (dims 11-13), and style attributes (dims 14-15).
* **Cosine Matching Formula:**
  $$\text{CosineSimilarity}(\mathbf{u}, \mathbf{v}) = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\|_2 \|\mathbf{v}\|_2} = \frac{\sum_{i=1}^{16} u_i v_i}{\sqrt{\sum_{i=1}^{16} u_i^2} \sqrt{\sum_{i=1}^{16} v_i^2}}$$
* **Composite Ranking Score:**
  $$\text{FinalScore} = 0.60 \times \text{VectorCosineSim} + 0.25 \times \text{VisualTagOverlap} + 0.15 \times \text{CategoryMatch}$$

---

## 3. Fallback & Diagnostic Guarantee

In compliance with the hackathon specification, SnapMarket AI never fabricates API responses or blocks execution when credentials are unavailable:
* When running without external API keys, it uses the local Canvas engine and rule-based embedding generator, displaying **"Demo / On-Device Mode"** in the diagnostic badge.
* When external credentials are provided, server-side route handlers (`/api/ai/analyze`, `/api/ai/status`) route requests to the configured cloud model endpoints.
