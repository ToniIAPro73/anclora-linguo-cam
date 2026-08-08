/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ASR_MT_HTTP_URL?: string;
  readonly VITE_ASR_MT_WS_URL?: string;
  readonly VITE_ASR_WS_MAX_BUFFERED_BYTES?: string;
  readonly VITE_AUDIO_CHUNK_FRAMES?: string;
  readonly VITE_VAD_PROVIDER?: string;
  readonly VITE_VAD_THRESHOLD?: string;
  readonly VITE_VAD_MIN_SPEECH_MS?: string;
  readonly VITE_VAD_MIN_SILENCE_MS?: string;
  readonly VITE_VAD_MAX_SEGMENT_MS?: string;
  readonly VITE_VAD_HANGOVER_MS?: string;
  readonly VITE_CALL_TOPOLOGY?: string;
  readonly VITE_SFU_JOIN_URL?: string;
  readonly VITE_ENABLE_INSERTABLE_E2EE?: string;
  readonly VITE_REQUIRE_INSERTABLE_E2EE?: string;
  readonly VITE_E2EE_SHARED_KEY?: string;
  readonly VITE_ENABLE_LOCAL_MT_PRIVACY?: string;
  readonly VITE_SHOW_DIAGNOSTIC_OVERLAYS?: string;
  readonly VITE_ENABLE_QA_TELEMETRY_PANEL?: string;
  readonly VITE_ENABLE_E2E_HOOKS?: string;
  readonly VITE_PEER_SERVER_HOST?: string;
  readonly VITE_PEER_SERVER_PORT?: string;
  readonly VITE_PEER_SERVER_PATH?: string;
  readonly VITE_PEER_SERVER_SECURE?: string;
  readonly VITE_ICE_SERVERS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
