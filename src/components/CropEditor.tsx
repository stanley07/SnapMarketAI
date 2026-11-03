'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Check,
  X,
  RefreshCw,
  Square,
  Smartphone,
  Sliders,
  Palette,
  Camera,
} from 'lucide-react';
import { StudioBackdropPreset } from '@/types/ai';
import { normalizeHexColor, STUDIO_PRESETS } from '@/lib/ai/studio-compositor';

export interface CropBox {
  x: number;      // 0 - 100 percentage
  y: number;      // 0 - 100 percentage
  width: number;  // 0 - 100 percentage
  height: number; // 0 - 100 percentage
}

export type AspectRatioPreset = '1:1' | '4:5' | 'free';

export interface CropEditorProps {
  imageSrc: string;
  initialCropBox?: CropBox;
  onApplyCrop: (
    croppedDataUrl: string,
    details: {
      cropBox: CropBox;
      rotation: number;
      zoom: number;
      aspectPreset: AspectRatioPreset;
      backdropPreset: StudioBackdropPreset;
      addContactShadow: boolean;
      customColor?: string;
    }
  ) => void;
  onCancel: () => void;
  onChooseAnotherPhoto?: () => void;
}

export const CropEditor: React.FC<CropEditorProps> = ({
  imageSrc,
  initialCropBox,
  onApplyCrop,
  onCancel,
  onChooseAnotherPhoto,
}) => {
  // Crop state
  const [aspectPreset, setAspectPreset] = useState<AspectRatioPreset>('1:1');
  const [zoom, setZoom] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0); // in degrees: 0, 90, 180, 270...
  const [fineRotation, setFineRotation] = useState<number>(0); // -45 to +45
  const [backdropPreset, setBackdropPreset] = useState<StudioBackdropPreset>('pure_white');
  const [addContactShadow, setAddContactShadow] = useState<boolean>(true);
  const [customColor, setCustomColor] = useState<string>('#D9EAD3');
  const [hexInputText, setHexInputText] = useState<string>('#D9EAD3');
  const [hexError, setHexError] = useState<string | null>(null);

  // Normalized crop box in percentage of container (0 to 100)
  const [cropBox, setCropBox] = useState<CropBox>(
    initialCropBox || { x: 15, y: 15, width: 70, height: 70 }
  );

  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);

  // References
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{
    isDragging: boolean;
    dragType: 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w';
    startX: number;
    startY: number;
    startBox: CropBox;
  }>({
    isDragging: false,
    dragType: 'move',
    startX: 0,
    startY: 0,
    startBox: cropBox,
  });

  // Total rotation angle
  const totalAngle = rotation + fineRotation;

  // Adjust crop box when aspect ratio preset changes
  useEffect(() => {
    if (aspectPreset === 'free') return;

    setCropBox((prev) => {
      let targetRatio = 1; // w / h
      if (aspectPreset === '1:1') targetRatio = 1.0;
      if (aspectPreset === '4:5') targetRatio = 4 / 5;

      const container = containerRef.current;
      const cWidth = container?.clientWidth || 400;
      const cHeight = container?.clientHeight || 400;

      // Adjust height or width based on container aspect ratio
      let newWidth = prev.width;
      let newHeight = (prev.width * (cWidth / cHeight)) / targetRatio;

      if (newHeight > 90) {
        newHeight = 70;
        newWidth = (newHeight * targetRatio) / (cWidth / cHeight);
      }
      if (newWidth > 90) {
        newWidth = 70;
        newHeight = (newWidth * (cWidth / cHeight)) / targetRatio;
      }

      const newX = Math.max(2, Math.min(98 - newWidth, prev.x));
      const newY = Math.max(2, Math.min(98 - newHeight, prev.y));

      return {
        x: newX,
        y: newY,
        width: Math.max(10, Math.min(96, newWidth)),
        height: Math.max(10, Math.min(96, newHeight)),
      };
    });
  }, [aspectPreset]);

  // Generate cropped preview
  const generateCroppedCanvas = useCallback((): string | null => {
    const img = imageRef.current;
    if (!img || !img.naturalWidth || !img.naturalHeight) return null;

    const nw = img.naturalWidth;
    const nh = img.naturalHeight;

    // Convert percentage cropBox into source image pixel coordinates
    const sx = Math.max(0, (cropBox.x / 100) * nw);
    const sy = Math.max(0, (cropBox.y / 100) * nh);
    const sWidth = Math.min(nw - sx, (cropBox.width / 100) * nw);
    const sHeight = Math.min(nh - sy, (cropBox.height / 100) * nh);

    if (sWidth <= 0 || sHeight <= 0) return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // High-resolution crop dimensions matching the crop frame
    const outWidth = Math.max(100, Math.round(sWidth));
    const outHeight = Math.max(100, Math.round(sHeight));

    canvas.width = outWidth;
    canvas.height = outHeight;

    ctx.save();
    ctx.translate(outWidth / 2, outHeight / 2);

    // Apply rotation
    if (totalAngle !== 0) {
      ctx.rotate((totalAngle * Math.PI) / 180);
    }

    // Apply zoom
    if (zoom !== 1.0) {
      ctx.scale(zoom, zoom);
    }

    // Draw strictly the cropped source image pixels (no premature background painting or borders)
    ctx.drawImage(img, sx, sy, sWidth, sHeight, -outWidth / 2, -outHeight / 2, outWidth, outHeight);
    ctx.restore();

    return canvas.toDataURL('image/jpeg', 0.95);
  }, [cropBox, totalAngle, zoom]);

  // Update preview thumbnail when crop, zoom, rotation, or backdrop changes
  useEffect(() => {
    const timer = setTimeout(() => {
      const dataUrl = generateCroppedCanvas();
      if (dataUrl) {
        setPreviewDataUrl(dataUrl);
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [generateCroppedCanvas]);

  // Mouse & Touch Drag Handlers
  const handlePointerDown = (
    e: React.PointerEvent,
    dragType: 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w'
  ) => {
    e.preventDefault();
    e.stopPropagation();

    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    dragRef.current = {
      isDragging: true,
      dragType,
      startX: e.clientX,
      startY: e.clientY,
      startBox: { ...cropBox },
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.isDragging) return;
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const deltaX = ((e.clientX - dragRef.current.startX) / rect.width) * 100;
    const deltaY = ((e.clientY - dragRef.current.startY) / rect.height) * 100;
    const { startBox, dragType } = dragRef.current;

    const newBox = { ...startBox };

    if (dragType === 'move') {
      newBox.x = Math.max(0, Math.min(100 - startBox.width, startBox.x + deltaX));
      newBox.y = Math.max(0, Math.min(100 - startBox.height, startBox.y + deltaY));
    } else {
      if (dragType.includes('e')) {
        newBox.width = Math.max(10, Math.min(100 - startBox.x, startBox.width + deltaX));
      }
      if (dragType.includes('s')) {
        newBox.height = Math.max(10, Math.min(100 - startBox.y, startBox.height + deltaY));
      }
      if (dragType.includes('w')) {
        const potentialWidth = startBox.width - deltaX;
        if (potentialWidth >= 10 && startBox.x + deltaX >= 0) {
          newBox.x = startBox.x + deltaX;
          newBox.width = potentialWidth;
        }
      }
      if (dragType.includes('n')) {
        const potentialHeight = startBox.height - deltaY;
        if (potentialHeight >= 10 && startBox.y + deltaY >= 0) {
          newBox.y = startBox.y + deltaY;
          newBox.height = potentialHeight;
        }
      }

      // Maintain locked aspect ratio if preset is 1:1 or 4:5
      if (aspectPreset === '1:1') {
        const avg = (newBox.width + newBox.height) / 2;
        newBox.width = Math.min(avg, 100 - newBox.x);
        newBox.height = Math.min(avg, 100 - newBox.y);
      } else if (aspectPreset === '4:5') {
        const targetH = (newBox.width * 5) / 4;
        if (newBox.y + targetH <= 100) {
          newBox.height = targetH;
        }
      }
    }

    setCropBox(newBox);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragRef.current.isDragging) {
      dragRef.current.isDragging = false;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Safe catch
      }
    }
  };

  // Quick reset
  const handleReset = () => {
    setCropBox({ x: 15, y: 15, width: 70, height: 70 });
    setZoom(1.0);
    setRotation(0);
    setFineRotation(0);
    setAspectPreset('1:1');
  };

  // Final apply
  const handleApply = () => {
    const croppedUrl = generateCroppedCanvas();
    if (croppedUrl) {
      const norm = normalizeHexColor(customColor);
      onApplyCrop(croppedUrl, {
        cropBox,
        rotation: totalAngle,
        zoom,
        aspectPreset,
        backdropPreset,
        addContactShadow,
        customColor: norm.valid ? norm.normalized : '#D9EAD3',
      });
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden max-w-4xl mx-auto space-y-6 p-6 sm:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5" />
            Seller Composition Studio
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Adjust Crop & Product Framing
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Drag the frame corners to isolate the product on the shelf. Zoom or rotate as needed.
          </p>
        </div>

        {/* Aspect Ratio Presets */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200/60">
          <button
            type="button"
            onClick={() => setAspectPreset('1:1')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              aspectPreset === '1:1'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Square className="w-3.5 h-3.5" />
            1:1 Square
          </button>
          <button
            type="button"
            onClick={() => setAspectPreset('4:5')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              aspectPreset === '4:5'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            4:5 Portrait
          </button>
          <button
            type="button"
            onClick={() => setAspectPreset('free')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              aspectPreset === 'free'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            Freeform
          </button>
        </div>
      </div>

      {/* Main Editing Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Interactive Canvas Framing Stage */}
        <div className="lg:col-span-2 space-y-4">
          <div
            ref={containerRef}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-800 shadow-inner select-none touch-none flex items-center justify-center cursor-crosshair"
          >
            {/* Raw Shelf Photo */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Raw Product"
              className="w-full h-full object-contain pointer-events-none transition-transform duration-100"
              style={{
                transform: `rotate(${totalAngle}deg) scale(${zoom})`,
              }}
            />

            {/* Dark Mask Outside Crop Box */}
            <div
              className="absolute inset-0 bg-black/55 pointer-events-none"
              style={{
                clipPath: `polygon(
                  0% 0%, 100% 0%, 100% 100%, 0% 100%,
                  0% 0%,
                  ${cropBox.x}% ${cropBox.y}%,
                  ${cropBox.x}% ${cropBox.y + cropBox.height}%,
                  ${cropBox.x + cropBox.width}% ${cropBox.y + cropBox.height}%,
                  ${cropBox.x + cropBox.width}% ${cropBox.y}%,
                  ${cropBox.x}% ${cropBox.y}%
                )`,
              }}
            />

            {/* Interactive Crop Frame Box */}
            <div
              onPointerDown={(e) => handlePointerDown(e, 'move')}
              className="absolute border-2 border-emerald-400 bg-transparent shadow-2xl cursor-move transition-shadow hover:shadow-emerald-500/20"
              style={{
                left: `${cropBox.x}%`,
                top: `${cropBox.y}%`,
                width: `${cropBox.width}%`,
                height: `${cropBox.height}%`,
              }}
            >
              {/* Rule-of-thirds grid lines */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                <div className="border-r border-b border-emerald-300/40" />
                <div className="border-r border-b border-emerald-300/40" />
                <div className="border-b border-emerald-300/40" />
                <div className="border-r border-b border-emerald-300/40" />
                <div className="border-r border-b border-emerald-300/40" />
                <div className="border-b border-emerald-300/40" />
                <div className="border-r border-emerald-300/40" />
                <div className="border-r border-emerald-300/40" />
                <div />
              </div>

              {/* Corner Handles */}
              <div
                onPointerDown={(e) => handlePointerDown(e, 'nw')}
                className="absolute -top-2 -left-2 w-5 h-5 bg-white border-2 border-emerald-600 rounded-full shadow-md cursor-nwse-resize z-20 hover:scale-125 transition-transform"
              />
              <div
                onPointerDown={(e) => handlePointerDown(e, 'ne')}
                className="absolute -top-2 -right-2 w-5 h-5 bg-white border-2 border-emerald-600 rounded-full shadow-md cursor-nesw-resize z-20 hover:scale-125 transition-transform"
              />
              <div
                onPointerDown={(e) => handlePointerDown(e, 'sw')}
                className="absolute -bottom-2 -left-2 w-5 h-5 bg-white border-2 border-emerald-600 rounded-full shadow-md cursor-nesw-resize z-20 hover:scale-125 transition-transform"
              />
              <div
                onPointerDown={(e) => handlePointerDown(e, 'se')}
                className="absolute -bottom-2 -right-2 w-5 h-5 bg-white border-2 border-emerald-600 rounded-full shadow-md cursor-nwse-resize z-20 hover:scale-125 transition-transform"
              />

              {/* Edge Handles */}
              <div
                onPointerDown={(e) => handlePointerDown(e, 'n')}
                className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-2 bg-emerald-400 rounded-full cursor-ns-resize z-20"
              />
              <div
                onPointerDown={(e) => handlePointerDown(e, 's')}
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-2 bg-emerald-400 rounded-full cursor-ns-resize z-20"
              />
              <div
                onPointerDown={(e) => handlePointerDown(e, 'w')}
                className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-8 bg-emerald-400 rounded-full cursor-ew-resize z-20"
              />
              <div
                onPointerDown={(e) => handlePointerDown(e, 'e')}
                className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-8 bg-emerald-400 rounded-full cursor-ew-resize z-20"
              />

              {/* Center Guidance Badge */}
              <span className="absolute top-2 left-2 bg-slate-900/80 text-emerald-300 text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-xs pointer-events-none">
                {Math.round(cropBox.width)}% × {Math.round(cropBox.height)}%
              </span>
            </div>
          </div>

          {/* Controls Bar: Zoom & Rotation */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
            {/* Zoom Slider */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700 w-14 flex items-center gap-1">
                <ZoomIn className="w-3.5 h-3.5 text-slate-500" />
                Zoom
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.8, Number((z - 0.1).toFixed(2))))}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-600"
                aria-label="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <input
                type="range"
                min="0.8"
                max="3.0"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-emerald-600 cursor-pointer"
                aria-label="Image zoom level"
              />
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3.0, Number((z + 0.1).toFixed(2))))}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-600"
                aria-label="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-slate-600 w-10 text-right">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            {/* Rotation Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/60">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 w-14 flex items-center gap-1">
                  <RotateCw className="w-3.5 h-3.5 text-slate-500" />
                  Rotate
                </span>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  -90°
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  +90°
                </button>
              </div>

              {/* Fine Angle Slider */}
              <div className="flex items-center gap-2 flex-1 max-w-xs">
                <span className="text-[11px] text-slate-500 font-medium">Fine:</span>
                <input
                  type="range"
                  min="-45"
                  max="45"
                  step="1"
                  value={fineRotation}
                  onChange={(e) => setFineRotation(Number(e.target.value))}
                  className="flex-1 accent-emerald-600 cursor-pointer"
                  aria-label="Fine rotation angle"
                />
                <span className="text-xs font-mono text-slate-600 w-8 text-right">
                  {totalAngle}°
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Output Preview Card */}
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/90 space-y-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
              Live Output Preview
            </span>
            <h3 className="font-extrabold text-slate-900 text-sm">
              Standardized Centered Framing
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Natural aspect ratio preserved with clean margins.
            </p>
          </div>

          {/* Preview Thumbnail */}
          <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-white border border-slate-200 shadow-sm flex items-center justify-center p-2">
            {previewDataUrl ? (
              <img
                src={previewDataUrl}
                alt="Cropped Preview"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-xs text-slate-400 animate-pulse">Generating preview...</div>
            )}
            <span className="absolute bottom-2 right-2 text-[10px] font-bold bg-slate-900/80 text-white px-2 py-0.5 rounded">
              {aspectPreset === '4:5' ? '4:5 (800×1000)' : '1:1 (800×800)'}
            </span>
          </div>

          {/* Studio Backdrop Presets */}
          <div className="space-y-2 pt-1 border-t border-slate-200/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
              <Palette className="w-3 h-3 text-emerald-600" />
              Studio Backdrop Preset:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setBackdropPreset('pure_white')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left border transition-all ${
                  backdropPreset === 'pure_white'
                    ? 'bg-white text-emerald-800 border-emerald-500 shadow-xs ring-1 ring-emerald-500'
                    : 'bg-white/60 text-slate-600 border-slate-200 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-white border border-slate-300 shadow-2xs" />
                  <span>Pure White</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setBackdropPreset('soft_gray')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left border transition-all ${
                  backdropPreset === 'soft_gray'
                    ? 'bg-white text-emerald-800 border-emerald-500 shadow-xs ring-1 ring-emerald-500'
                    : 'bg-white/60 text-slate-600 border-slate-200 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#E5E7EB] border border-slate-300 shadow-2xs" />
                  <span>Soft Light Gray</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setBackdropPreset('warm_neutral')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left border transition-all ${
                  backdropPreset === 'warm_neutral'
                    ? 'bg-white text-emerald-800 border-emerald-500 shadow-xs ring-1 ring-emerald-500'
                    : 'bg-white/60 text-slate-600 border-slate-200 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#F5EBDD] border border-stone-300 shadow-2xs" />
                  <span>Warm Neutral</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setBackdropPreset('transparent')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left border transition-all ${
                  backdropPreset === 'transparent'
                    ? 'bg-white text-emerald-800 border-emerald-500 shadow-xs ring-1 ring-emerald-500'
                    : 'bg-white/60 text-slate-600 border-slate-200 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-slate-300"
                    style={{
                      backgroundImage: 'linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)',
                      backgroundSize: '6px 6px',
                    }}
                  />
                  <span>Transparent</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setBackdropPreset('custom')}
                className={`col-span-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left border transition-all ${
                  backdropPreset === 'custom'
                    ? 'bg-white text-emerald-800 border-emerald-500 shadow-xs ring-1 ring-emerald-500'
                    : 'bg-white/60 text-slate-600 border-slate-200 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-slate-400 shadow-2xs"
                    style={{ backgroundColor: customColor }}
                  />
                  <span>Custom Hex Color</span>
                </div>
              </button>
            </div>

            {/* Custom Hex Color Input Row & Quick Picks */}
            {backdropPreset === 'custom' && (
              <div className="mt-2 p-2.5 bg-slate-100/80 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customColor}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setCustomColor(val);
                      setHexInputText(val);
                      setHexError(null);
                    }}
                    className="w-8 h-8 rounded-lg border border-slate-300 p-0.5 cursor-pointer flex-shrink-0 bg-white"
                    title="Choose custom color"
                  />
                  <div className="flex-1">
                    <input
                      type="text"
                      value={hexInputText}
                      maxLength={7}
                      placeholder="#D9EAD3"
                      onChange={(e) => {
                        const raw = e.target.value;
                        setHexInputText(raw);
                        const norm = normalizeHexColor(raw);
                        if (norm.valid) {
                          setCustomColor(norm.normalized);
                          setHexError(null);
                        } else {
                          setHexError('Must be 3 or 6 hex digits (e.g. #FF0000, #D9EAD3)');
                        }
                      }}
                      className={`w-full px-2.5 py-1 text-xs font-mono font-bold uppercase rounded-lg border bg-white focus:outline-none focus:ring-1 ${
                        hexError ? 'border-red-400 focus:ring-red-400 text-red-700' : 'border-slate-300 focus:ring-emerald-500 text-slate-800'
                      }`}
                    />
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-white border border-slate-200 text-slate-700">
                    {customColor}
                  </span>
                </div>

                {/* Quick Vibrant Color Picks (Red, Blue, Green, Sage) */}
                <div className="flex items-center gap-1 pt-1 border-t border-slate-200/80">
                  <span className="text-[10px] text-slate-500 font-semibold">Quick picks:</span>
                  {[
                    { label: 'Red', hex: '#FF0000' },
                    { label: 'Blue', hex: '#0000FF' },
                    { label: 'Green', hex: '#00FF00' },
                    { label: 'Sage', hex: '#D9EAD3' },
                  ].map((qp) => (
                    <button
                      key={qp.hex}
                      type="button"
                      onClick={() => {
                        setCustomColor(qp.hex);
                        setHexInputText(qp.hex);
                        setHexError(null);
                      }}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1"
                    >
                      <span className="w-2 h-2 rounded-full border border-slate-300" style={{ backgroundColor: qp.hex }} />
                      <span>{qp.label}</span>
                    </button>
                  ))}
                </div>

                {hexError && (
                  <p className="text-[10px] text-red-600 font-medium pl-1">{hexError}</p>
                )}
              </div>
            )}
          </div>

          {/* Contact Shadow Toggle */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-xs">
            <label className="text-slate-700 font-semibold cursor-pointer select-none flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={addContactShadow}
                onChange={(e) => setAddContactShadow(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>Ground Contact Shadow</span>
            </label>
            <span className="text-[10px] text-slate-400">Soft occlusion</span>
          </div>

          <div className="text-[11px] text-slate-600 space-y-1 pt-1 border-t border-slate-200/60">
            <div className="flex justify-between">
              <span className="text-slate-400">Selected Width:</span>
              <span className="font-bold">{Math.round(cropBox.width)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Selected Height:</span>
              <span className="font-bold">{Math.round(cropBox.height)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Net Rotation:</span>
              <span className="font-bold">{totalAngle}°</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Effective Zoom:</span>
              <span className="font-bold">{Math.round(zoom * 100)}%</span>
            </div>
          </div>

          {/* Reset Defaults Button */}
          <button
            type="button"
            onClick={handleReset}
            className="w-full py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset to Centered 1:1
          </button>
        </div>
      </div>

      {/* Footer Action Buttons */}
      <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>

          {onChooseAnotherPhoto && (
            <button
              type="button"
              data-testid="crop-choose-another-photo-btn"
              onClick={onChooseAnotherPhoto}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-2xs transition-colors flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5 text-slate-600" />
              Choose Another Photo
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleApply}
          className="px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/25 flex items-center gap-2 transition-all"
        >
          <Check className="w-4 h-4" />
          Apply Crop & Proceed to AI Edit
        </button>
      </div>
    </div>
  );
};
