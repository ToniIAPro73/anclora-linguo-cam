
import { Language } from './types';
import { parseIceServers } from './utils/iceServers';

const env = import.meta.env;

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'auto', name: 'Auto-detect' },
  { code: 'es', name: 'Español 🇪🇸 (Spanish)' },
  { code: 'ru', name: 'Русский 🇷🇺 (Russian)' },
  { code: 'en', name: 'English 🇺🇸' },
  { code: 'fr', name: 'Français 🇫🇷' },
  { code: 'de', name: 'Deutsch 🇩🇪' },
  { code: 'it', name: 'Italiano 🇮🇹' },
  { code: 'pt', name: 'Português 🇵🇹' },
  { code: 'zh', name: '中文 🇨🇳' },
  { code: 'ja', name: '日本語 🇯🇵' },
  { code: 'ko', name: '한국어 🇰🇷' },
];

export const GEMINI_MODEL = 'gemini-3.5-live-translate-preview';
export const SAMPLE_RATE = 16000;
export const OUTPUT_SAMPLE_RATE = 24000;
export const FRAME_RATE = 1; // Frames per second for visual context
export const JPEG_QUALITY = 0.6;
export const ASR_MT_WS_URL = env.VITE_ASR_MT_WS_URL || 'ws://localhost:8001/ws/asr-mt';
export const ASR_MT_HTTP_URL = env.VITE_ASR_MT_HTTP_URL || 'http://localhost:8001';
export const TRANSLATION_STREAM_PROVIDER = env.VITE_TRANSLATION_STREAM_PROVIDER || 'gemini-live';
export const GEMINI_LIVE_TOKEN_URL =
  env.VITE_GEMINI_LIVE_TOKEN_URL || `${ASR_MT_HTTP_URL}/api/gemini/live-token`;
export const GEMINI_LIVE_WS_URL =
  env.VITE_GEMINI_LIVE_WS_URL
  || 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained';
export const ASR_WS_MAX_BUFFERED_BYTES = Number(env.VITE_ASR_WS_MAX_BUFFERED_BYTES || 262144);
export const AUDIO_CHUNK_FRAMES = Number(env.VITE_AUDIO_CHUNK_FRAMES || 320);
export const VAD_PROVIDER = env.VITE_VAD_PROVIDER || 'energy';
export const VAD_THRESHOLD = Number(env.VITE_VAD_THRESHOLD || 0.01);
export const VAD_MIN_SPEECH_MS = Number(env.VITE_VAD_MIN_SPEECH_MS || 220);
export const VAD_MIN_SILENCE_MS = Number(env.VITE_VAD_MIN_SILENCE_MS || 420);
export const VAD_MAX_SEGMENT_MS = Number(env.VITE_VAD_MAX_SEGMENT_MS || 2400);
export const VAD_HANGOVER_MS = Number(env.VITE_VAD_HANGOVER_MS || 120);
export const CALL_TOPOLOGY = env.VITE_CALL_TOPOLOGY || 'p2p';
export const SFU_JOIN_URL = env.VITE_SFU_JOIN_URL || '';
export const ENABLE_INSERTABLE_E2EE = env.VITE_ENABLE_INSERTABLE_E2EE === 'true';
export const REQUIRE_INSERTABLE_E2EE = env.VITE_REQUIRE_INSERTABLE_E2EE === 'true';
export const E2EE_SHARED_KEY = env.VITE_E2EE_SHARED_KEY || '';
export const ENABLE_LOCAL_MT_PRIVACY = env.VITE_ENABLE_LOCAL_MT_PRIVACY === 'true';
export const SHOW_DIAGNOSTIC_OVERLAYS = env.VITE_SHOW_DIAGNOSTIC_OVERLAYS === 'true';
export const ENABLE_QA_TELEMETRY_PANEL = env.VITE_ENABLE_QA_TELEMETRY_PANEL === 'true';

const ICE_SERVER_CONFIG = parseIceServers(env.VITE_ICE_SERVERS);
if (ICE_SERVER_CONFIG.warnings.length) {
  console.warn('ICE server configuration warnings:', ICE_SERVER_CONFIG.warnings);
}
export const ICE_SERVERS = ICE_SERVER_CONFIG.servers;
export const ICE_SERVER_WARNINGS = ICE_SERVER_CONFIG.warnings;
export const HAS_TURN_SERVER = ICE_SERVER_CONFIG.hasTurn;

export function getPeerOptions() {
  if (env.VITE_PEER_SERVER_HOST) {
    return {
      host: env.VITE_PEER_SERVER_HOST,
      port: Number(env.VITE_PEER_SERVER_PORT || (env.VITE_PEER_SERVER_SECURE === 'false' ? 80 : 443)),
      path: env.VITE_PEER_SERVER_PATH || '/peerjs',
      secure: env.VITE_PEER_SERVER_SECURE !== 'false',
      config: { iceServers: ICE_SERVERS },
    };
  }

  if (typeof window !== 'undefined') {
    const isHttps = window.location.protocol === 'https:';
    const port = window.location.port
      ? Number(window.location.port)
      : (isHttps ? 443 : 80);
    return {
      host: window.location.hostname,
      port,
      path: env.VITE_PEER_SERVER_PATH || '/peerjs',
      secure: isHttps,
      config: { iceServers: ICE_SERVERS },
    };
  }

  return {
    host: 'localhost',
    port: 3000,
    path: '/peerjs',
    secure: false,
    config: { iceServers: ICE_SERVERS },
  };
}

const defaultPeerOpts = getPeerOptions();
export const PEER_SERVER_HOST = defaultPeerOpts.host || 'localhost';
export const PEER_SERVER_PORT = defaultPeerOpts.port || 3000;
export const PEER_SERVER_PATH = defaultPeerOpts.path || '/peerjs';
export const PEER_SERVER_SECURE = defaultPeerOpts.secure ?? false;
