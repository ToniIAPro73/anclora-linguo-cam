import React from 'react';
import { AncloraMark } from './AncloraMark';

interface CallHeaderProps {
  peerId: string;
  qualityLabel: string;
  isRecording: boolean;
  peerConnectionState: 'connected' | 'reconnecting' | 'down';
  showDiagnostics: boolean;
  e2eeState: 'off' | 'enabled' | 'unsupported' | 'error';
}

const CallHeader: React.FC<CallHeaderProps> = ({
  peerId,
  qualityLabel,
  isRecording,
  peerConnectionState,
  showDiagnostics,
  e2eeState,
}) => {
  const peerStateColor =
    peerConnectionState === 'connected'
      ? 'status-success'
      : peerConnectionState === 'reconnecting'
        ? 'status-warning'
        : 'status-danger';

  return (
    <>
      <div className="glass-panel absolute top-4 left-4 md:top-6 md:left-6 z-50 flex items-center gap-3 p-2 rounded-2xl">
        <AncloraMark className="w-9 h-9 md:w-10 md:h-10 rounded-xl" />
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary">Session ID</h2>
          <p className="font-mono font-bold text-text-primary">{peerId}</p>
        </div>
      </div>

      <div className="absolute top-4 right-4 md:top-6 md:right-6 z-50 flex flex-col items-end gap-2">
        <div className="status-success hidden lg:flex px-4 py-2 rounded-full text-[10px] font-bold tracking-widest items-center gap-2 border">
          <span className="w-1.5 h-1.5 bg-current rounded-full animate-pulse"></span>
          {qualityLabel} QUALITY
        </div>
        <div className={`px-3 md:px-4 py-2 rounded-full text-[10px] font-bold tracking-widest flex items-center gap-2 border ${peerStateColor}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
          SIGNAL {peerConnectionState.toUpperCase()}
        </div>
        {showDiagnostics ? (
          <div className="status-pill hidden md:flex px-4 py-2 rounded-full text-[10px] font-bold tracking-widest items-center gap-2 border">
            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
            E2EE {e2eeState.toUpperCase()}
          </div>
        ) : null}
        {isRecording && (
          <div className="status-danger px-4 py-2 rounded-full text-[10px] font-bold tracking-widest flex items-center gap-2 animate-pulse">
            <span className="w-1.5 h-1.5 bg-current rounded-full"></span>
            REC RECORDING CALL
          </div>
        )}
      </div>
    </>
  );
};

export default CallHeader;
