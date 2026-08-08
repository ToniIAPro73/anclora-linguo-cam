import React from "react";

import { CallStatus, Language } from "../types";

interface QualityProfile {
  label: string;
  width: number;
  height: number;
  maxBitrate: number;
}

interface CallSetupProps {
  status: CallStatus;
  peerId: string;
  myLang: string;
  remoteLang: string;
  quality: string;
  targetPeerId: string;
  supportedLanguages: Language[];
  qualityProfiles: Record<string, QualityProfile>;
  onStartCall: () => void;
  onQualityChange: (quality: string) => void;
  onMyLangChange: (lang: string) => void;
  onRemoteLangChange: (lang: string) => void;
  onTargetPeerChange: (peerId: string) => void;
  onCopyPeerId: () => void;
  onCopyInviteLink: () => void;
  onRunPrecallCheck: () => void;
  isRunningPrecallCheck: boolean;
  preCallStatus: string;
  preCallError?: boolean;
  uiText: {
    title: string;
    subtitle: string;
    yourPeerId: string;
    iSpeak: string;
    theySpeak: string;
    callQuality: string;
    joinRoom: string;
    joinRoomPlaceholder: string;
    connecting: string;
    startCall: string;
    copyHint: string;
    copyInviteLink: string;
    runPrecheck: string;
    checkingPrecheck: string;
  };
}

