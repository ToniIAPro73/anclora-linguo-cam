import React from "react";
import type { CaptionSize, CaptionPosition, CaptionContrast } from "./VideoGrid";

interface QualityProfile {
  label: string;
  width: number;
  height: number;
  maxBitrate: number;
}

interface SettingsModalProps {
  show: boolean;
  quality: string;
  showHypothesis: boolean;
  qualityProfiles: Record<string, QualityProfile>;
  onSelectQuality: (quality: string) => void;
  onToggleHypothesis: () => void;
  onClose: () => void;
  lowBandwidthMode: boolean;
  onToggleLowBandwidth: () => void;
  captionSize: CaptionSize;
  captionPosition: CaptionPosition;
  captionContrast: CaptionContrast;
  onCaptionSizeChange: (size: CaptionSize) => void;
  onCaptionPositionChange: (pos: CaptionPosition) => void;
  onCaptionContrastChange: (contrast: CaptionContrast) => void;
}

const Toggle: React.FC<{
  checked: boolean;
  onChange: () => void;
  label: string;
}> = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={onChange}
    className={`w-14 h-8 rounded-full p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
      checked ? "bg-accent" : "bg-elevated"
    }`}
  >
    <span
      className={`block h-6 w-6 rounded-full bg-text-on-accent transition-transform ${
        checked ? "translate-x-6" : "translate-x-0"
      }`}
    />
  </button>
);

const SettingsModal: React.FC<SettingsModalProps> = ({
  show,
  quality,
  showHypothesis,
  qualityProfiles,
  onSelectQuality,
  onToggleHypothesis,
  onClose,
  lowBandwidthMode,
  onToggleLowBandwidth,
  captionSize,
  captionPosition,
  captionContrast,
  onCaptionSizeChange,
  onCaptionPositionChange,
  onCaptionContrastChange,
}) => {
  if (!show) return null;

  return (
    <div
      className="absolute inset-0 z-100 flex items-center justify-center bg-background/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Call Settings"
    >
      <div className="glass-panel w-full max-w-sm rounded-3xl p-6 space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-lg text-text-primary">Call Settings</h3>
          <button
            onClick={onClose}
            className="btn-ghost focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg p-1"
            aria-label="Close settings"
          >
            <i className="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>

        <div className="space-y-5">
          {/* Video Quality */}
          <section className="space-y-2">
            <h4 className="text-xs font-bold uppercase text-text-muted">
              Video Quality &amp; Bandwidth
            </h4>
            <div className="grid grid-cols-1 gap-2">
              {(
                Object.entries(qualityProfiles) as Array<
                  [string, QualityProfile]
                >
              ).map(([key, profile]) => (
                <button
                  key={key}
                  onClick={() => onSelectQuality(key)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    quality === key
                      ? "bg-accent-soft border-accent text-accent"
                      : "bg-elevated border-border-default text-text-secondary hover:bg-hover"
                  }`}
                >
                  <span className="font-semibold">{profile.label}</span>
                  <span className="text-[10px] opacity-70">
                    Up to {profile.maxBitrate / 1_000_000}Mbps
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Low Bandwidth Mode */}
          <section>
            <div className="flex items-center justify-between rounded-xl border border-border-default bg-elevated px-4 py-3">
              <div className="space-y-0.5">
                <p className="text-xs font-bold uppercase text-text-secondary">
                  Low Bandwidth Mode
                </p>
                <p className="text-xs text-text-muted">
                  Drops video; keeps audio &amp; subtitles
                </p>
              </div>
              <Toggle
                checked={lowBandwidthMode}
                onChange={onToggleLowBandwidth}
                label="Toggle low bandwidth mode"
              />
            </div>
          </section>

          {/* Caption Preview toggle */}
          <section>
            <div className="flex items-center justify-between rounded-xl border border-border-default bg-elevated px-4 py-3">
              <div className="space-y-0.5">
                <p className="text-xs font-bold uppercase text-text-secondary">
                  Caption Preview
                </p>
                <p className="text-xs text-text-muted">
                  Show provisional hypothesis text
                </p>
              </div>
              <Toggle
                checked={showHypothesis}
                onChange={onToggleHypothesis}
                label="Toggle caption preview"
              />
            </div>
          </section>

          {/* Caption Accessibility */}
          <section className="space-y-2">
            <h4 className="text-xs font-bold uppercase text-text-muted">
              Caption Accessibility
            </h4>

            {/* Size */}
            <div className="rounded-xl border border-border-default bg-elevated px-4 py-3 space-y-2">
              <p className="text-xs font-bold uppercase text-text-secondary">
                Caption Size
              </p>
              <div
                className="grid grid-cols-4 gap-1"
                role="group"
                aria-label="Caption size"
              >
                {(
                  [
                    ["sm", "S"],
                    ["md", "M"],
                    ["lg", "L"],
                    ["xl", "XL"],
                  ] as [CaptionSize, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => onCaptionSizeChange(key)}
                    aria-pressed={captionSize === key}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      captionSize === key
                        ? "bg-accent text-text-on-accent"
                        : "bg-surface text-text-secondary hover:bg-hover"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Position */}
            <div className="rounded-xl border border-border-default bg-elevated px-4 py-3 space-y-2">
              <p className="text-xs font-bold uppercase text-text-secondary">
                Caption Position
              </p>
              <div
                className="grid grid-cols-2 gap-1"
                role="group"
                aria-label="Caption position"
              >
                {(
                  [
                    ["bottom", "Bottom"],
                    ["top", "Top"],
                  ] as [CaptionPosition, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => onCaptionPositionChange(key)}
                    aria-pressed={captionPosition === key}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      captionPosition === key
                        ? "bg-accent text-text-on-accent"
                        : "bg-surface text-text-secondary hover:bg-hover"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Contrast */}
            <div className="rounded-xl border border-border-default bg-elevated px-4 py-3 space-y-2">
              <p className="text-xs font-bold uppercase text-text-secondary">
                Caption Contrast
              </p>
              <div
                className="grid grid-cols-2 gap-1"
                role="group"
                aria-label="Caption contrast"
              >
                {(
                  [
                    ["normal", "Normal"],
                    ["high", "High"],
                  ] as [CaptionContrast, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => onCaptionContrastChange(key)}
                    aria-pressed={captionContrast === key}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      captionContrast === key
                        ? "bg-accent text-text-on-accent"
                        : "bg-surface text-text-secondary hover:bg-hover"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        <button
          onClick={onClose}
          className="btn-primary w-full font-bold py-3 rounded-2xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default SettingsModal;
