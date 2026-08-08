import { useCallback, useEffect, useRef, useState } from 'react';

import {
  buildVadProcessorOptions,
  decideBackpressure,
  lowWatermarkFor,
  normalizeStreamingLanguageConfig,
  shouldCommitPartialOnSegmentEnd,
} from '../utils/audioPipeline';

interface StreamingTranslationOptions {
  provider?: string;
  wsUrl: string;
  geminiTokenUrl?: string;
  geminiLiveWsUrl?: string;
  authToken?: string;
  sampleRate: number;
  chunkFrames: number;
  maxBufferedBytes: number;
  vadThreshold: number;
  minSpeechMs: number;
  minSilenceMs: number;
  maxSegmentMs: number;
  hangoverMs: number;
  sourceLang: string;
  targetLang: string;
  onSubtitle: (text: string, isFinal: boolean, rawText?: string) => void;
}

type WsConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error';

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY_MS = 500;
const GEMINI_PROVIDER = 'gemini-live';
const GEMINI_MODEL = 'models/gemini-3.5-live-translate-preview';
const GEMINI_INPUT_MIME_TYPE = 'audio/pcm;rate=16000';
const GEMINI_OUTPUT_SAMPLE_RATE = 24000;
const GEMINI_CHUNK_FRAMES = 1600;

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const base64ToArrayBuffer = (value: string) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

const readWebSocketText = async (data: MessageEvent['data']) => {
  if (typeof data === 'string') return data;
  if (data instanceof Blob) return data.text();
  if (data instanceof ArrayBuffer) return new TextDecoder().decode(data);
  return String(data);
};