const CallSetup: React.FC<CallSetupProps> = ({
  status,
  peerId,
  myLang,
  remoteLang,
  quality,
  targetPeerId,
  supportedLanguages,
  qualityProfiles,
  onStartCall,
  onQualityChange,
  onMyLangChange,
  onRemoteLangChange,
  onTargetPeerChange,
  onCopyPeerId,
  onCopyInviteLink,
  onRunPrecallCheck,
  isRunningPrecallCheck,
  preCallStatus,
  preCallError = false,
  uiText,
}) => {
  const isConnecting = status === CallStatus.CONNECTING;
  return (
    <div className="h-full min-h-0 bg-background px-3 sm:px-5 overflow-hidden">
      <div className="h-full min-h-0 flex items-center justify-center overflow-y-auto py-3 sm:py-4">
        <div className="w-full max-w-130 space-y-2 sm:space-y-3 max-[820px]:space-y-2 animate-in fade-in duration-700">
          <div
            data-testid="setup-card"
            className="glass-panel rounded-2xl sm:rounded-3xl p-4 max-[820px]:p-3 space-y-2 max-[820px]:space-y-2"
          >
            <div className="space-y-2 max-[820px]:space-y-1.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] sm:text-xs font-bold uppercase text-text-muted tracking-widest px-1">
                  {uiText.yourPeerId}
                </label>
                <div className="rounded-xl sm:rounded-2xl border border-border-default bg-elevated p-3 max-[820px]:p-2.5 flex justify-between items-center group">
                  <span className="text-lg sm:text-xl max-[820px]:text-base font-mono font-bold text-accent">
                    {peerId || "..."}
                  </span>
                  <button
                    onClick={onCopyPeerId}
                    aria-label="Copy Peer ID"
                    title="Copy Peer ID"
                    className="btn-ghost transition-colors"
                  >
                    <i className="fas fa-copy"></i>
                  </button>
                </div>
              </div>

              {/* Real Estate Quick Preset */}
              <div className="rounded-xl border border-accent/30 bg-accent-soft p-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base sm:text-lg">🏡</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-text-primary truncate">Reunión Inmobiliaria</p>
                    <p className="text-[10px] text-text-secondary truncate">Anclora Private Estates (Ruso 🇷🇺 ↔ Español 🇪🇸)</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (myLang === 'es' && remoteLang === 'ru') {
                      onMyLangChange('ru');
                      onRemoteLangChange('es');
                    } else {
                      onMyLangChange('es');
                      onRemoteLangChange('ru');
                    }
                  }}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap ${
                    (myLang === 'es' && remoteLang === 'ru') || (myLang === 'ru' && remoteLang === 'es')
                      ? 'bg-accent text-text-primary border-accent'
                      : 'bg-elevated border-border-default text-accent hover:border-accent'
                  }`}
                >
                  {(myLang === 'es' && remoteLang === 'ru') || (myLang === 'ru' && remoteLang === 'es')
                    ? '✓ Activo'
                    : 'Activar Preset'}
                </button>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-1.5 sm:gap-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] sm:text-xs font-bold uppercase text-text-muted px-1">
                    {uiText.iSpeak}
                  </label>
                  <select
                    value={myLang}
                    onChange={(e) => onMyLangChange(e.target.value)}
                    className="field-control rounded-lg sm:rounded-xl p-2.5 max-[820px]:p-2 text-xs sm:text-sm font-semibold"
                  >
                    {supportedLanguages
                      .filter((l) => l.code !== "auto")
                      .map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.name}
                        </option>
                      ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const temp = myLang;
                    onMyLangChange(remoteLang);
                    onRemoteLangChange(temp);
                  }}
                  className="btn-secondary p-2.5 max-[820px]:p-2 rounded-lg sm:rounded-xl text-text-secondary hover:text-accent transition-colors self-end mb-0.5"
                  title="Intercambiar idiomas"
                  aria-label="Intercambiar idiomas"
                >
                  <i className="fas fa-right-left text-xs sm:text-sm"></i>
                </button>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] sm:text-xs font-bold uppercase text-text-muted px-1">
                    {uiText.theySpeak}
                  </label>
                  <select
                    value={remoteLang}
                    onChange={(e) => onRemoteLangChange(e.target.value)}
                    className="field-control rounded-lg sm:rounded-xl p-2.5 max-[820px]:p-2 text-xs sm:text-sm font-semibold"
                  >
                    {supportedLanguages
                      .filter((l) => l.code !== "auto")
                      .map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] sm:text-xs font-bold uppercase text-text-muted px-1">
                  {uiText.callQuality}
                </label>
                <select
                  value={quality}
                  onChange={(e) => onQualityChange(e.target.value)}
                  className="field-control rounded-lg sm:rounded-xl p-2.5 max-[820px]:p-2 text-sm"
                >
                  {(
                    Object.entries(qualityProfiles) as Array<
                      [string, QualityProfile]
                    >
                  ).map(([key, profile]) => (
                    <option key={key} value={key}>
                      {profile.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="h-px bg-border-default my-1"></div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] sm:text-xs font-bold uppercase text-text-muted px-1">
                  {uiText.joinRoom}
                </label>
                <input
                  type="text"
                  placeholder={uiText.joinRoomPlaceholder}
                  value={targetPeerId}
                  onChange={(e) =>
                    onTargetPeerChange(e.target.value.toUpperCase())
                  }
                  className="field-control rounded-xl sm:rounded-2xl p-3 max-[820px]:p-2.5 text-lg sm:text-xl max-[820px]:text-base font-mono"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onCopyInviteLink}
                    className="btn-secondary flex-1 text-xs sm:text-sm py-2 rounded-lg"
                  >
                    {uiText.copyInviteLink}
                  </button>
                  <button
                    type="button"
                    onClick={onRunPrecallCheck}
                    className="btn-secondary flex-1 text-xs sm:text-sm py-2 rounded-lg"
                  >
                    {isRunningPrecallCheck
                      ? uiText.checkingPrecheck
                      : uiText.runPrecheck}
                  </button>
                </div>
                {preCallStatus ? (
                  <p className={`text-[11px] px-1 ${preCallError ? 'text-danger' : 'text-text-secondary'}`}>
                    {preCallStatus}
                  </p>
                ) : null}
              </div>
            </div>

            <button
              onClick={onStartCall}
              disabled={isConnecting}
              className="btn-primary w-full disabled:opacity-50 font-bold py-2.5 max-[820px]:py-2 rounded-xl sm:rounded-2xl transition-all flex items-center justify-center gap-2.5"
            >
              {isConnecting ? (
                <i className="fas fa-circle-notch animate-spin"></i>
              ) : (
                <i className="fas fa-phone"></i>
              )}
              {isConnecting ? uiText.connecting : uiText.startCall}
            </button>
          </div>

          <p className="hidden text-center text-text-muted text-[11px]">
            {uiText.copyHint}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CallSetup;
