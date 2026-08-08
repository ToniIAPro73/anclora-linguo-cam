import React from "react";

interface ControlBarProps {
  isHandsFree: boolean;
  isPttPressed: boolean;
  isMuted: boolean;
  remoteVolume: number;
  isScreenSharing: boolean;
  isRecording: boolean;
  showSettings: boolean;
  isChatOpen: boolean;
  hasUnreadPeerMessages: boolean;
  myLangName: string;
  remoteLangName: string;
  onToggleHandsFree: () => void;
  onPttDown: () => void;
  onPttUp: () => void;
  onToggleMute: () => void;
  onRemoteVolumeChange: (value: number) => void;
  onToggleScreenShare: () => void;
  onToggleRecording: () => void;
  onShowSettings: () => void;
  onEndCall: () => void;
  onToggleChat: () => void;
}

const ControlBar: React.FC<ControlBarProps> = ({
  isHandsFree,
  isPttPressed,
  isMuted,
  remoteVolume,
  isScreenSharing,
  isRecording,
  showSettings,
  isChatOpen,
  hasUnreadPeerMessages,
  myLangName,
  remoteLangName,
  onToggleHandsFree,
  onPttDown,
  onPttUp,
  onToggleMute,
  onRemoteVolumeChange,
  onToggleScreenShare,
  onToggleRecording,
  onShowSettings,
  onEndCall,
  onToggleChat,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 h-24 md:h-28 glass-panel flex items-center justify-center gap-2 md:gap-5 px-3 md:px-12 rounded-t-4xl md:rounded-t-12 pb-[max(env(safe-area-inset-bottom),0.25rem)]">
      <div className="flex flex-col items-center">
        <button
          onClick={onToggleHandsFree}
          className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${isHandsFree ? "bg-success text-text-on-accent ring-4 ring-success/20" : "bg-elevated text-text-secondary hover:bg-hover"}`}
          title={
            isHandsFree
              ? "Disable Auto-Translate"
              : "Enable Auto-Translate (Continuous)"
          }
        >
          <i
            className={`fas ${isHandsFree ? "fa-magic animate-pulse" : "fa-headset"}`}
          ></i>
        </button>
        <span className="text-[9px] font-bold text-text-muted mt-1 uppercase tracking-tighter">
          {isHandsFree ? "LIVE" : "AUTO"}
        </span>
      </div>

      {!isHandsFree && (
        <div className="flex flex-col items-center">
          <button
            onMouseDown={onPttDown}
            onMouseUp={onPttUp}
            onMouseLeave={onPttUp}
            onTouchStart={onPttDown}
            onTouchEnd={onPttUp}
            className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all select-none touch-none ${isPttPressed ? "bg-accent scale-90 shadow-inner" : "bg-elevated hover:bg-hover shadow-lg"}`}
            title="Hold to Speak"
          >
            <i
              className={`fas fa-microphone ${isPttPressed ? "text-text-on-accent" : "text-text-secondary"}`}
            ></i>
          </button>
          <span className="text-[9px] font-bold text-text-muted mt-1 uppercase tracking-tighter">
            PTT
          </span>
        </div>
      )}

      <div className="flex items-center gap-2 bg-elevated px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-border-subtle group">
        <button
          onClick={onToggleMute}
          aria-label={isMuted || remoteVolume === 0 ? "Unmute remote audio" : "Mute remote audio"}
          className={`text-sm md:text-base ${isMuted || remoteVolume === 0 ? "text-danger" : "text-text-secondary hover:text-text-primary"}`}
        >
          <i
            className={`fas ${isMuted || remoteVolume === 0 ? "fa-volume-mute" : remoteVolume < 0.5 ? "fa-volume-down" : "fa-volume-up"}`}
          ></i>
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={isMuted ? 0 : remoteVolume}
          onChange={(e) => onRemoteVolumeChange(parseFloat(e.target.value))}
          className="w-16 md:w-24 h-1 bg-border-default rounded-lg appearance-none cursor-pointer accent-accent"
        />
      </div>

      <button
        onClick={onToggleScreenShare}
        className={`w-10 h-10 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all ${isScreenSharing ? "bg-accent text-text-on-accent" : "bg-elevated text-text-primary hover:bg-hover"}`}
        title="Share Screen"
      >
        <i
          className={`fas ${isScreenSharing ? "fa-desktop" : "fa-laptop-code"}`}
        ></i>
      </button>

      <button
        onClick={onToggleRecording}
        className={`w-10 h-10 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all ${isRecording ? "bg-danger text-text-on-accent animate-pulse" : "bg-elevated text-text-primary hover:bg-hover"}`}
        title={isRecording ? "Stop Recording" : "Start Recording"}
      >
        <i
          className={`fas ${isRecording ? "fa-stop-circle" : "fa-record-vinyl"}`}
        ></i>
      </button>

      <button
        onClick={onShowSettings}
        className={`w-10 h-10 md:w-14 md:h-14 rounded-full bg-elevated text-text-primary hover:bg-hover flex items-center justify-center transition-all ${showSettings ? "text-accent" : ""}`}
        title="Settings"
      >
        <i className="fas fa-cog"></i>
      </button>

      <button
        onClick={onEndCall}
        aria-label="End call"
        title="End call"
        className="btn-danger w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all transform hover:scale-110 mx-1"
      >
        <i className="fas fa-phone-slash text-base md:text-xl"></i>
      </button>

      <button
        onClick={onToggleChat}
        className={`w-10 h-10 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all relative ${isChatOpen ? "bg-accent text-text-on-accent" : "bg-elevated text-text-primary hover:bg-hover"}`}
        title="Chat"
      >
        <i className="fas fa-comment-alt"></i>
        {!isChatOpen && hasUnreadPeerMessages && (
          <span className="absolute top-0 right-0 w-3 h-3 bg-accent border-2 border-background rounded-full animate-pulse"></span>
        )}
      </button>

      <div className="hidden lg:flex h-8 w-px bg-border-default mx-2"></div>
      <div className="hidden lg:flex flex-col items-center">
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-tighter mb-1">
          Translating
        </span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-accent">{myLangName}</span>
          <i className="fas fa-exchange-alt text-[10px] text-text-muted"></i>
          <span className="text-sm font-bold text-text-primary">{remoteLangName}</span>
        </div>
      </div>
    </div>
  );
};

export default ControlBar;
