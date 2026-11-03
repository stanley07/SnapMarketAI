'use client';

import React, { useState } from 'react';
import { Sparkles, Check, RotateCcw, SplitSquareHorizontal, Layers, ShieldCheck, Crop, AlertTriangle, Palette, Camera } from 'lucide-react';
import { StudioBackdropPreset } from '@/types/ai';
import { normalizeHexColor } from '@/lib/ai/studio-compositor';

interface BeforeAfterComparisonProps {
  originalImage: string;
  editedImage: string;
  transparentCutoutUrl?: string;
  appliedOperations: string[];
  fidelityNotice?: string;
  segmentationSuccess?: boolean;
  errorMessage?: string;
  currentBackdropPreset?: StudioBackdropPreset;
  currentCustomColor?: string;
  currentAddShadow?: boolean;
  onChangeBackdrop?: (
    preset: StudioBackdropPreset,
    customColor?: string,
    addContactShadow?: boolean
  ) => void;
  onAccept: () => void;
  onRestoreOriginal: () => void;
  onRetry: () => void;
  onChooseAnotherPhoto?: () => void;
}

export const BeforeAfterComparison: React.FC<BeforeAfterComparisonProps> = ({
  originalImage,
  editedImage,
  transparentCutoutUrl,
  appliedOperations,
  fidelityNotice = 'Original product geometry & branding preserved with calibrated studio lighting.',
  segmentationSuccess = true,
  errorMessage,
  currentBackdropPreset = 'pure_white',
  currentCustomColor = '#D9EAD3',
  currentAddShadow = true,
  onChangeBackdrop,
  onAccept,
  onRestoreOriginal,
  onRetry,
  onChooseAnotherPhoto,
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [viewMode, setViewMode] = useState<'slider' | 'side-by-side' | 'cutout'>('slider');

  // Backdrop selection state
  const [selectedPreset, setSelectedPreset] = useState<StudioBackdropPreset>(currentBackdropPreset);
  const [customColor, setCustomColor] = useState<string>(currentCustomColor);
  const [hexInputText, setHexInputText] = useState<string>(currentCustomColor);
  const [hexError, setHexError] = useState<string | null>(null);
  const [addShadow, setAddShadow] = useState<boolean>(currentAddShadow);

  const [statusText, setStatusText] = useState<'Product isolated' | 'Background updated'>('Product isolated');

  const handleSelectPreset = (preset: StudioBackdropPreset) => {
    setSelectedPreset(preset);
    setStatusText('Background updated');
    if (onChangeBackdrop) {
      const norm = normalizeHexColor(customColor);
      onChangeBackdrop(preset, norm.valid ? norm.normalized : '#D9EAD3', addShadow);
    }
  };

  const handleCustomColorChange = (newHex: string) => {
    const norm = normalizeHexColor(newHex);
    if (norm.valid) {
      setCustomColor(norm.normalized);
      setHexError(null);
      setStatusText('Background updated');
      if (selectedPreset === 'custom' && onChangeBackdrop) {
        onChangeBackdrop('custom', norm.normalized, addShadow);
      }
    } else {
      setHexError('Must be 3 or 6 hex characters (e.g. #D9EAD3, #FF0000)');
    }
  };

  const handleToggleShadow = (checked: boolean) => {
    setAddShadow(checked);
    setStatusText('Background updated');
    if (onChangeBackdrop) {
      const norm = normalizeHexColor(customColor);
      onChangeBackdrop(selectedPreset, norm.valid ? norm.normalized : '#D9EAD3', checked);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-sm">
      
      {/* Header with View Mode Toggle & Clear Status Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              AI Image Enhancement Review
            </span>
            {segmentationSuccess && transparentCutoutUrl ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                {statusText}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300 shadow-2xs">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                Product isolation failed
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold text-slate-900">Before & After Product Review</h3>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('slider')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'slider'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <SplitSquareHorizontal className="w-3.5 h-3.5" />
            Slider
          </button>
          <button
            type="button"
            onClick={() => setViewMode('side-by-side')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'side-by-side'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Side by Side
          </button>
          {transparentCutoutUrl && (
            <button
              type="button"
              onClick={() => setViewMode('cutout')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'cutout'
                  ? 'bg-white text-emerald-800 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Crop className="w-3.5 h-3.5 text-emerald-600" />
              Alpha Cutout
            </button>
          )}
        </div>
      </div>

      {/* Honest Failure Notice if Product Isolation Failed */}
      {!segmentationSuccess && (
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-300 text-amber-900 text-xs space-y-1.5 shadow-2xs">
          <div className="font-extrabold flex items-center gap-2 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            AI Product Isolation Incomplete
          </div>
          <p className="font-medium text-amber-800 leading-relaxed">
            {errorMessage || 'The AI could not reliably isolate the product from the person or background. The original unedited photograph is retained without artificial borders.'}
          </p>
          <p className="text-[11px] text-amber-700">
            Click <strong>&quot;Adjust Crop &amp; Try Again&quot;</strong> below to frame the product more tightly, or proceed with the original photo.
          </p>
        </div>
      )}

      {/* Comparison Visual Area */}
      {viewMode === 'slider' ? (
        <div className="space-y-3">
          <div className="relative aspect-square max-w-lg mx-auto rounded-2xl overflow-hidden select-none border border-slate-200 bg-slate-100 shadow-inner">
            
            {/* Background: Edited Image */}
            <img
              src={editedImage}
              alt={segmentationSuccess ? 'Enhanced Studio Version' : 'Original Photo'}
              className="absolute inset-0 w-full h-full object-contain"
            />
            <span className={`absolute bottom-3 right-3 px-2.5 py-1 rounded-lg text-xs font-bold text-white shadow-md z-10 ${
              segmentationSuccess ? 'bg-emerald-600' : 'bg-amber-700'
            }`}>
              {segmentationSuccess ? '✨ Enhanced Studio' : '⚠️ Unsegmented Photo'}
            </span>

            {/* Foreground: Original Image (Clipped by slider) */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${sliderPosition}%` }}
            >
              <img
                src={originalImage}
                alt="Original Raw Photograph"
                className="absolute inset-0 w-full h-full object-contain max-w-none"
                style={{ width: '100%', height: '100%' }}
              />
              <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-900/80 text-white shadow-md z-10">
                📷 Original Raw
              </span>
            </div>

            {/* Vertical Divider Line */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-lg pointer-events-none"
              style={{ left: `${sliderPosition}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-xl border-2 border-emerald-500 flex items-center justify-center text-[10px] font-bold text-slate-800">
                ⇄
              </div>
            </div>
          </div>

          {/* Slider Controller */}
          <div className="max-w-lg mx-auto space-y-1">
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPosition}
              onChange={(e) => setSliderPosition(Number(e.target.value))}
              className="w-full accent-emerald-600 cursor-ew-resize"
              aria-label="Before after comparison slider"
            />
            <div className="flex justify-between text-[11px] text-slate-500 font-medium">
              <span>&larr; Drag left for Studio</span>
              <span>Drag right for Raw Shelf &rarr;</span>
            </div>
          </div>
        </div>
      ) : viewMode === 'side-by-side' ? (
        /* Side by Side View */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          <div className="space-y-2">
            <div className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
              <img src={originalImage} alt="Original" className="w-full h-full object-contain" />
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-900/80 text-white">
                Raw Shelf Photo
              </span>
            </div>
            <p className="text-center text-xs text-slate-500 font-medium">Original Capture</p>
          </div>

          <div className="space-y-2">
            <div className="relative aspect-square rounded-2xl overflow-hidden border border-emerald-300 bg-slate-50 shadow-sm">
              <img src={editedImage} alt="Enhanced" className="w-full h-full object-contain" />
              <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white shadow-sm">
                ✨ Enhanced Listing
              </span>
            </div>
            <p className="text-center text-xs text-emerald-700 font-medium">Studio Enhanced</p>
          </div>
        </div>
      ) : (
        /* Isolated Alpha Cutout View (Checkerboard Transparency) */
        <div className="max-w-md mx-auto space-y-2">
          <div
            className="relative aspect-square rounded-2xl overflow-hidden border border-slate-300 shadow-inner p-4 flex items-center justify-center"
            style={{
              backgroundColor: '#ffffff',
              backgroundImage: 'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
            }}
          >
            <img
              src={transparentCutoutUrl || editedImage}
              alt="Isolated Alpha Cutout"
              className="w-full h-full object-contain filter drop-shadow-md"
            />
            <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-900/90 text-emerald-400 border border-slate-700 shadow-md">
              ✓ True Alpha Channel Mask
            </span>
          </div>
          <p className="text-center text-xs text-slate-500 font-medium">
            Foreground product isolated with transparent background.
          </p>
        </div>
      )}

      {/* Interactive Studio Backdrop Switcher (Instant Re-compositing without AI calls) */}
      {segmentationSuccess && transparentCutoutUrl && (
        <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/90 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                <Palette className="w-3.5 h-3.5 text-emerald-600" />
                Studio Backdrop Palette
              </span>
              <p className="text-xs text-slate-600 font-medium">
                Change backdrop color instantly — reuses the exact same isolated product cutout without generative re-rendering.
              </p>
            </div>
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={addShadow}
                onChange={(e) => handleToggleShadow(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>Ground Shadow</span>
            </label>
          </div>

          {/* Active Live Swatch & Exact Hex Indicator */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-white rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Active Backdrop:</span>
              <span
                className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs flex-shrink-0"
                style={{
                  backgroundColor:
                    selectedPreset === 'transparent'
                      ? 'transparent'
                      : selectedPreset === 'pure_white'
                      ? '#FFFFFF'
                      : selectedPreset === 'soft_gray'
                      ? '#E5E7EB'
                      : selectedPreset === 'warm_neutral'
                      ? '#F5EBDD'
                      : customColor,
                  ...(selectedPreset === 'transparent'
                    ? {
                        backgroundImage:
                          'linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)',
                        backgroundSize: '4px 4px',
                      }
                    : {}),
                }}
              />
              <span className="text-xs font-mono font-bold text-slate-900">
                {selectedPreset === 'pure_white' && '#FFFFFF (Pure White)'}
                {selectedPreset === 'soft_gray' && '#E5E7EB (Soft Light Gray)'}
                {selectedPreset === 'warm_neutral' && '#F5EBDD (Warm Neutral)'}
                {selectedPreset === 'custom' && `${customColor} (Custom Hex)`}
                {selectedPreset === 'transparent' && 'Transparent (Alpha Channel)'}
              </span>
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
              <Check className="w-3 h-3" />
              Lossless PNG • Exact Solid Color
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {/* Pure White */}
            <button
              type="button"
              onClick={() => handleSelectPreset('pure_white')}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                selectedPreset === 'pure_white'
                  ? 'bg-white text-emerald-800 border-emerald-500 shadow-xs ring-2 ring-emerald-500/30'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white border border-slate-300 shadow-2xs flex-shrink-0" />
              <span>Pure White</span>
            </button>

            {/* Soft Light Gray */}
            <button
              type="button"
              onClick={() => handleSelectPreset('soft_gray')}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                selectedPreset === 'soft_gray'
                  ? 'bg-white text-emerald-800 border-emerald-500 shadow-xs ring-2 ring-emerald-500/30'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-[#E5E7EB] border border-slate-300 shadow-2xs flex-shrink-0" />
              <span>Soft Light Gray</span>
            </button>

            {/* Warm Neutral */}
            <button
              type="button"
              onClick={() => handleSelectPreset('warm_neutral')}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                selectedPreset === 'warm_neutral'
                  ? 'bg-white text-emerald-800 border-emerald-500 shadow-xs ring-2 ring-emerald-500/30'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-[#F5EBDD] border border-stone-300 shadow-2xs flex-shrink-0" />
              <span>Warm Neutral</span>
            </button>

            {/* Custom Hex */}
            <button
              type="button"
              onClick={() => handleSelectPreset('custom')}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                selectedPreset === 'custom'
                  ? 'bg-white text-emerald-800 border-emerald-500 shadow-xs ring-2 ring-emerald-500/30'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <span
                className="w-4 h-4 rounded-full border border-slate-400 shadow-2xs flex-shrink-0"
                style={{ backgroundColor: customColor }}
              />
              <span>Custom Hex</span>
            </button>

            {/* Transparent */}
            <button
              type="button"
              onClick={() => handleSelectPreset('transparent')}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                selectedPreset === 'transparent'
                  ? 'bg-white text-emerald-800 border-emerald-500 shadow-xs ring-2 ring-emerald-500/30'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <span
                className="w-4 h-4 rounded-full border border-slate-300 flex-shrink-0"
                style={{
                  backgroundImage: 'linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)',
                  backgroundSize: '6px 6px',
                }}
              />
              <span>Transparent</span>
            </button>
          </div>

          {/* Custom Hex Color Picker, Validated Text Input & Quick Picks */}
          {selectedPreset === 'custom' && (
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setCustomColor(val);
                    setHexInputText(val);
                    handleCustomColorChange(val);
                  }}
                  className="w-9 h-9 rounded-lg border border-slate-300 p-0.5 cursor-pointer bg-white"
                  title="Open native color picker"
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">Hex Code:</span>
                  <input
                    type="text"
                    value={hexInputText}
                    maxLength={7}
                    placeholder="#D9EAD3"
                    onChange={(e) => {
                      const raw = e.target.value;
                      setHexInputText(raw);
                      handleCustomColorChange(raw);
                    }}
                    className={`w-28 px-2.5 py-1.5 text-xs font-mono font-bold uppercase rounded-lg border ${
                      hexError ? 'border-red-400 focus:ring-red-400 text-red-700' : 'border-slate-300 focus:ring-emerald-500 text-slate-800'
                    }`}
                  />
                  <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-slate-100 text-slate-700">
                    {customColor}
                  </span>
                </div>

                {/* Quick Vibrant Color Picks (Red, Blue, Green, Sage) */}
                <div className="flex items-center gap-1.5 pl-2 sm:border-l border-slate-200">
                  <span className="text-[11px] text-slate-500 font-semibold">Test Colors:</span>
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
                        handleCustomColorChange(qp.hex);
                      }}
                      className="px-2 py-1 rounded-md text-[11px] font-mono font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center gap-1 transition-colors"
                    >
                      <span className="w-2.5 h-2.5 rounded-full border border-slate-300 shadow-2xs" style={{ backgroundColor: qp.hex }} />
                      <span>{qp.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {hexError && <p className="text-xs text-red-600 font-medium">{hexError}</p>}
            </div>
          )}
        </div>
      )}

      {/* Applied Operations Log & Fidelity Assurance */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Verified Processing Operations:
          </h4>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-600">
            {appliedOperations.map((op, i) => (
              <li key={i} className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>{op}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-2 border-t border-slate-200 flex items-center gap-2 text-xs text-slate-500 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{fidelityNotice}</span>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRestoreOriginal}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Use Original Image
          </button>
          <button
            type="button"
            onClick={onRetry}
            className="px-4 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-1.5"
          >
            <Crop className="w-3.5 h-3.5 text-emerald-600" />
            Adjust Crop & Try Again
          </button>
          {onChooseAnotherPhoto && (
            <button
              type="button"
              data-testid="review-choose-another-photo-btn"
              onClick={onChooseAnotherPhoto}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-2xs transition-colors flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5 text-slate-600" />
              Choose Another Photo
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onAccept}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm flex items-center gap-2 transition-all ${
            segmentationSuccess
              ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
              : 'bg-slate-800 hover:bg-slate-900 shadow-slate-800/20'
          }`}
        >
          <Check className="w-4 h-4" />
          {segmentationSuccess ? 'Accept Enhanced Image & Continue' : 'Continue with Original Photo'}
        </button>
      </div>

    </div>
  );
};