export function useStreamingTranslation(options: StreamingTranslationOptions) {
  const {
    provider = 'asr-mt',
    wsUrl,
    geminiTokenUrl,
    geminiLiveWsUrl,
    authToken,
    sampleRate,
    chunkFrames,
    maxBufferedBytes,
    vadThreshold,
    minSpeechMs,
    minSilenceMs,
    maxSegmentMs,
    hangoverMs,
    sourceLang,
    targetLang,
    onSubtitle,
  } = options;

  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [connectionState, setConnectionState] = useState<WsConnectionState>('idle');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [droppedAudioChunks, setDroppedAudioChunks] = useState(0);
  const [isBackpressured, setIsBackpressured] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const fallbackProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const lastChunkSentAtRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startedRef = useRef(false);
  const intentionalStopRef = useRef(false);
  const reconnectTimerRef = useRef<number | null>(null);
  const lastPartialTextRef = useRef('');
  const lastCommittedTextRef = useRef('');
  const droppedAudioChunksRef = useRef(0);
  const backpressuredRef = useRef(false);
  const lowWatermarkRef = useRef(lowWatermarkFor(maxBufferedBytes));
  const playbackCursorRef = useRef(0);
  const fallbackSendActiveRef = useRef(false);

  const sourceLangRef = useRef(sourceLang);
  const targetLangRef = useRef(targetLang);
  const authTokenRef = useRef(authToken || '');
  const providerRef = useRef(provider);

  const buildAuthenticatedWsUrl = useCallback(() => {
    const token = authTokenRef.current;
    if (!token) return wsUrl;
    const separator = wsUrl.includes('?') ? '&' : '?';
    return `${wsUrl}${separator}token=${encodeURIComponent(token)}`;
  }, [wsUrl]);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const setSendActive = useCallback((active: boolean) => {
    fallbackSendActiveRef.current = active;
    const node = workletNodeRef.current;
    if (node) node.port.postMessage({ type: 'state', active });
  }, []);

  const fetchGeminiEphemeralToken = useCallback(async () => {
    if (!geminiTokenUrl) throw new Error('Gemini Live token endpoint is not configured.');
    const { normalizedTarget } = normalizeStreamingLanguageConfig(
      sourceLangRef.current,
      targetLangRef.current,
    );
    const response = await fetch(geminiTokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: authTokenRef.current,
        target_language_code: normalizedTarget || 'es',
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Gemini token request failed (${response.status})`);
    }
    const payload = await response.json() as { token?: string; name?: string };
    const token = payload.token || payload.name;
    if (!token) throw new Error('Gemini token response did not include a token.');
    return token;
  }, [geminiTokenUrl]);

  const buildGeminiWsUrl = useCallback(async () => {
    if (!geminiLiveWsUrl) throw new Error('Gemini Live WebSocket URL is not configured.');
    const token = await fetchGeminiEphemeralToken();
    const separator = geminiLiveWsUrl.includes('?') ? '&' : '?';
    return `${geminiLiveWsUrl}${separator}access_token=${encodeURIComponent(token)}`;
  }, [fetchGeminiEphemeralToken, geminiLiveWsUrl]);

  const cleanupWs = useCallback((sendEnd: boolean) => {
    const ws = wsRef.current;
    if (!ws) return;
    if (sendEnd && ws.readyState === WebSocket.OPEN && providerRef.current !== GEMINI_PROVIDER) {
      ws.send(JSON.stringify({ type: 'end' }));
    }
    ws.onopen = null;
    ws.onmessage = null;
    ws.onerror = null;
    ws.onclose = null;
    ws.close();
    wsRef.current = null;
    backpressuredRef.current = false;
    setIsBackpressured(false);
  }, []);

  const playGeminiAudio = useCallback(async (base64Audio: string) => {
    if (!base64Audio) return;
    const context = playbackContextRef.current
      ?? new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: GEMINI_OUTPUT_SAMPLE_RATE,
      });
    playbackContextRef.current = context;
    if (context.state === 'suspended') {
      await context.resume().catch(() => undefined);
    }

    const pcm = new Int16Array(base64ToArrayBuffer(base64Audio));
    const audioBuffer = context.createBuffer(1, pcm.length, GEMINI_OUTPUT_SAMPLE_RATE);
    const channel = audioBuffer.getChannelData(0);
    for (let i = 0; i < pcm.length; i += 1) {
      channel[i] = Math.max(-1, Math.min(1, pcm[i] / 32768));
    }

    const source = context.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(context.destination);
    const startAt = Math.max(context.currentTime, playbackCursorRef.current);
    source.start(startAt);
    playbackCursorRef.current = startAt + audioBuffer.duration;
  }, []);

  const handleLegacyMessage = useCallback((payload: any) => {
    if (payload.type !== 'partial' && payload.type !== 'final') return;
    const translatedText = payload.translated_text || payload.text;
    if (!translatedText) return;
    if (payload.type === 'final' && translatedText === lastCommittedTextRef.current) {
      lastPartialTextRef.current = '';
      return;
    }
    onSubtitle(translatedText, payload.type === 'final', payload.text || translatedText);
    if (payload.type === 'partial') {
      lastPartialTextRef.current = translatedText;
    } else {
      lastCommittedTextRef.current = translatedText;
      lastPartialTextRef.current = '';
    }
    if (lastChunkSentAtRef.current) {
      setLatencyMs(Math.round(performance.now() - lastChunkSentAtRef.current));
    }
  }, [onSubtitle]);

  const handleGeminiMessage = useCallback((payload: any) => {
    const content = payload.serverContent;
    if (!content) return;
    const inputText = content.inputTranscription?.text;
    const outputText = content.outputTranscription?.text;
    if (outputText) {
      onSubtitle(outputText, true, inputText || outputText);
    }
    const parts = content.modelTurn?.parts || [];
    parts.forEach((part: any) => {
      const audioData = part.inlineData?.data;
      if (typeof audioData === 'string') {
        playGeminiAudio(audioData).catch((error) => {
          console.error('Gemini audio playback failed:', error);
        });
      }
    });
    if (lastChunkSentAtRef.current) {
      setLatencyMs(Math.round(performance.now() - lastChunkSentAtRef.current));
    }
  }, [onSubtitle, playGeminiAudio]);

  const configureOpenSocket = useCallback((ws: WebSocket, sessionId: string) => {
    const { normalizedSource, normalizedTarget } = normalizeStreamingLanguageConfig(
      sourceLangRef.current,
      targetLangRef.current,
    );
    if (providerRef.current === GEMINI_PROVIDER) {
      ws.send(
        JSON.stringify({
          setup: {
            model: GEMINI_MODEL,
            generationConfig: {
              responseModalities: ['AUDIO'],
            },
          },
        }),
      );
    } else {
      ws.send(
        JSON.stringify({
          type: 'config',
          session_id: sessionId,
          source_lang: normalizedSource,
          target_lang: normalizedTarget,
          sample_rate: sampleRate,
          format: 's16le',
        }),
      );
    }
    setConnectionState('connected');
    setReconnectAttempts(0);
    backpressuredRef.current = false;
    setIsBackpressured(false);
  }, [sampleRate]);

  const sendAudioPayload = useCallback((payload: ArrayBuffer) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const decision = decideBackpressure({
      bufferedBytes: ws.bufferedAmount,
      maxBufferedBytes,
      lowWatermarkBytes: lowWatermarkRef.current,
      isBackpressured: backpressuredRef.current,
    });
    if (decision.isBackpressured !== backpressuredRef.current) {
      backpressuredRef.current = decision.isBackpressured;
      setIsBackpressured(decision.isBackpressured);
    }
    if (!decision.shouldSend) {
      droppedAudioChunksRef.current += 1;
      if (droppedAudioChunksRef.current % 5 === 0) {
        setDroppedAudioChunks(droppedAudioChunksRef.current);
      }
      return;
    }

    if (providerRef.current === GEMINI_PROVIDER) {
      ws.send(
        JSON.stringify({
          realtimeInput: {
            audio: {
              data: arrayBufferToBase64(payload),
              mimeType: GEMINI_INPUT_MIME_TYPE,
            },
          },
        }),
      );
    } else {
      ws.send(payload);
    }
    lastChunkSentAtRef.current = performance.now();
  }, [maxBufferedBytes]);

  const createFallbackAudioProcessor = useCallback((inputCtx: AudioContext) => {
    const fallbackChunkFrames =
      providerRef.current === GEMINI_PROVIDER ? GEMINI_CHUNK_FRAMES : chunkFrames;
    const processor = inputCtx.createScriptProcessor(4096, 1, 1);
    let pending = new Float32Array(fallbackChunkFrames);
    let pendingIndex = 0;

    processor.onaudioprocess = (event) => {
      if (!fallbackSendActiveRef.current) return;
      const input = event.inputBuffer.getChannelData(0);
      for (let i = 0; i < input.length; i += 1) {
        pending[pendingIndex] = input[i];
        pendingIndex += 1;
        if (pendingIndex < fallbackChunkFrames) continue;

        let sum = 0;
        const int16 = new Int16Array(fallbackChunkFrames);
        for (let j = 0; j < fallbackChunkFrames; j += 1) {
          const sample = Math.max(-1, Math.min(1, pending[j]));
          sum += sample * sample;
          int16[j] = sample * 32767;
        }
        const rms = Math.sqrt(sum / fallbackChunkFrames);
        if (rms >= vadThreshold || providerRef.current === GEMINI_PROVIDER) {
          sendAudioPayload(int16.buffer);
        }
        pending = new Float32Array(fallbackChunkFrames);
        pendingIndex = 0;
      }
    };
    return processor;
  }, [chunkFrames, sendAudioPayload, vadThreshold]);

  const scheduleReconnect = useCallback(() => {
    if (!startedRef.current || !streamRef.current || intentionalStopRef.current) return;
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      setConnectionState('error');
      return;
    }
    const nextAttempt = reconnectAttempts + 1;
    const delay = RECONNECT_BASE_DELAY_MS * 2 ** (nextAttempt - 1);
    setReconnectAttempts(nextAttempt);
    setConnectionState('reconnecting');
    clearReconnectTimer();
    reconnectTimerRef.current = window.setTimeout(async () => {
      reconnectTimerRef.current = null;
      if (!streamRef.current || !startedRef.current) return;
      const sessionId = Math.random().toString(36).substring(2, 10);
      try {
        const ws = new WebSocket(
          providerRef.current === GEMINI_PROVIDER
            ? await buildGeminiWsUrl()
            : buildAuthenticatedWsUrl(),
        );
        wsRef.current = ws;

        ws.onopen = () => configureOpenSocket(ws, sessionId);
        ws.onmessage = async (event) => {
          try {
            const payload = JSON.parse(await readWebSocketText(event.data));
            if (providerRef.current === GEMINI_PROVIDER) handleGeminiMessage(payload);
            else handleLegacyMessage(payload);
          } catch (err) {
            console.error('WS message parse error:', err);
          }
        };
        ws.onerror = () => setConnectionState('error');
        ws.onclose = () => {
          wsRef.current = null;
          if (!intentionalStopRef.current) scheduleReconnect();
        };
      } catch (error) {
        console.error('WS reconnect failed:', error);
        setConnectionState('error');
      }
    }, delay);
  }, [
    buildAuthenticatedWsUrl,
    buildGeminiWsUrl,
    clearReconnectTimer,
    configureOpenSocket,
    handleGeminiMessage,
    handleLegacyMessage,
    reconnectAttempts,
  ]);

  const createWebSocket = useCallback(async () => {
    const sessionId = Math.random().toString(36).substring(2, 10);
    setConnectionState(reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    const ws = new WebSocket(
      providerRef.current === GEMINI_PROVIDER
        ? await buildGeminiWsUrl()
        : buildAuthenticatedWsUrl(),
    );
    wsRef.current = ws;

    ws.onopen = () => configureOpenSocket(ws, sessionId);
    ws.onmessage = async (event) => {
      try {
        const payload = JSON.parse(await readWebSocketText(event.data));
        if (providerRef.current === GEMINI_PROVIDER) handleGeminiMessage(payload);
        else handleLegacyMessage(payload);
      } catch (err) {
        console.error('WS message parse error:', err);
      }
    };
    ws.onerror = () => setConnectionState('error');
    ws.onclose = () => {
      wsRef.current = null;
      if (!intentionalStopRef.current) scheduleReconnect();
    };
  }, [
    buildAuthenticatedWsUrl,
    buildGeminiWsUrl,
    configureOpenSocket,
    handleGeminiMessage,
    handleLegacyMessage,
    reconnectAttempts,
    scheduleReconnect,
  ]);

  const start = useCallback(async (stream: MediaStream) => {
    intentionalStopRef.current = false;
    startedRef.current = true;
    streamRef.current = stream;
    clearReconnectTimer();
    cleanupWs(false);

    try {
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate,
      });
      audioContextRef.current = inputCtx;

      const source = inputCtx.createMediaStreamSource(stream);
      const zeroGain = inputCtx.createGain();
      zeroGain.gain.value = 0;

      try {
        const workletUrl = new URL('/audio-worklet-processor.js', window.location.origin).href;
        await inputCtx.audioWorklet.addModule(workletUrl);

        const workletNode = new AudioWorkletNode(inputCtx, 'pcm-worklet', {
          processorOptions: buildVadProcessorOptions({
            chunkFrames: providerRef.current === GEMINI_PROVIDER ? GEMINI_CHUNK_FRAMES : chunkFrames,
            vadThreshold,
            minSpeechMs,
            minSilenceMs,
            maxSegmentMs,
            hangoverMs,
          }),
        });

        workletNode.port.onmessage = (event) => {
          if (event.data?.type === 'segment_end') {
            if (providerRef.current === GEMINI_PROVIDER) return;
            const ws = wsRef.current;
            if (ws?.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'segment_end', reason: event.data.reason || 'vad' }));
            }
            if (shouldCommitPartialOnSegmentEnd(lastPartialTextRef.current, lastCommittedTextRef.current)) {
              onSubtitle(lastPartialTextRef.current, true, lastPartialTextRef.current);
              lastCommittedTextRef.current = lastPartialTextRef.current;
              lastPartialTextRef.current = '';
            }
            return;
          }
          if (event.data?.type !== 'audio') return;
          sendAudioPayload(event.data.payload);
        };

        source.connect(workletNode);
        workletNode.connect(zeroGain).connect(inputCtx.destination);
        workletNodeRef.current = workletNode;
      } catch (workletError) {
        console.warn('AudioWorklet unavailable, falling back to ScriptProcessor.', workletError);
        const fallbackProcessor = createFallbackAudioProcessor(inputCtx);
        source.connect(fallbackProcessor);
        fallbackProcessor.connect(zeroGain).connect(inputCtx.destination);
        fallbackProcessorRef.current = fallbackProcessor;
      }

      audioSourceRef.current = source;

      await createWebSocket();
    } catch (error) {
      console.error('Audio streaming start failed:', error);
      startedRef.current = false;
      streamRef.current = null;
      cleanupWs(false);
      if (workletNodeRef.current) {
        workletNodeRef.current.port.onmessage = null;
        workletNodeRef.current.disconnect();
        workletNodeRef.current = null;
      }
      if (fallbackProcessorRef.current) {
        fallbackProcessorRef.current.onaudioprocess = null;
        fallbackProcessorRef.current.disconnect();
        fallbackProcessorRef.current = null;
      }
      audioSourceRef.current?.disconnect();
      audioSourceRef.current = null;
      if (audioContextRef.current) {
        await audioContextRef.current.close().catch(() => undefined);
        audioContextRef.current = null;
      }
      setConnectionState('error');
    }
  }, [
    chunkFrames,
    cleanupWs,
    clearReconnectTimer,
    createFallbackAudioProcessor,
    createWebSocket,
    hangoverMs,
    maxSegmentMs,
    minSilenceMs,
    minSpeechMs,
    onSubtitle,
    sampleRate,
    sendAudioPayload,
    vadThreshold,
  ]);

  const stop = useCallback(() => {
    intentionalStopRef.current = true;
    startedRef.current = false;
    setSendActive(false);
    clearReconnectTimer();
    cleanupWs(true);

    if (workletNodeRef.current) {
      workletNodeRef.current.port.onmessage = null;
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (fallbackProcessorRef.current) {
      fallbackProcessorRef.current.onaudioprocess = null;
      fallbackProcessorRef.current.disconnect();
      fallbackProcessorRef.current = null;
    }

    audioSourceRef.current?.disconnect();
    audioSourceRef.current = null;

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (playbackContextRef.current) {
      playbackContextRef.current.close();
      playbackContextRef.current = null;
    }

    droppedAudioChunksRef.current = 0;
    setDroppedAudioChunks(0);
    lastChunkSentAtRef.current = null;
    lastPartialTextRef.current = '';
    lastCommittedTextRef.current = '';
    backpressuredRef.current = false;
    playbackCursorRef.current = 0;
    setIsBackpressured(false);
    streamRef.current = null;
    setConnectionState('idle');
    setReconnectAttempts(0);
  }, [cleanupWs, clearReconnectTimer, setSendActive]);

  const restartIfReady = useCallback(() => {
    if (!startedRef.current || !streamRef.current) return;
    const stream = streamRef.current;
    stop();
    start(stream);
  }, [start, stop]);

  const setEndpointingConfig = useCallback((config: {
    chunkSize?: number;
    minSpeechMs?: number;
    minSilenceMs?: number;
    maxSegmentMs?: number;
    hangoverMs?: number;
    vadThreshold?: number;
  }) => {
    const node = workletNodeRef.current;
    if (!node) return;
    node.port.postMessage({
      type: 'config',
      ...config,
      chunkSize: providerRef.current === GEMINI_PROVIDER ? GEMINI_CHUNK_FRAMES : config.chunkSize,
    });
  }, []);

  useEffect(() => {
    sourceLangRef.current = sourceLang;
    targetLangRef.current = targetLang;
    authTokenRef.current = authToken || '';
    providerRef.current = provider;
    restartIfReady();
  }, [authToken, provider, sourceLang, targetLang, restartIfReady]);

  useEffect(() => {
    lowWatermarkRef.current = lowWatermarkFor(maxBufferedBytes);
  }, [maxBufferedBytes]);

  return {
    latencyMs,
    connectionState,
    reconnectAttempts,
    droppedAudioChunks,
    isBackpressured,
    setSendActive,
    setEndpointingConfig,
    start,
    stop,
    restartIfReady,
  };
}
