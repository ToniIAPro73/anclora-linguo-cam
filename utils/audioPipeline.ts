export interface VadRuntimeConfig {
  chunkFrames: number;
  vadThreshold: number;
  minSpeechMs: number;
  minSilenceMs: number;
  maxSegmentMs: number;
  hangoverMs: number;
}

export interface BackpressureInput {
  bufferedBytes: number;
  maxBufferedBytes: number;
  lowWatermarkBytes: number;
  isBackpressured: boolean;
}

export interface BackpressureDecision {
  shouldSend: boolean;
  isBackpressured: boolean;
  dropped: boolean;
}

export function buildVadProcessorOptions(config: VadRuntimeConfig) {
  return {
    chunkSize: config.chunkFrames,
    vadThreshold: config.vadThreshold,
    minSpeechMs: config.minSpeechMs,
    minSilenceMs: config.minSilenceMs,
    maxSegmentMs: config.maxSegmentMs,
    hangoverMs: config.hangoverMs,
  };
}

export function lowWatermarkFor(maxBufferedBytes: number): number {
  return Math.max(4096, Math.floor(maxBufferedBytes * 0.5));
}

export function normalizeStreamingLanguageConfig(source: string, target: string) {
  const normalizedSource = source === 'auto' ? '' : source;
  let normalizedTarget = target === 'auto' ? '' : target;
  if (!normalizedTarget) {
    normalizedTarget = normalizedSource || 'en';
  }
  return { normalizedSource, normalizedTarget };
}

export function decideBackpressure({
  bufferedBytes,
  maxBufferedBytes,
  lowWatermarkBytes,
  isBackpressured,
}: BackpressureInput): BackpressureDecision {
  if (isBackpressured && bufferedBytes <= lowWatermarkBytes) {
    return { shouldSend: true, isBackpressured: false, dropped: false };
  }
  if (bufferedBytes >= maxBufferedBytes) {
    return { shouldSend: false, isBackpressured: true, dropped: true };
  }
  return { shouldSend: true, isBackpressured, dropped: false };
}

export function shouldCommitPartialOnSegmentEnd(partialText: string, committedText: string): boolean {
  const partial = partialText.trim();
  return Boolean(partial) && partial !== committedText.trim();
}
