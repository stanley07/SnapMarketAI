# SnapMarket AI

> **Tagline:** Snap It. Find It. Sell It.  
> **Hackathon Submission:** Meta AI Hackathon 2026 (Visual Commerce & Multimodal Applications)

---

## 1. Product Overview

**SnapMarket AI** is an intelligent visual commerce platform inspired by Facebook Marketplace that connects local buyers and retail merchants through an authentic multimodal catalog.

The product solves two core commerce bottlenecks:
1. **The Buyer's Vocabulary Problem:** Buyers often cannot describe what they need using search keywords (e.g., holding an empty cosmetic bottle, a mechanical fitting, or a thrift fashion piece with worn-off labels).
2. **The Seller's Photography Problem:** Small shopkeepers and independent retailers lack professional lighting studios. Their raw photos taken on cluttered shelves or poorly lit counters look unappealing.

### The Complete Workflows:
* **For Buyers (`/search`):** Upload or photograph any product. The image is processed by **Meta Muse Spark** (`muse-spark-1.3`) to extract category, factual title, description, colors, material texture, tags, and visual uncertainties. The catalog is then queried using multimodal vector cosine similarity, tag overlap, and material matching.
* **For Sellers (`/sell`):** Photograph multi-product retail shelves. Candidate products are segmented into bounding boxes via the **Modal Serverless Segmentation Service** (or spatial heuristic fallback). The seller selects their product, triggers studio enhancement powered by **Meta Muse Image** (`muse-image-1.0`) or the calibrated Canvas engine, reviews before/after fidelity, and publishes directly to the shared catalog.

---

## 2. Core Architecture & Key Routes

| Route | Purpose | Cloud Provider | Fail-Safe Local Fallback |
| :--- | :--- | :--- | :--- |
| **`/`** | Landing Page | — | Responsive showcase with featured listings & direct workflow buttons |
| **`/search`** | Buyer Visual Discovery | **Meta Muse Spark** (`muse-spark-1.3`) | On-device visual profile engine with 16-dim cosine vector similarity |
| **`/sell`** | Seller AI Studio | **Modal SAM** + **Meta Muse Image** | High-contrast shelf detector + 800x800 HTML5 Canvas studio pipeline |
| **`/products/[id]`** | Listing Details Page | — | Original vs. enhanced comparison, specs, seller info, and similar items |
| **`/catalog`** | Shared Catalog | — | Browse all seeded items + user-published listings via IndexedDB |
| **`/api/ai/analyze`** | Server-Side Analysis | Meta Muse Spark | Deterministic structured attribute extractor |
| **`/api/ai/edit`** | Server-Side Editing | Meta Muse Image | Client-directed Canvas studio processing |
| **`/api/ai/segment`** | Server-Side Segmentation | Modal Serverless FastAPI | Multi-object spatial heuristic detector |
| **`/api/ai/status`** | Engine Diagnostics | Meta Models + Modal Health | Real-time connection & credential inspection |

---

## 3. Technology Stack

* **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide icons
* **Multimodal AI (Meta Muse Suite):**
  * `muse-spark-1.3`: Multimodal product understanding & structured attribute extraction
  * `muse-image-1.0`: Commercial product photo conditioning & studio background generation
  * Protocol: Official Meta Model API (`https://api.meta.ai/v1/responses` and `/v1/chat/completions`)
* **Serverless Backend (Modal):**
  * Modal App: `modal/segmentation_app.py`
  * FastAPI container running on Python 3.11 with PIL and NumPy for shelf object boundary extraction
* **Local Fallback Engines:**
  * Canvas Studio Engine: Mathematical exposure calibration (+12% brightness, +15% contrast), 3x3 convolution sharpening, and studio backdrop rendering
  * Vector Search Engine: 16-dimensional normalized visual embedding space comparing query features against catalog vectors using Cosine Similarity ($\cos(\theta) = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\|\|\mathbf{v}\|}$)
* **Persistence:** IndexedDB (`snapmarket_catalog_db`) with in-memory caching.

---

## 4. Execution Commands

### Prerequisites
* Node.js `>= 20.0.0`
* npm `>= 10.0.0`
* Python `>= 3.10` (for Modal serverless deployment)

### Running the Application Locally
```bash
# Start the local development server:
npm.cmd run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running Verification Checks
```bash
# Run automated test suite
npm.cmd run test

# Run strict TypeScript typecheck
npm.cmd run typecheck

# Run linter
npm.cmd run lint

# Run production build
npm.cmd run build
```

---

## 5. Environment Configuration

Create `.env.local` to configure live cloud credentials:

```env
# Official Meta Model API (Meta Muse Suite)
# Read strictly server-side. Never exposed to browser or client code.
MODEL_API_KEY=your_meta_model_api_key_here
META_MODEL_API_ENDPOINT=https://api.meta.ai/v1

# Modal Serverless Shelf Product Segmentation Service
# Deploy with: modal deploy modal/segmentation_app.py
MODAL_SEGMENTATION_ENDPOINT=https://your-username--snapmarket-shelf-segmentation-fastapi-app.modal.run
```

---

## 6. Modal Serverless Deployment Guide

The shelf-product segmentation service lives in `modal/segmentation_app.py`.

### 1. Install Modal & Authenticate
```bash
pip install modal
modal setup
```

### 2. Test Locally with Ephemeral URL
```bash
modal serve modal/segmentation_app.py
```
Modal will output a temporary development URL for testing:
```
✓ Created web function fastapi_app => https://<user>--snapmarket-shelf-segmentation-fastapi-app-dev.modal.run
```

### 3. Deploy to Production
```bash
modal deploy modal/segmentation_app.py
```
Output:
```
✓ Deployed app 'snapmarket-shelf-segmentation'
✓ Web endpoint: https://<your-username>--snapmarket-shelf-segmentation-fastapi-app.modal.run
```

Copy the generated web endpoint into your `.env.local` as `MODAL_SEGMENTATION_ENDPOINT`.

---

## 7. Autonomous Demo & Fallback Guarantees

SnapMarket AI maintains absolute engineering integrity:
* **Zero-Config Default:** When `MODEL_API_KEY` or `MODAL_SEGMENTATION_ENDPOINT` are missing, the entire buyer search, seller shelf segmentation, before/after editing, and catalog publishing workflows remain **100% functional** through authentic local fallbacks.
* **Security Guardrails:** API keys are never exposed to browser clients, never printed in logs, and never committed to version control.
* **Transparency:** The **AI Diagnostics Badge** in the header clearly displays whether each subsystem is running via Live Cloud AI or Local Fallback.
