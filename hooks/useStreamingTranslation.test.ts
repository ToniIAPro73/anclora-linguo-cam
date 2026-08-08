// @vitest-environment jsdom
import { cleanup, act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useStreamingTranslation } from './useStreamingTranslation';

class MockWebSocket {
  static readonly OPEN = 1;
  static instances: MockWebSocket[] = [];

  readonly url: string;
  readyState = 0;
  bufferedAmount = 0;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = 3;
    this.onclose?.();
  }

  static reset() {
    MockWebSocket.instances = [];
  }
}

const mockAudioNode = () => ({
  connect: vi.fn((destination: unknown) => destination),
  disconnect: vi.fn(),
});

class MockAudioContext {
  static instances: MockAudioContext[] = [];

  readonly state = 'running';
  readonly currentTime = 0;
  readonly destination = {};
  readonly audioWorklet = {
    addModule: vi.fn().mockRejectedValue(new Error('AudioWorklet unavailable in test')),
  };

  constructor(public readonly options?: { sampleRate?: number }) {
    MockAudioContext.instances.push(this);
  }

  createMediaStreamSource() {
    return mockAudioNode();
  }

  createGain() {
    return { gain: { value: 1 }, ...mockAudioNode() };
  }

  createScriptProcessor() {
    return { ...mockAudioNode(), onaudioprocess: null };
  }

  resume() {
    return Promise.resolve();
  }

  close() {
    return Promise.resolve();
  }
}

const fakeStream = {} as MediaStream;

const baseOptions = {
  wsUrl: 'ws://asrmt.local/ws',
  sampleRate: 16000,
  chunkFrames: 320,
  maxBufferedBytes: 64000,
  vadThreshold: 0.01,
  minSpeechMs: 220,
  minSilenceMs: 420,
  maxSegmentMs: 2400,
  hangoverMs: 120,
  sourceLang: 'es',
  targetLang: 'en',
  onSubtitle: vi.fn(),
};

const geminiOptions = {
  ...baseOptions,
  provider: 'gemini-live',
  geminiTokenUrl: 'https://token.local/api/token',
  geminiLiveWsUrl: 'wss://gemini.local/ws',
};

describe('useStreamingTranslation', () => {
  beforeEach(() => {
    MockWebSocket.reset();
    MockAudioContext.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    vi.stubGlobal('AudioContext', MockAudioContext);
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('fails to an error state when the Gemini ephemeral token request fails', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'upstream unavailable',
    } as Response);

    const { result } = renderHook(() => useStreamingTranslation(geminiOptions));

    await act(async () => {
      await result.current.start(fakeStream);
    });

    expect(result.current.connectionState).toBe('error');
    expect(MockWebSocket.instances).toHaveLength(0);
  });

  it('fails to an error state when the Gemini token response carries no token', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);

    const { result } = renderHook(() => useStreamingTranslation(geminiOptions));

    await act(async () => {
      await result.current.start(fakeStream);
    });

    expect(result.current.connectionState).toBe('error');
    expect(MockWebSocket.instances).toHaveLength(0);
  });

  it('connects Gemini Live with the ephemeral token and sends the Live setup frame', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'ephemeral-token' }),
    } as Response);

    const { result } = renderHook(() => useStreamingTranslation(geminiOptions));

    await act(async () => {
      await result.current.start(fakeStream);
    });

    expect(MockWebSocket.instances).toHaveLength(1);
    const ws = MockWebSocket.instances[0];
    expect(ws.url).toContain('wss://gemini.local/ws');
    expect(ws.url).toContain('access_token=ephemeral-token');

    act(() => {
      ws.onopen?.();
    });

    expect(result.current.connectionState).toBe('connected');
    const setupFrame = JSON.parse(ws.sent[0]);
    expect(setupFrame.setup.model).toBe('models/gemini-3.5-live-translate-preview');
    expect(setupFrame.setup.generationConfig.responseModalities).toEqual(['AUDIO']);
  });

  it('sends an asr-mt config frame on open and no Gemini setup frame', async () => {
    const { result } = renderHook(() => useStreamingTranslation(baseOptions));

    await act(async () => {
      await result.current.start(fakeStream);
    });

    const ws = MockWebSocket.instances[0];
    expect(ws.url).toBe('ws://asrmt.local/ws');

    act(() => {
      ws.onopen?.();
    });

    expect(result.current.connectionState).toBe('connected');
    const configFrame = JSON.parse(ws.sent[0]);
    expect(configFrame.type).toBe('config');
    expect(configFrame.session_id).toBeTruthy();
    expect(configFrame.source_lang).toBe('es');
    expect(configFrame.target_lang).toBe('en');
    expect(configFrame.sample_rate).toBe(16000);
    expect(configFrame.format).toBe('s16le');
  });

  it('reconnects automatically after an unexpected close', async () => {
    const { result } = renderHook(() => useStreamingTranslation(baseOptions));

    await act(async () => {
      await result.current.start(fakeStream);
    });

    const first = MockWebSocket.instances[0];
    act(() => {
      first.onopen?.();
    });
    expect(result.current.connectionState).toBe('connected');

    // Unexpected close: the hook re-establishes the session on its own.
    act(() => {
      first.onclose?.();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(MockWebSocket.instances.length).toBeGreaterThan(1);
    expect(['connecting', 'reconnecting', 'connected']).toContain(result.current.connectionState);

    const second = MockWebSocket.instances[MockWebSocket.instances.length - 1];
    act(() => {
      second.onopen?.();
    });
    expect(result.current.connectionState).toBe('connected');
    expect(result.current.reconnectAttempts).toBe(0);
  });

  it('does not reconnect after an intentional stop', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useStreamingTranslation(baseOptions));

    await act(async () => {
      await result.current.start(fakeStream);
    });

    const ws = MockWebSocket.instances[0];
    act(() => {
      ws.onopen?.();
    });

    act(() => {
      result.current.stop();
    });
    expect(result.current.connectionState).toBe('idle');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(MockWebSocket.instances).toHaveLength(1);
    expect(result.current.reconnectAttempts).toBe(0);
  });
});
