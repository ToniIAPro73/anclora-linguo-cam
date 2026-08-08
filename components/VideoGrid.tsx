import React from "react";

export type CaptionSize = "sm" | "md" | "lg" | "xl";
export type CaptionPosition = "bottom" | "top";
export type CaptionContrast = "normal" | "high";

interface VideoGridProps {
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteSubtitleConfirmed: string;
  remoteSubtitleHypothesis: string;
  localSubtitleConfirmed: string;
  localSubtitleHypothesis: string;
  isScreenSharing: boolean;
  isPttPressed: boolean;
  isHandsFree: boolean;
  showHypothesis: boolean;
  captionSize: CaptionSize;
  captionPosition: CaptionPosition;
  captionContrast: CaptionContrast;
  lowBandwidthMode: boolean;
  myLang?: string;
  remoteLang?: string;
}

const LANG_FLAGS: Record<string, string> = {
  es: "🇪🇸",
  ru: "🇷🇺",
  en: "🇺🇸",
  fr: "🇫🇷",
  de: "🇩🇪",
  it: "🇮🇹",
  pt: "🇵🇹",
  zh: "🇨🇳",
  ja: "🇯🇵",
  ko: "🇰🇷",
};

const CAPTION_SIZE_CLASSES: Record<CaptionSize, string> = {
  sm: "text-base md:text-xl",
  md: "text-xl md:text-3xl",
  lg: "text-2xl md:text-4xl",
  xl: "text-3xl md:text-5xl",
};

const VideoGrid: React.FC<VideoGridProps> = ({
  remoteVideoRef,
  localVideoRef,
  remoteSubtitleConfirmed,
  remoteSubtitleHypothesis,
  localSubtitleConfirmed,
  localSubtitleHypothesis,
  isScreenSharing,
  isPttPressed,
  isHandsFree,
  showHypothesis,
  captionSize,
  captionPosition,
  captionContrast,
  lowBandwidthMode,
  myLang = "es",
  remoteLang = "ru",
}) => {
  const subtitleAreaStyle: React.CSSProperties =
    captionPosition === "top" ? { bottom: "auto", top: "2rem" } : {};

  const captionSizeClass = CAPTION_SIZE_CLASSES[captionSize];
  const subtitleBubbleClass =
    captionContrast === "high"
      ? "subtitle-bubble subtitle-high-contrast"
      : "subtitle-bubble";

  const remoteDirectionLabel = `${LANG_FLAGS[remoteLang] || remoteLang.toUpperCase()} → ${LANG_FLAGS[myLang] || myLang.toUpperCase()}`;
  const localDirectionLabel = `${LANG_FLAGS[myLang] || myLang.toUpperCase()} → ${LANG_FLAGS[remoteLang] || remoteLang.toUpperCase()}`;

  return (
    <div className="video-grid">
      <div className="video-box group">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <div className="surface-chip px-3 py-1 rounded-lg text-xs font-bold">
            Remote Participant
          </div>
          {lowBandwidthMode && (
            <div className="status-warning px-2 py-0.5 rounded text-[10px] font-bold">
              Low BW
            </div>
          )}
        </div>

        {(remoteSubtitleConfirmed || remoteSubtitleHypothesis) && (
          <div
            className="subtitle-area"
            style={subtitleAreaStyle}
            role="status"
            aria-live="polite"
            aria-label="Remote participant captions"
          >
            <div className={subtitleBubbleClass}>
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-accent/20 border border-accent/40 text-accent">
                  {remoteDirectionLabel}
                </span>
              </div>
              <p
                className={`${captionSizeClass} font-bold text-text-primary tracking-wide text-center leading-tight`}
              >
                <span>{remoteSubtitleConfirmed}</span>
                {showHypothesis && remoteSubtitleHypothesis ? (
                  <span className="opacity-60 ml-2">
                    {remoteSubtitleHypothesis}
                  </span>
                ) : null}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="video-box video-box-active">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className={`w-full h-full object-cover ${!isScreenSharing ? "scale-x-[-1]" : ""}`}
        />
        <div className="surface-chip absolute top-4 left-4 px-3 py-1 rounded-lg text-xs font-bold">
          {isScreenSharing ? "Sharing Screen" : "You (Host)"}
        </div>

        {(localSubtitleConfirmed || localSubtitleHypothesis) && (
          <div
            className="subtitle-area"
            style={subtitleAreaStyle}
            role="status"
            aria-live="polite"
            aria-label="Your captions"
          >
            <div
              className={`${subtitleBubbleClass} opacity-75 scale-95`}
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-accent/20 border border-accent/40 text-accent">
                  {localDirectionLabel}
                </span>
              </div>
              <p
                className={`${captionSizeClass} font-bold text-text-primary tracking-wide text-center`}
              >
                <span>{localSubtitleConfirmed}</span>
                {showHypothesis && localSubtitleHypothesis ? (
                  <span className="opacity-60 ml-2">
                    {localSubtitleHypothesis}
                  </span>
                ) : null}
              </p>
            </div>
          </div>
        )}

        {(isPttPressed || isHandsFree) && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            <div
              className={`w-20 h-20 bg-accent-soft rounded-full flex items-center justify-center animate-ping absolute ${isHandsFree ? "duration-2000" : ""}`}
            ></div>
            <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center z-10 shadow-2xl">
              <i
                className="fas fa-microphone text-text-on-accent text-2xl"
                aria-hidden="true"
              ></i>
            </div>
            <p className="text-accent text-xs font-bold uppercase tracking-[0.2em] mt-4 z-10">
              {isHandsFree ? "Auto-Translate ON" : "Listening..."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoGrid;
