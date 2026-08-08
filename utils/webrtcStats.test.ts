import { describe, expect, it } from 'vitest';

import { classifyWebRtcQuality, computeInboundStats, type InboundStatsCache } from './webrtcStats';

const buildReport = (stats: Record<string, unknown>[]) => {
  const report = new Map(stats.map((stat, index) => [String(index), stat]));
  return report as unknown as RTCStatsReport;
};

describe('webrtcStats', () => {
  it('computes bitrate, loss, rtt, jitter and quality', () => {
    const prev: InboundStatsCache = { timestampMs: 1_000, bytesReceived: 10_000 };
    const snapshot = computeInboundStats(
      buildReport([
        {
          type: 'inbound-rtp',
          isRemote: false,
          bytesReceived: 260_000,
          packetsLost: 3,
          packetsReceived: 97,
          jitter: 0.018,
        },
        {
          type: 'candidate-pair',
          state: 'succeeded',
          nominated: true,
          currentRoundTripTime: 0.14,
        },
      ]),
      prev,
      3_000,
    );

    expect(snapshot.bitrateKbps).toBe(1000);
    expect(snapshot.packetLossPct).toBe(3);
    expect(snapshot.rttMs).toBe(140);
    expect(snapshot.jitterMs).toBe(18);
    expect(snapshot.quality).toBe('medium');
  });

  it('classifies quality thresholds', () => {
    expect(classifyWebRtcQuality({ packetLossPct: null, rttMs: null, jitterMs: null })).toBe('unknown');
    expect(classifyWebRtcQuality({ packetLossPct: 0, rttMs: 120, jitterMs: 10 })).toBe('good');
    expect(classifyWebRtcQuality({ packetLossPct: 4, rttMs: 120, jitterMs: 10 })).toBe('medium');
    expect(classifyWebRtcQuality({ packetLossPct: 1, rttMs: 520, jitterMs: 10 })).toBe('bad');
  });
});
