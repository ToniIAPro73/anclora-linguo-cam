import { describe, expect, it } from 'vitest';

import {
  buildVadProcessorOptions,
  decideBackpressure,
  lowWatermarkFor,
  normalizeStreamingLanguageConfig,
  shouldCommitPartialOnSegmentEnd,
} from './audioPipeline';

describe('audioPipeline', () => {
  it('builds AudioWorklet VAD processor options', () => {
    expect(
      buildVadProcessorOptions({
        chunkFrames: 320,
        vadThreshold: 0.01,
        minSpeechMs: 220,
        minSilenceMs: 420,
        maxSegmentMs: 2400,
        hangoverMs: 120,
      }),
    ).toEqual({
      chunkSize: 320,
      vadThreshold: 0.01,
      minSpeechMs: 220,
      minSilenceMs: 420,
      maxSegmentMs: 2400,
      hangoverMs: 120,
    });
  });

  it('normalizes auto language settings', () => {
    expect(normalizeStreamingLanguageConfig('auto', 'auto')).toEqual({
      normalizedSource: '',
      normalizedTarget: 'en',
    });
    expect(normalizeStreamingLanguageConfig('es', 'auto')).toEqual({
      normalizedSource: 'es',
      normalizedTarget: 'es',
    });
    expect(normalizeStreamingLanguageConfig('es', 'en')).toEqual({
      normalizedSource: 'es',
      normalizedTarget: 'en',
    });
  });

  it('decides backpressure send/drop transitions', () => {
    expect(lowWatermarkFor(8000)).toBe(4096);
    expect(decideBackpressure({
      bufferedBytes: 1000,
      maxBufferedBytes: 8000,
      lowWatermarkBytes: 4096,
      isBackpressured: true,
    })).toEqual({ shouldSend: true, isBackpressured: false, dropped: false });
    expect(decideBackpressure({
      bufferedBytes: 9000,
      maxBufferedBytes: 8000,
      lowWatermarkBytes: 4096,
      isBackpressured: false,
    })).toEqual({ shouldSend: false, isBackpressured: true, dropped: true });
  });

  it('commits only new non-empty partials on segment end', () => {
    expect(shouldCommitPartialOnSegmentEnd(' hello ', '')).toBe(true);
    expect(shouldCommitPartialOnSegmentEnd('hello', 'hello')).toBe(false);
    expect(shouldCommitPartialOnSegmentEnd(' ', 'hello')).toBe(false);
  });
});
