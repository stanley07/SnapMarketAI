# SnapMarket AI — Modal Serverless Segmentation Service

This directory contains the serverless shelf-product segmentation service for SnapMarket AI, deployed on [Modal](https://modal.com).

## Overview
When sellers upload a retail shelf photo or store display with multiple items, this service isolates candidate products and returns normalized bounding box coordinates (`{ x, y, width, height }` as percentages). The seller can then select their exact product to crop and enhance.

---

## Prerequisites
1. Install Python 3.10+ and the Modal client:
   ```bash
   pip install modal
   ```
2. Authenticate your machine with Modal:
   ```bash
   modal setup
   ```
   This will open a browser window to authenticate with your Modal account and generate a local token.

---

## Local Development & Testing
To start a hot-reloading development server with an ephemeral public URL:
```bash
modal serve modal/segmentation_app.py
```
Modal will output a temporary development URL, for example:
```
✓ Created web function fastapi_app => https://<user>--snapmarket-shelf-segmentation-fastapi-app-dev.modal.run
```

You can test the health endpoint:
```bash
curl https://<user>--snapmarket-shelf-segmentation-fastapi-app-dev.modal.run/health
```

---

## Production Deployment
To deploy the permanent serverless endpoint to Modal:
```bash
modal deploy modal/segmentation_app.py
```
Output:
```
✓ Deployed app 'snapmarket-shelf-segmentation' in 1.4s
✓ Web endpoint: https://<your-username>--snapmarket-shelf-segmentation-fastapi-app.modal.run
```

---

## Connecting to SnapMarket AI Next.js App
Once deployed, set the endpoint in your Next.js application environment (`.env.local`):
```env
MODAL_SEGMENTATION_ENDPOINT=https://<your-username>--snapmarket-shelf-segmentation-fastapi-app.modal.run
```

When `MODAL_SEGMENTATION_ENDPOINT` is not configured, SnapMarket AI automatically and seamlessly engages its on-device multi-object heuristic detector (`isFallback: true`), guaranteeing uninterrupted operation.
