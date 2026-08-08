export interface InboundStatsCache {
  timestampMs: number;
  bytesReceived: number;
}

export interface WebRtcInboundSnapshot {
  bitrateKbps: number | null;
  packetLossPct: number | null;
  rttMs: number | null;
  jitterMs: number | null;
  quality: WebRtcQuality;
  cache: InboundStatsCache | null;
}

export type WebRtcQuality = 'good' | 'medium' | 'bad' | 'unknown';

export interface WebRtcQualityInputs {
  packetLossPct: number | null;
  rttMs: number | null;
  jitterMs: number | null;
}

export function classifyWebRtcQuality({
  packetLossPct,
  rttMs,
  jitterMs,
}: WebRtcQualityInputs): WebRtcQuality {
  if (packetLossPct === null && rttMs === null && jitterMs === null) return 'unknown';
  const loss = packetLossPct ?? 0;
  const rtt = rttMs ?? 0;
  const jitter = jitterMs ?? 0;
  if (loss >= 8 || rtt >= 500 || jitter >= 90) return 'bad';
  if (loss >= 3 || rtt >= 250 || jitter >= 40) return 'medium';
  return 'good';
}

export function computeInboundStats(
  report: RTCStatsReport,
  prevCache: InboundStatsCache | null,
  nowMs = Date.now(),
): WebRtcInboundSnapshot {
  let bytesReceived = 0;
  let packetsLost = 0;
  let packetsReceived = 0;
  let rttMs: number | null = null;
  let jitterMs: number | null = null;

  report.forEach((stat) => {
    if (stat.type === 'inbound-rtp' && !stat.isRemote) {
      if (typeof stat.bytesReceived === 'number') {
        bytesReceived += stat.bytesReceived;
      }
      if (typeof stat.packetsLost === 'number') {
        packetsLost += stat.packetsLost;
      }
      if (typeof stat.packetsReceived === 'number') {
        packetsReceived += stat.packetsReceived;
      }
      if (typeof stat.jitter === 'number') {
        const jitterSampleMs = Math.round(stat.jitter * 1000);
        jitterMs = jitterMs === null ? jitterSampleMs : Math.max(jitterMs, jitterSampleMs);
      }
    }
    if (stat.type === 'candidate-pair' && stat.state === 'succeeded' && stat.nominated) {
      if (typeof stat.currentRoundTripTime === 'number') {
        rttMs = Math.round(stat.currentRoundTripTime * 1000);
      }
    }
  });

  let bitrateKbps: number | null = null;
  if (prevCache && nowMs > prevCache.timestampMs) {
    const deltaBytes = bytesReceived - prevCache.bytesReceived;
    const deltaMs = nowMs - prevCache.timestampMs;
    if (deltaBytes >= 0) {
      bitrateKbps = Math.round((deltaBytes * 8) / deltaMs);
    }
  }

  const totalPackets = packetsLost + packetsReceived;
  const packetLossPct =
    totalPackets > 0 ? Math.round((packetsLost / totalPackets) * 100) : null;

  return {
    bitrateKbps,
    packetLossPct,
    rttMs,
    jitterMs,
    quality: classifyWebRtcQuality({ packetLossPct, rttMs, jitterMs }),
    cache: { timestampMs: nowMs, bytesReceived },
  };
}
