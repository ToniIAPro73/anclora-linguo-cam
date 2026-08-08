import React, { useState, useRef, useEffect, useCallback } from 'react';
import Peer from 'peerjs';
import {
  SUPPORTED_LANGUAGES,
  SAMPLE_RATE,
  ASR_MT_WS_URL,
  ASR_MT_HTTP_URL,
  ASR_WS_MAX_BUFFERED_BYTES,
  GEMINI_LIVE_TOKEN_URL,
  GEMINI_LIVE_WS_URL,
  AUDIO_CHUNK_FRAMES,
  VAD_THRESHOLD,
  VAD_MIN_SPEECH_MS,
  VAD_MIN_SILENCE_MS,
  VAD_MAX_SEGMENT_MS,
  VAD_HANGOVER_MS,
  CALL_TOPOLOGY,
  SFU_JOIN_URL,
  ENABLE_INSERTABLE_E2EE,
  REQUIRE_INSERTABLE_E2EE,
  E2EE_SHARED_KEY,
  ENABLE_LOCAL_MT_PRIVACY,
  SHOW_DIAGNOSTIC_OVERLAYS,
  ENABLE_QA_TELEMETRY_PANEL,
  ICE_SERVERS,
  ICE_SERVER_WARNINGS,
  HAS_TURN_SERVER,
  TRANSLATION_STREAM_PROVIDER,
  getPeerOptions,
} from './constants';
import { CallStatus } from './types';
import { useWebRtcStats } from './hooks/useWebRtcStats';
import { useStreamingTranslation } from './hooks/useStreamingTranslation';
import { useRecording } from './hooks/useRecording';
import CallHeader from './components/CallHeader';
import CallSetup from './components/CallSetup';
import ChatSidebar from './components/ChatSidebar';
import VideoGrid from './components/VideoGrid';
import type { CaptionSize, CaptionPosition, CaptionContrast } from './components/VideoGrid';
import ControlBar from './components/ControlBar';
import SettingsModal from './components/SettingsModal';
import SfuRoomEmbed from './components/SfuRoomEmbed';
import { CookieConsent } from './components/CookieConsent';
import { LegalFooter } from './components/LegalFooter';
import { AncloraMark } from './components/AncloraMark';
import { LegalPage } from './components/LegalPage';
import {
  buildInviteLink,
  extractHostPeerId,
  extractRoomCode,
  normalizeRoomCode,
  shouldInitiateCall,
  stopMediaStream,
} from './utils/callSession';
import { toSrt, toVtt, TranscriptEntry } from './utils/transcript';
import { applyInsertableE2EE, supportsInsertableStreams } from './utils/e2ee';
import { detectLanguageHeuristic } from './utils/languageDetection';
import { translateLocalText } from './utils/localMt';
import { translateWithBergamotIfAvailable } from './utils/bergamotMt';

interface ChatMessage {
  id: string;
  sender: 'me' | 'peer';
  text: string;
  translatedText?: string;
  timestamp: number;
}

interface QualityProfile {
  label: string;
  width: number;
  height: number;
  maxBitrate: number;
}

interface SessionInfo {
  token: string;
  userId: string;
  displayName: string;
  role: 'agent' | 'investor';
  expiresAt: number;
}

interface ConsentResponse {
  status: string;
  consent_id: string;
}

interface UsageSummary {
  translated_chars: number;
  tts_chars: number;
  translated_limit: number;
  tts_limit: number;
}

interface SessionCostSummary {
  estimated_total_cost_eur: number;
}

interface SessionSloSummary {
  pass_slo: boolean;
  ttfc_ms_p50: number | null;
  ttfc_ms_p95: number | null;
  caption_lag_ms_p95: number | null;
  dropped_hypothesis_rate_pct_avg: number | null;
}

interface TelemetrySummary {
  schema_version: string;
  total_events: number;
  reconnect_events: number;
  precheck_failures: number;
  caption_metrics_events: number;
  webrtc_metrics_events: number;
  error_events: number;
  timeout_events: number;
  ttfc_ms_p50: number | null;
  ttfc_ms_p95: number | null;
  caption_lag_ms_p50: number | null;
  caption_lag_ms_p95: number | null;
  webrtc_rtt_ms_p95: number | null;
  webrtc_jitter_ms_p95: number | null;
  webrtc_packet_loss_pct_p95: number | null;
  webrtc_bitrate_kbps_p50: number | null;
  latest_webrtc_quality: string | null;
  dropped_hypothesis_rate_pct_avg: number | null;
}

interface RoomResolveResponse {
  room_code: string;
  participants: number;
  target_peer_id: string | null;
  initiator_peer_id: string | null;
}

interface TelemetryEventPayload {
  [key: string]: string | number | boolean | null | undefined | Array<string | number | boolean>;
}

type UiLocale = 'es' | 'en' | 'de' | 'ru' | 'fr' | 'it';

const QUALITY_PROFILES: Record<string, QualityProfile> = {
  low: { label: 'Low (360p)', width: 640, height: 360, maxBitrate: 500000 },
  medium: { label: 'Medium (720p)', width: 1280, height: 720, maxBitrate: 1500000 },
  high: { label: 'High (1080p)', width: 1920, height: 1080, maxBitrate: 4000000 },
};

const SESSION_STORAGE_KEY = 'anclora_linguo_session';
const UI_LOCALE_STORAGE_KEY = 'anclora_linguo_ui_locale';
const SHOW_HYPOTHESIS_STORAGE_KEY = 'anclora_show_hypothesis_subtitles';
const LOW_BANDWIDTH_STORAGE_KEY = 'anclora_low_bandwidth_mode';
const CAPTION_SIZE_STORAGE_KEY = 'anclora_caption_size';
const CAPTION_POSITION_STORAGE_KEY = 'anclora_caption_position';
const CAPTION_CONTRAST_STORAGE_KEY = 'anclora_caption_contrast';
const LAST_ROOM_STORAGE_KEY = 'anclora_last_room_code';
const ROOM_QUERY_PARAM = 'room';

const UI_LOCALE_OPTIONS: Array<{ code: UiLocale; label: string }> = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ru', label: 'Русский' },
  { code: 'fr', label: 'Français' },
  { code: 'it', label: 'Italiano' },
];

const UI_TEXTS: Record<UiLocale, Record<string, string>> = {
  es: {
    appTitle: 'Anclora Linguo Cam',
    appSubtitle: 'Comunicación global, sin barreras.',
    yourPeerId: 'Tu ID de Peer',
    iSpeak: 'Yo hablo',
    theySpeak: 'Ellos hablan',
    callQuality: 'Calidad de llamada',
    joinRoom: 'Unirse a sala',
    joinRoomPlaceholder: 'Introduce el Peer ID para llamar...',
    connecting: 'Conectando...',
    startCall: 'Iniciar llamada con traducción',
    copyHint: 'Pide a la otra persona su Peer ID para conectar.',
    copyInviteLink: 'Copiar enlace',
    runPrecheck: 'Pre-check',
    checkingPrecheck: 'Comprobando...',
    precheckOk: 'Pre-check OK: cámara, micrófono y red listos.',
    precheckFail: 'Pre-check con incidencias. Revisa permisos o red.',
    cameraPermDenied: 'Cámara o micrófono bloqueados. Haz clic en el icono 🔒 de la barra de dirección → Permisos → Permitir cámara y micrófono, y vuelve a intentarlo.',
    waitingInRoom: 'Esperando a otro participante en la sala...',
    secureAccess: 'Acceso a la reunión',
    secureAccessDesc: 'Cada reunión requiere participantes autenticados antes de conectar.',
    name: 'Participante',
    namePlaceholder: 'Nombre completo',
    role: 'Perfil',
    agent: 'Anfitrión',
    investor: 'Inversor',
    creatingSession: 'Preparando reunión...',
    enterWorkspace: 'Unirse a la reunión',
    signOut: 'Cerrar sesión',
    authNameError: 'Introduce tu nombre para continuar.',
    authCreateError: 'No se pudo crear una sesión segura. Revisa la conexión con backend.',
    validatingSession: 'Validando sesión segura...',
  },
  en: {
    appTitle: 'Anclora Linguo Cam',
    appSubtitle: 'Global communication, zero barriers.',
    yourPeerId: 'Your Peer ID',
    iSpeak: 'I speak',
    theySpeak: 'They speak',
    callQuality: 'Call quality',
    joinRoom: 'Join room',
    joinRoomPlaceholder: 'Enter Peer ID to call...',
    connecting: 'Connecting...',
    startCall: 'Start translation call',
    copyHint: 'Ask the other person for their Peer ID to connect.',
    copyInviteLink: 'Copy invite link',
    runPrecheck: 'Pre-check',
    checkingPrecheck: 'Checking...',
    precheckOk: 'Pre-check OK: camera, microphone and network ready.',
    precheckFail: 'Pre-check failed. Review permissions or network.',
    cameraPermDenied: 'Camera or microphone blocked. Click the 🔒 icon in the address bar → Permissions → Allow camera and microphone, then try again.',
    waitingInRoom: 'Waiting for another participant in the room...',
    secureAccess: 'Meeting access',
    secureAccessDesc: 'Every meeting requires authenticated participants before connection.',
    name: 'Participant',
    namePlaceholder: 'Full name',
    role: 'Profile',
    agent: 'Host',
    investor: 'Investor',
    creatingSession: 'Preparing meeting...',
    enterWorkspace: 'Join meeting',
    signOut: 'Sign out',
    authNameError: 'Enter your name to continue.',
    authCreateError: 'Could not create a secure session. Check backend connectivity.',
    validatingSession: 'Validating secure session...',
  },
  de: {
    appTitle: 'Anclora Linguo Cam',
    appSubtitle: 'Globale Kommunikation ohne Barrieren.',
    yourPeerId: 'Deine Peer-ID',
    iSpeak: 'Ich spreche',
    theySpeak: 'Sie sprechen',
    callQuality: 'Anrufqualität',
    joinRoom: 'Raum beitreten',
    joinRoomPlaceholder: 'Peer-ID zum Anrufen eingeben...',
    connecting: 'Verbinden...',
    startCall: 'Übersetzungsanruf starten',
    copyHint: 'Bitte die andere Person um ihre Peer-ID.',
    copyInviteLink: 'Link kopieren',
    runPrecheck: 'Pre-Check',
    checkingPrecheck: 'Prüfung...',
    precheckOk: 'Pre-Check OK: Kamera, Mikrofon und Netzwerk bereit.',
    precheckFail: 'Pre-Check fehlgeschlagen. Berechtigungen/Netz prüfen.',
    cameraPermDenied: 'Kamera oder Mikrofon blockiert. Klick auf 🔒 in der Adressleiste → Berechtigungen → Kamera und Mikrofon erlauben.',
    waitingInRoom: 'Warte auf einen weiteren Teilnehmer im Raum...',
    secureAccess: 'Meeting-Zugang',
    secureAccessDesc: 'Jedes Meeting erfordert authentifizierte Teilnehmer vor der Verbindung.',
    name: 'Teilnehmer',
    namePlaceholder: 'Vollständiger Name',
    role: 'Profil',
    agent: 'Gastgeber',
    investor: 'Investor',
    creatingSession: 'Meeting wird vorbereitet...',
    enterWorkspace: 'Meeting beitreten',
    signOut: 'Abmelden',
    authNameError: 'Bitte gib deinen Namen ein.',
    authCreateError: 'Sichere Sitzung konnte nicht erstellt werden.',
    validatingSession: 'Sichere Sitzung wird geprüft...',
  },
  ru: {
    appTitle: 'Anclora Linguo Cam',
    appSubtitle: 'Глобальное общение без барьеров.',
    yourPeerId: 'Ваш Peer ID',
    iSpeak: 'Я говорю',
    theySpeak: 'Они говорят',
    callQuality: 'Качество звонка',
    joinRoom: 'Войти в комнату',
    joinRoomPlaceholder: 'Введите Peer ID для звонка...',
    connecting: 'Подключение...',
    startCall: 'Начать звонок с переводом',
    copyHint: 'Попросите собеседника прислать Peer ID.',
    copyInviteLink: 'Копировать ссылку',
    runPrecheck: 'Пре-чек',
    checkingPrecheck: 'Проверка...',
    precheckOk: 'Пре-чек OK: камера, микрофон и сеть готовы.',
    precheckFail: 'Проблема в пре-чеке. Проверьте сеть/разрешения.',
    cameraPermDenied: 'Камера или микрофон заблокированы. Нажмите 🔒 в адресной строке → Разрешения → Разрешить камеру и микрофон.',
    waitingInRoom: 'Ожидание второго участника в комнате...',
    secureAccess: 'Доступ к встрече',
    secureAccessDesc: 'Перед подключением все участники встречи должны быть аутентифицированы.',
    name: 'Участник',
    namePlaceholder: 'Полное имя',
    role: 'Профиль',
    agent: 'Организатор',
    investor: 'Инвестор',
    creatingSession: 'Подготовка встречи...',
    enterWorkspace: 'Присоединиться к встрече',
    signOut: 'Выйти',
    authNameError: 'Введите имя, чтобы продолжить.',
    authCreateError: 'Не удалось создать безопасную сессию.',
    validatingSession: 'Проверка защищенной сессии...',
  },
  fr: {
    appTitle: 'Anclora Linguo Cam',
    appSubtitle: 'Communication mondiale, sans barrières.',
    yourPeerId: 'Votre ID Peer',
    iSpeak: 'Je parle',
    theySpeak: 'Ils parlent',
    callQuality: 'Qualité d’appel',
    joinRoom: 'Rejoindre la salle',
    joinRoomPlaceholder: 'Entrez le Peer ID pour appeler...',
    connecting: 'Connexion...',
    startCall: 'Démarrer l’appel traduit',
    copyHint: 'Demandez le Peer ID de l’autre personne.',
    copyInviteLink: 'Copier le lien',
    runPrecheck: 'Pré-check',
    checkingPrecheck: 'Vérification...',
    precheckOk: 'Pré-check OK : caméra, micro et réseau prêts.',
    precheckFail: 'Pré-check en échec. Vérifiez permissions/réseau.',
    cameraPermDenied: 'Caméra ou microphone bloqués. Cliquez sur 🔒 dans la barre d’adresse → Autorisations → Autoriser caméra et micro.',
    waitingInRoom: 'En attente d’un autre participant dans la salle...',
    secureAccess: 'Accès à la réunion',
    secureAccessDesc: 'Chaque réunion nécessite des participants authentifiés avant connexion.',
    name: 'Participant',
    namePlaceholder: 'Nom complet',
    role: 'Profil',
    agent: 'Hôte',
    investor: 'Investisseur',
    creatingSession: 'Préparation de la réunion...',
    enterWorkspace: 'Rejoindre la réunion',
    signOut: 'Déconnexion',
    authNameError: 'Entrez votre nom pour continuer.',
    authCreateError: 'Impossible de créer une session sécurisée.',
    validatingSession: 'Validation de la session sécurisée...',
  },
  it: {
    appTitle: 'Anclora Linguo Cam',
    appSubtitle: 'Comunicazione globale, zero barriere.',
    yourPeerId: 'Il tuo Peer ID',
    iSpeak: 'Io parlo',
    theySpeak: 'Loro parlano',
    callQuality: 'Qualità chiamata',
    joinRoom: 'Entra nella stanza',
    joinRoomPlaceholder: 'Inserisci il Peer ID per chiamare...',
    connecting: 'Connessione...',
    startCall: 'Avvia chiamata tradotta',
    copyHint: "Chiedi all'altra persona il suo Peer ID.",
    copyInviteLink: 'Copia link',
    runPrecheck: 'Pre-check',
    checkingPrecheck: 'Verifica...',
    precheckOk: 'Pre-check OK: camera, microfono e rete pronti.',
    precheckFail: 'Pre-check fallito. Controlla permessi o rete.',
    cameraPermDenied: 'Fotocamera o microfono bloccati. Clicca 🔒 nella barra degli indirizzi → Autorizzazioni → Consenti fotocamera e microfono.',
    waitingInRoom: 'In attesa di un altro partecipante nella stanza...',
    secureAccess: 'Accesso alla riunione',
    secureAccessDesc: 'Ogni riunione richiede partecipanti autenticati prima della connessione.',
    name: 'Partecipante',
    namePlaceholder: 'Nome completo',
    role: 'Profilo',
    agent: 'Host',
    investor: 'Investitore',
    creatingSession: 'Preparazione riunione...',
    enterWorkspace: 'Unisciti alla riunione',
    signOut: 'Esci',
    authNameError: 'Inserisci il tuo nome per continuare.',
    authCreateError: 'Impossibile creare una sessione sicura.',
    validatingSession: 'Verifica sessione sicura...',
  },
};
const ENABLE_E2E_HOOKS = import.meta.env.VITE_ENABLE_E2E_HOOKS === 'true';

const percentile = (values: number[], p: number): number | null => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
};

const updateCaptionTrack = (
  prevConfirmed: string,
  prevLastHypothesis: string,
  prevStableCount: number,
  nextText: string,
  isFinal: boolean,
): { confirmed: string; hypothesis: string; lastHypothesis: string; stableCount: number } => {
  if (isFinal) {
    return {
      confirmed: nextText.trim(),
      hypothesis: '',
      lastHypothesis: '',
      stableCount: 0,
    };
  }

  const normalized = nextText.trim();
  const stableCount = normalized && normalized === prevLastHypothesis ? prevStableCount + 1 : 1;
  const shouldCommit = stableCount >= 2 && normalized.length > prevConfirmed.length;
  if (shouldCommit) {
    return {
      confirmed: normalized,
      hypothesis: '',
      lastHypothesis: normalized,
      stableCount,
    };
  }

  if (normalized.startsWith(prevConfirmed)) {
    return {
      confirmed: prevConfirmed,
      hypothesis: normalized.slice(prevConfirmed.length).trim(),
      lastHypothesis: normalized,
      stableCount,
    };
  }

  return {
    confirmed: prevConfirmed,
    hypothesis: normalized,
    lastHypothesis: normalized,
    stableCount,
  };
};

const App: React.FC = () => {
  const [status, setStatus] = useState<CallStatus>(CallStatus.IDLE);
  const [peerId, setPeerId] = useState<string>('');
  const [targetPeerId, setTargetPeerId] = useState<string>(() => {
    return localStorage.getItem(LAST_ROOM_STORAGE_KEY) || '';
  });
  const [inviteHostPeerId, setInviteHostPeerId] = useState<string>('');
  const [myLang, setMyLang] = useState('es');
  const [remoteLang, setRemoteLang] = useState('en');
  const [quality, setQuality] = useState('medium');
  const [remoteVolume, setRemoteVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isPttPressed, setIsPttPressed] = useState(false);
  const [isHandsFree, setIsHandsFree] = useState(false);

  const [localSubtitleConfirmed, setLocalSubtitleConfirmed] = useState('');
  const [localSubtitleHypothesis, setLocalSubtitleHypothesis] = useState('');
  const [remoteSubtitleConfirmed, setRemoteSubtitleConfirmed] = useState('');
  const [remoteSubtitleHypothesis, setRemoteSubtitleHypothesis] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHypothesisSubtitles, setShowHypothesisSubtitles] = useState<boolean>(() => {
    const stored = localStorage.getItem(SHOW_HYPOTHESIS_STORAGE_KEY);
    if (stored === null) return true;
    return stored !== 'false';
  });
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [translatingMessageId, setTranslatingMessageId] = useState<string | null>(null);

  const [lowBandwidthMode, setLowBandwidthMode] = useState<boolean>(() => {
    return localStorage.getItem(LOW_BANDWIDTH_STORAGE_KEY) === 'true';
  });
  const [lowBandwidthSuggested, setLowBandwidthSuggested] = useState(false);
  const [captionSize, setCaptionSize] = useState<CaptionSize>(() => {
    return (localStorage.getItem(CAPTION_SIZE_STORAGE_KEY) as CaptionSize) || 'md';
  });
  const [captionPosition, setCaptionPosition] = useState<CaptionPosition>(() => {
    return (localStorage.getItem(CAPTION_POSITION_STORAGE_KEY) as CaptionPosition) || 'bottom';
  });
  const [captionContrast, setCaptionContrast] = useState<CaptionContrast>(() => {
    return (localStorage.getItem(CAPTION_CONTRAST_STORAGE_KEY) as CaptionContrast) || 'normal';
  });

  const [session, setSession] = useState<SessionInfo | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authName, setAuthName] = useState('');
  const [authRole, setAuthRole] = useState<'agent' | 'investor'>('agent');
  const [authError, setAuthError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [, setUsageSummary] = useState<UsageSummary | null>(null);
  const [qaTelemetrySummary, setQaTelemetrySummary] = useState<TelemetrySummary | null>(null);
  const [qaSloSummary, setQaSloSummary] = useState<SessionSloSummary | null>(null);
  const [isRunningPrecallCheck, setIsRunningPrecallCheck] = useState(false);
  const [preCallStatus, setPreCallStatus] = useState('');
  const [preCallError, setPreCallError] = useState(false);
  const [uiLocale, setUiLocale] = useState<UiLocale>(() => {
    const stored = localStorage.getItem(UI_LOCALE_STORAGE_KEY) as UiLocale | null;
    return stored && UI_TEXTS[stored] ? stored : 'es';
  });
  const [peerConnectionState, setPeerConnectionState] = useState<'connected' | 'reconnecting' | 'down'>('connected');
  const [networkNotice, setNetworkNotice] = useState<string>('');
  const [activeSfuRoomUrl, setActiveSfuRoomUrl] = useState<string | null>(null);
  const backpressureTelemetryRef = useRef(false);
  const autoDetectedLanguageRef = useRef<string | null>(null);
  const [e2eeState, setE2eeState] = useState<'off' | 'enabled' | 'unsupported' | 'error'>('off');

  const [showConsentModal, setShowConsentModal] = useState(false);
  const [recordingConsentGranted, setRecordingConsentGranted] = useState(false);
  const activeCallIdRef = useRef<string>('');
  const consentRegisteredRef = useRef(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pttActiveRef = useRef(false);
  const handsFreeActiveRef = useRef(false);
  const qualityRef = useRef(quality);
  const myLangRef = useRef(myLang);
  const remoteLangRef = useRef(remoteLang);
  const webRtcQualityRef = useRef<'good' | 'medium' | 'bad' | 'unknown'>('unknown');
  const remoteVolumeRef = useRef(remoteVolume);
  const sessionRef = useRef<SessionInfo | null>(null);
  const statusRef = useRef<CallStatus>(status);
  const resetCallStateRef = useRef<() => void>(() => undefined);
  const lastSubtitleReconnectAttemptRef = useRef<number>(0);
  const trackTelemetryRef = useRef<(eventType: string, payload?: TelemetryEventPayload) => void>(
    () => undefined,
  );
  const localSubtitleConfirmedRef = useRef('');
  const remoteSubtitleConfirmedRef = useRef('');
  const localSubtitleTrackRef = useRef({ lastHypothesis: '', stableCount: 0 });
  const remoteSubtitleTrackRef = useRef({ lastHypothesis: '', stableCount: 0 });
  const callStartedAtRef = useRef<number | null>(null);
  const firstRemoteSubtitleAtRef = useRef<number | null>(null);
  const captionLagSamplesRef = useRef<number[]>([]);
  const hypothesisSentRef = useRef(0);
  const hypothesisDroppedRef = useRef(0);
  const callSetupStartedAtRef = useRef<number | null>(null);
  const callSetupMsRef = useRef<number | null>(null);
  const peerReconnectCountRef = useRef(0);
  const lastWebRtcTelemetryAtRef = useRef(0);
  const endpointProfileRef = useRef<'normal' | 'aggressive'>('normal');
  const chunkProfileRef = useRef<'fast' | 'normal' | 'stable'>('normal');

  const peerRef = useRef<Peer | null>(null);
  const currentCallRef = useRef<any>(null);
  const dataConnRef = useRef<any>(null);
  const captionsHypChannelRef = useRef<RTCDataChannel | null>(null);
  const captionsCommitChannelRef = useRef<RTCDataChannel | null>(null);
  const subtitleSeqRef = useRef(0);
  const remoteSubtitleOrderRef = useRef({ lastHypSeq: -1, lastCommitSeq: -1 });
  const seenCaptionIdsRef = useRef<string[]>([]);

  const appendTranscriptEntry = useCallback((speaker: string, text: string) => {
    const cleaned = text.trim();
    if (!cleaned) return;
    const timestampMs = Date.now();
    setTranscriptEntries((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.speaker === speaker && last.text === cleaned && (timestampMs - last.timestampMs) < 1200) {
        return prev;
      }
      return [...prev, { speaker, text: cleaned, timestampMs }];
    });
  }, []);

  const webrtcStats = useWebRtcStats(
    currentCallRef.current?.peerConnection ?? null,
    status === CallStatus.ACTIVE,
  );

  const streaming = useStreamingTranslation({
    provider: TRANSLATION_STREAM_PROVIDER,
    wsUrl: ASR_MT_WS_URL,
    geminiTokenUrl: GEMINI_LIVE_TOKEN_URL,
    geminiLiveWsUrl: GEMINI_LIVE_WS_URL,
    authToken: session?.token,
    sampleRate: SAMPLE_RATE,
    chunkFrames: AUDIO_CHUNK_FRAMES,
    maxBufferedBytes: ASR_WS_MAX_BUFFERED_BYTES,
    vadThreshold: VAD_THRESHOLD,
    minSpeechMs: VAD_MIN_SPEECH_MS,
    minSilenceMs: VAD_MIN_SILENCE_MS,
    maxSegmentMs: VAD_MAX_SEGMENT_MS,
    hangoverMs: VAD_HANGOVER_MS,
    sourceLang: myLang,
    targetLang: remoteLang,
    onSubtitle: (text, isFinal, rawText) => {
      if (myLang === 'auto' && isFinal) {
        const detection = detectLanguageHeuristic(rawText || text);
        if (
          detection.code !== 'auto'
          && detection.confidence >= 0.68
          && autoDetectedLanguageRef.current !== detection.code
        ) {
          autoDetectedLanguageRef.current = detection.code;
          setMyLang(detection.code);
          trackTelemetryRef.current('auto_language_detected', {
            detected_lang: detection.code,
            confidence: detection.confidence,
          });
        }
      }
      const originTsMs = Date.now();
      const sequence = subtitleSeqRef.current++;
      const next = updateCaptionTrack(
        localSubtitleConfirmedRef.current,
        localSubtitleTrackRef.current.lastHypothesis,
        localSubtitleTrackRef.current.stableCount,
        text,
        isFinal,
      );
      localSubtitleTrackRef.current = {
        lastHypothesis: next.lastHypothesis,
        stableCount: next.stableCount,
      };
      localSubtitleConfirmedRef.current = next.confirmed;
      setLocalSubtitleConfirmed(next.confirmed);
      setLocalSubtitleHypothesis(next.hypothesis);
      if (!isFinal) {
        hypothesisSentRef.current += 1;
      }
      const payload = {
        type: 'subtitle',
        caption_id: `cap-${sequence}`,
        text,
        is_final: isFinal,
        origin_ts_ms: originTsMs,
        seq: sequence,
      };

      if (isFinal) {
        appendTranscriptEntry(sessionRef.current?.displayName || 'You', text);
        if (captionsCommitChannelRef.current?.readyState === 'open') {
          captionsCommitChannelRef.current.send(JSON.stringify(payload));
        } else if (dataConnRef.current?.open) {
          dataConnRef.current.send(payload);
        }
      } else {
        if (captionsHypChannelRef.current?.readyState === 'open') {
          captionsHypChannelRef.current.send(JSON.stringify(payload));
        } else {
          hypothesisDroppedRef.current += 1;
        }
      }
      if (isFinal) {
        setTimeout(() => {
          localSubtitleConfirmedRef.current = '';
          setLocalSubtitleConfirmed('');
          setLocalSubtitleHypothesis('');
          localSubtitleTrackRef.current = { lastHypothesis: '', stableCount: 0 };
        }, 3000);
      }
    },
  });

  const {
    latencyMs,
    connectionState: translationConnectionState,
    reconnectAttempts: translationReconnectAttempts,
    droppedAudioChunks,
    isBackpressured,
    setSendActive,
    setEndpointingConfig,
    start: startStreaming,
    stop: stopStreaming,
  } = streaming;

  const hasUnreadPeerMessages = !isChatOpen && messages.some((msg) => msg.sender === 'peer');
  const myLangName = SUPPORTED_LANGUAGES.find((l) => l.code === myLang)?.name || myLang;
  const remoteLangName = SUPPORTED_LANGUAGES.find((l) => l.code === remoteLang)?.name || remoteLang;
  const ui = UI_TEXTS[uiLocale];
  const localSubtitle = `${localSubtitleConfirmed} ${localSubtitleHypothesis}`.trim();
  const remoteSubtitle = `${remoteSubtitleConfirmed} ${remoteSubtitleHypothesis}`.trim();

  const recording = useRecording({
    localVideoRef,
    remoteVideoRef,
    canvasRef,
    getLocalStream: () => cameraStreamRef.current,
    getRemoteStream: () => remoteStreamRef.current,
    isScreenSharing,
    localSubtitle,
    remoteSubtitle,
  });

  const applyBitrateLimit = useCallback(async (call: any, maxBitrate: number) => {
    if (!call?.peerConnection) return;
    const senders = call.peerConnection.getSenders();
    const videoSender = senders.find((s: any) => s.track && s.track.kind === 'video');
    if (videoSender) {
      const parameters = videoSender.getParameters();
      if (!parameters.encodings) parameters.encodings = [{}];
      parameters.encodings[0].maxBitrate = maxBitrate;
      await videoSender.setParameters(parameters);
      console.log(`Applied bitrate limit: ${maxBitrate / 1000}kbps`);
    }
  }, []);

  const tryEnableE2EE = useCallback((call: any) => {
    if (!ENABLE_INSERTABLE_E2EE) {
      setE2eeState('off');
      return;
    }
    const pc: RTCPeerConnection | null = call?.peerConnection ?? null;
    if (!pc) return;
    if (!supportsInsertableStreams()) {
      setE2eeState('unsupported');
      setNetworkNotice('Insertable-stream E2EE is not supported in this browser.');
      trackTelemetryRef.current('e2ee_unsupported', { topology: CALL_TOPOLOGY });
      return;
    }
    const applied = applyInsertableE2EE(pc, E2EE_SHARED_KEY);
    if (applied) {
      setE2eeState('enabled');
      trackTelemetryRef.current('e2ee_enabled', { topology: CALL_TOPOLOGY });
    } else {
      setE2eeState('error');
      setNetworkNotice('E2EE key missing or invalid. Falling back to transport encryption only.');
      trackTelemetryRef.current('e2ee_error', { topology: CALL_TOPOLOGY });
    }
  }, []);

  const handleIncomingSubtitle = useCallback((payload: any) => {
    const text = typeof payload?.text === 'string' ? payload.text : '';
    if (!text) return;
    const captionId = typeof payload?.caption_id === 'string' ? payload.caption_id : '';
    if (captionId) {
      if (seenCaptionIdsRef.current.includes(captionId)) {
        return;
      }
      seenCaptionIdsRef.current.push(captionId);
      if (seenCaptionIdsRef.current.length > 300) {
        seenCaptionIdsRef.current.splice(0, seenCaptionIdsRef.current.length - 300);
      }
    }
    const seq = typeof payload?.seq === 'number' ? payload.seq : Number(payload?.seq ?? -1);
    const isFinal = Boolean(payload?.is_final);
    const orderState = remoteSubtitleOrderRef.current;
    if (Number.isFinite(seq) && seq >= 0) {
      if (isFinal) {
        if (seq <= orderState.lastCommitSeq) {
          return;
        }
        orderState.lastCommitSeq = seq;
        if (orderState.lastHypSeq < seq) {
          orderState.lastHypSeq = seq;
        }
      } else {
        if (seq <= Math.max(orderState.lastHypSeq, orderState.lastCommitSeq)) {
          return;
        }
        orderState.lastHypSeq = seq;
      }
    }
    const originTsMs =
      typeof payload.origin_ts_ms === 'number'
        ? payload.origin_ts_ms
        : Number(payload.origin_ts_ms || 0);
    if (originTsMs > 0) {
      const lag = Date.now() - originTsMs;
      if (lag >= 0 && lag < 120000) {
        if (captionLagSamplesRef.current.length >= 200) {
          captionLagSamplesRef.current.shift();
        }
        captionLagSamplesRef.current.push(lag);
      }
    }
    if (!firstRemoteSubtitleAtRef.current && callStartedAtRef.current) {
      firstRemoteSubtitleAtRef.current = Date.now();
      trackTelemetryRef.current('caption_ttfc', {
        ttfc_ms: firstRemoteSubtitleAtRef.current - callStartedAtRef.current,
      });
    }
    const next = updateCaptionTrack(
      remoteSubtitleConfirmedRef.current,
      remoteSubtitleTrackRef.current.lastHypothesis,
      remoteSubtitleTrackRef.current.stableCount,
      text,
      isFinal,
    );
    remoteSubtitleTrackRef.current = {
      lastHypothesis: next.lastHypothesis,
      stableCount: next.stableCount,
    };
    remoteSubtitleConfirmedRef.current = next.confirmed;
    if (isFinal) {
      appendTranscriptEntry('Peer', text);
    }
    setRemoteSubtitleConfirmed(next.confirmed);
    setRemoteSubtitleHypothesis(next.hypothesis);
    const subtitleTimeout = isFinal ? 4000 : 1800;
    setTimeout(() => {
      if (isFinal) {
        remoteSubtitleConfirmedRef.current = '';
        setRemoteSubtitleConfirmed('');
        setRemoteSubtitleHypothesis('');
        remoteSubtitleTrackRef.current = { lastHypothesis: '', stableCount: 0 };
      } else if (remoteSubtitleTrackRef.current.lastHypothesis === next.lastHypothesis) {
        setRemoteSubtitleHypothesis('');
      }
    }, subtitleTimeout);
  }, [appendTranscriptEntry]);

  const setupCaptionChannels = useCallback((call: any, isInitiator: boolean) => {
    const pc: RTCPeerConnection | null = call?.peerConnection ?? null;
    if (!pc) return;

    const bindIncoming = (channel: RTCDataChannel) => {
      if (channel.label === 'captions_hyp') {
        captionsHypChannelRef.current = channel;
      } else if (channel.label === 'captions_commit') {
        captionsCommitChannelRef.current = channel;
      } else {
        return;
      }

      channel.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.type !== 'subtitle') return;
          handleIncomingSubtitle(payload);
        } catch {
          // Ignore malformed caption payloads.
        }
      };
    };

    pc.ondatachannel = (event) => {
      bindIncoming(event.channel);
    };

    if (isInitiator) {
      if (!captionsHypChannelRef.current) {
        const hyp = pc.createDataChannel('captions_hyp', {
          ordered: false,
          maxRetransmits: 0,
        });
        bindIncoming(hyp);
      }
      if (!captionsCommitChannelRef.current) {
        const commit = pc.createDataChannel('captions_commit', {
          ordered: true,
        });
        bindIncoming(commit);
      }
    }
  }, [handleIncomingSubtitle]);

  const setupDataChannel = useCallback((conn: any) => {
    conn.on('open', () => {
      setNetworkNotice('');
    });

    conn.on('data', (data: any) => {
      if (data.type === 'subtitle') {
        // Legacy fallback path through PeerJS data connection.
        handleIncomingSubtitle(data);
      } else if (data.type === 'chat') {
        const newMessage: ChatMessage = {
          id: Math.random().toString(36).substring(2, 9),
          sender: 'peer',
          text: data.text,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, newMessage]);
        setIsChatOpen(true);
      }
    });

    conn.on('close', () => {
      if (statusRef.current === CallStatus.ACTIVE) {
        setNetworkNotice('Data channel closed. Chat/subtitles sync may be limited.');
      }
    });

    conn.on('error', () => {
      if (statusRef.current === CallStatus.ACTIVE) {
        setNetworkNotice('Data channel error detected.');
      }
    });
  }, [handleIncomingSubtitle]);

  const handleCall = useCallback((call: any, stream: MediaStream) => {
    setupCaptionChannels(call, false);
    tryEnableE2EE(call);
    setStatus(CallStatus.ACTIVE);
    setIsHandsFree(true);
    setIsPttPressed(false);
    pttActiveRef.current = false;
    setNetworkNotice('');
    localSubtitleConfirmedRef.current = '';
    remoteSubtitleConfirmedRef.current = '';
    localSubtitleTrackRef.current = { lastHypothesis: '', stableCount: 0 };
    remoteSubtitleTrackRef.current = { lastHypothesis: '', stableCount: 0 };
    setLocalSubtitleConfirmed('');
    setLocalSubtitleHypothesis('');
    setRemoteSubtitleConfirmed('');
    setRemoteSubtitleHypothesis('');
    setTranscriptEntries([]);
    remoteSubtitleOrderRef.current = { lastHypSeq: -1, lastCommitSeq: -1 };
    seenCaptionIdsRef.current = [];
    callStartedAtRef.current = Date.now();
    callSetupMsRef.current = callSetupStartedAtRef.current
      ? callStartedAtRef.current - callSetupStartedAtRef.current
      : null;
    firstRemoteSubtitleAtRef.current = null;
    captionLagSamplesRef.current = [];
    hypothesisSentRef.current = 0;
    hypothesisDroppedRef.current = 0;
    subtitleSeqRef.current = 0;
    autoDetectedLanguageRef.current = null;
    trackTelemetryRef.current('call_started', {
      quality,
      call_setup_ms: callSetupMsRef.current ?? -1,
    });
    call.on('stream', (remoteStream: MediaStream) => {
      remoteStreamRef.current = remoteStream;
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.volume = remoteVolumeRef.current;
      }
    });
    call.on('close', () => {
      setNetworkNotice('Call ended or dropped.');
      resetCallStateRef.current();
    });
    call.on('error', () => {
      setNetworkNotice('Call transport error. Trying to recover.');
      trackTelemetryRef.current('call_transport_error');
    });
    streamingStartRef.current(stream);
  }, [quality, setupCaptionChannels, tryEnableE2EE]);

  const handleCallRef = useRef(handleCall);
  const setupDataChannelRef = useRef(setupDataChannel);
  const cameraPermissionDeniedTextRef = useRef(ui.cameraPermDenied);

  useEffect(() => {
    handleCallRef.current = handleCall;
    setupDataChannelRef.current = setupDataChannel;
    cameraPermissionDeniedTextRef.current = ui.cameraPermDenied;
  }, [handleCall, setupDataChannel, ui.cameraPermDenied]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatOpen]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.volume = isMuted ? 0 : remoteVolume;
    }
    remoteVolumeRef.current = remoteVolume;
  }, [remoteVolume, isMuted]);

  // Re-bind streams after ACTIVE view mounts; avoids blank local preview on mobile/desktop.
  useEffect(() => {
    if (status !== CallStatus.ACTIVE) return;

    const localStream = isScreenSharing ? screenStreamRef.current : cameraStreamRef.current;
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.muted = true;
      localVideoRef.current.play().catch(() => undefined);
    }

    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
      remoteVideoRef.current.volume = isMuted ? 0 : remoteVolumeRef.current;
      remoteVideoRef.current.play().catch(() => undefined);
    }
  }, [status, isScreenSharing, isMuted]);

  useEffect(() => {
    handsFreeActiveRef.current = isHandsFree;
    setSendActive(isHandsFree || pttActiveRef.current);
  }, [isHandsFree, setSendActive]);

  useEffect(() => {
    qualityRef.current = quality;
  }, [quality]);

  useEffect(() => {
    myLangRef.current = myLang;
    remoteLangRef.current = remoteLang;
  }, [myLang, remoteLang]);

  useEffect(() => {
    webRtcQualityRef.current = webrtcStats.quality;
  }, [webrtcStats.quality]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    if (!ENABLE_E2E_HOOKS) return;
    (window as any).__E2E_SEND_SUBTITLE = (text: string) => {
      const payload = {
        type: 'subtitle',
        caption_id: `cap-${subtitleSeqRef.current}`,
        text,
        is_final: true,
        origin_ts_ms: Date.now(),
        seq: subtitleSeqRef.current++,
      };
      if (captionsCommitChannelRef.current?.readyState === 'open') {
        captionsCommitChannelRef.current.send(JSON.stringify(payload));
        return true;
      }
      if (dataConnRef.current?.open) {
        dataConnRef.current.send(payload);
        return true;
      }
      return false;
    };
    return () => {
      delete (window as any).__E2E_SEND_SUBTITLE;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(UI_LOCALE_STORAGE_KEY, uiLocale);
  }, [uiLocale]);

  useEffect(() => {
    localStorage.setItem(SHOW_HYPOTHESIS_STORAGE_KEY, showHypothesisSubtitles ? 'true' : 'false');
  }, [showHypothesisSubtitles]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get(ROOM_QUERY_PARAM);
    if (room && !targetPeerId) {
      setTargetPeerId(normalizeRoomCode(room));
    }
    const hostPeerId = extractHostPeerId(window.location.href);
    if (hostPeerId && hostPeerId !== inviteHostPeerId) {
      setInviteHostPeerId(hostPeerId);
    }
  }, [inviteHostPeerId, targetPeerId]);

  useEffect(() => {
    if (!peerId || targetPeerId) return;
    setTargetPeerId(`ROOM-${peerId}`);
  }, [peerId, targetPeerId]);

  useEffect(() => {
    if (CALL_TOPOLOGY === 'sfu') {
      if (ENABLE_INSERTABLE_E2EE) {
        const support = supportsInsertableStreams();
        setE2eeState(support ? 'enabled' : 'unsupported');
      }
      setNetworkNotice('SFU topology enabled: call join redirects to external SFU room.');
      return;
    }
    if (!HAS_TURN_SERVER) {
      setNetworkNotice(
        ICE_SERVER_WARNINGS[0] || 'TURN not configured. Calls may fail on restrictive NAT/firewall networks.',
      );
    }
  }, []);

  useEffect(() => {
    if (status !== CallStatus.ACTIVE) return;
    if (translationConnectionState === 'reconnecting') {
      if (lastSubtitleReconnectAttemptRef.current !== translationReconnectAttempts) {
        lastSubtitleReconnectAttemptRef.current = translationReconnectAttempts;
        trackTelemetryRef.current('subtitle_reconnecting', { attempt: translationReconnectAttempts });
      }
      setNetworkNotice(
        `Translation stream reconnecting (attempt ${translationReconnectAttempts}/${5})...`,
      );
      return;
    }
    if (translationConnectionState === 'error') {
      setNetworkNotice('Translation stream disconnected. Subtitles may be delayed.');
      trackTelemetryRef.current('subtitle_error');
      return;
    }
    if (translationConnectionState === 'connected') {
      setNetworkNotice('');
    }
  }, [status, translationConnectionState, translationReconnectAttempts]);

  useEffect(() => {
    if (status !== CallStatus.ACTIVE) return;
    if (isBackpressured && !backpressureTelemetryRef.current) {
      backpressureTelemetryRef.current = true;
      trackTelemetryRef.current('audio_backpressure_started', {
        dropped_audio_chunks: droppedAudioChunks,
      });
      setNetworkNotice('Audio upload congested. Prioritizing call stability over subtitle freshness.');
      return;
    }
    if (!isBackpressured && backpressureTelemetryRef.current) {
      backpressureTelemetryRef.current = false;
      trackTelemetryRef.current('audio_backpressure_recovered', {
        dropped_audio_chunks: droppedAudioChunks,
      });
      if (translationConnectionState === 'connected') {
        setNetworkNotice('');
      }
    }
  }, [droppedAudioChunks, isBackpressured, status, translationConnectionState]);

  useEffect(() => {
    if (status !== CallStatus.ACTIVE) return;
    const jitterMs = webrtcStats.jitterMs ?? 0;
    const lossPct = webrtcStats.packetLossPct ?? 0;
    const shouldBeAggressive = jitterMs >= 35 || lossPct >= 3;
    const nextProfile: 'normal' | 'aggressive' = shouldBeAggressive ? 'aggressive' : 'normal';
    if (endpointProfileRef.current === nextProfile) return;
    endpointProfileRef.current = nextProfile;
    if (nextProfile === 'aggressive') {
      setEndpointingConfig({
        minSpeechMs: 160,
        minSilenceMs: 260,
        maxSegmentMs: 1800,
        hangoverMs: 80,
      });
    } else {
      setEndpointingConfig({
        minSpeechMs: VAD_MIN_SPEECH_MS,
        minSilenceMs: VAD_MIN_SILENCE_MS,
        maxSegmentMs: VAD_MAX_SEGMENT_MS,
        hangoverMs: VAD_HANGOVER_MS,
      });
    }
    trackTelemetryRef.current('endpointing_profile_changed', {
      profile: nextProfile,
      jitter_ms: jitterMs,
      packet_loss_pct: lossPct,
    });
  }, [
    setEndpointingConfig,
    status,
    webrtcStats.jitterMs,
    webrtcStats.packetLossPct,
  ]);

  useEffect(() => {
    if (status !== CallStatus.ACTIVE) return;
    const jitterMs = webrtcStats.jitterMs ?? 0;
    const lossPct = webrtcStats.packetLossPct ?? 0;
    const lagMs = latencyMs ?? 0;

    let nextProfile: 'fast' | 'normal' | 'stable' = 'normal';
    if (lossPct >= 4 || jitterMs >= 45 || lagMs >= 1500) {
      nextProfile = 'stable';
    } else if (lossPct <= 1 && jitterMs <= 20 && lagMs > 0 && lagMs <= 800) {
      nextProfile = 'fast';
    }
    if (chunkProfileRef.current === nextProfile) return;
    chunkProfileRef.current = nextProfile;

    if (nextProfile === 'fast') {
      setEndpointingConfig({ chunkSize: 240 });
    } else if (nextProfile === 'stable') {
      setEndpointingConfig({ chunkSize: 480 });
    } else {
      setEndpointingConfig({ chunkSize: AUDIO_CHUNK_FRAMES });
    }

    trackTelemetryRef.current('audio_chunk_profile_changed', {
      profile: nextProfile,
      chunk_frames:
        nextProfile === 'fast'
          ? 240
          : nextProfile === 'stable'
            ? 480
            : AUDIO_CHUNK_FRAMES,
      jitter_ms: jitterMs,
      packet_loss_pct: lossPct,
      subtitle_latency_ms: lagMs || null,
    });
  }, [
    latencyMs,
    setEndpointingConfig,
    status,
    webrtcStats.jitterMs,
    webrtcStats.packetLossPct,
  ]);

  useEffect(() => {
    if (status !== CallStatus.ACTIVE) {
      setLowBandwidthSuggested(false);
      return;
    }
    const jitterMs = webrtcStats.jitterMs ?? 0;
    const lossPct = webrtcStats.packetLossPct ?? 0;
    const poorConnection = lossPct >= 8 || jitterMs >= 200;
    setLowBandwidthSuggested(poorConnection && !lowBandwidthMode);
  }, [status, webrtcStats.jitterMs, webrtcStats.packetLossPct, lowBandwidthMode]);

  const recordingStopRef = useRef(recording.stopRecording);
  const streamingStartRef = useRef(startStreaming);
  const streamingStopRef = useRef(stopStreaming);
  useEffect(() => {
    recordingStopRef.current = recording.stopRecording;
    streamingStartRef.current = startStreaming;
    streamingStopRef.current = stopStreaming;
  }, [recording.stopRecording, startStreaming, stopStreaming]);

  const apiPost = useCallback(async <T,>(path: string, payload: Record<string, unknown>): Promise<T> => {
    const response = await fetch(`${ASR_MT_HTTP_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      if (response.status === 401 && sessionRef.current) {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        setSession(null);
      }
      const errorText = await response.text();
      throw new Error(errorText || `Request failed (${response.status})`);
    }
    return response.json() as Promise<T>;
  }, []);

  const trackTelemetry = useCallback(async (eventType: string, payload: TelemetryEventPayload = {}) => {
    if (!session?.token) return;
    try {
      const enrichedPayload: TelemetryEventPayload = {
        schema_version: 'telemetry.v1',
        source_language: myLangRef.current,
        target_language: remoteLangRef.current,
        translation_provider: ENABLE_LOCAL_MT_PRIVACY ? 'local' : 'asr-mt',
        asr_backend: 'server',
        mt_backend: ENABLE_LOCAL_MT_PRIVACY ? 'browser' : 'server',
        network_condition: webRtcQualityRef.current,
        status: statusRef.current,
        ...payload,
      };
      await apiPost('/api/telemetry/events', {
        token: session.token,
        call_id: activeCallIdRef.current || 'n/a',
        events: [
          {
            type: eventType,
            schema_version: 'telemetry.v1',
            timestamp_ms: Date.now(),
            payload: enrichedPayload,
          },
        ],
      });
    } catch (error) {
      console.error('Telemetry send failed:', error);
    }
  }, [apiPost, session?.token]);

  useEffect(() => {
    if (status !== CallStatus.ACTIVE) return;
    const now = Date.now();
    if (now - lastWebRtcTelemetryAtRef.current < 10_000) return;
    if (
      webrtcStats.bitrateKbps === null
      && webrtcStats.packetLossPct === null
      && webrtcStats.rttMs === null
      && webrtcStats.jitterMs === null
    ) {
      return;
    }
    lastWebRtcTelemetryAtRef.current = now;
    trackTelemetry('webrtc_metrics', {
      bitrate_kbps: webrtcStats.bitrateKbps ?? -1,
      packet_loss_pct: webrtcStats.packetLossPct ?? -1,
      jitter_ms: webrtcStats.jitterMs ?? -1,
      rtt_ms: webrtcStats.rttMs ?? -1,
      ice_state: webrtcStats.iceState || 'unknown',
      connection_state: webrtcStats.connectionState || 'unknown',
      reconnect_count: peerReconnectCountRef.current,
      call_setup_ms: callSetupMsRef.current ?? -1,
      quality: webrtcStats.quality,
    });
  }, [status, trackTelemetry, webrtcStats]);

  const triggerDownload = useCallback((filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, []);

  const exportTranscriptVtt = useCallback(() => {
    if (!transcriptEntries.length) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    triggerDownload(`anclora-transcript-${stamp}.vtt`, toVtt(transcriptEntries), 'text/vtt;charset=utf-8');
  }, [transcriptEntries, triggerDownload]);

  const exportTranscriptSrt = useCallback(() => {
    if (!transcriptEntries.length) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    triggerDownload(`anclora-transcript-${stamp}.srt`, toSrt(transcriptEntries), 'application/x-subrip;charset=utf-8');
  }, [transcriptEntries, triggerDownload]);

  useEffect(() => {
    trackTelemetryRef.current = (eventType: string, payload: TelemetryEventPayload = {}) => {
      trackTelemetry(eventType, payload);
    };
  }, [trackTelemetry]);

  useEffect(() => {
    const restoreSession = async () => {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) {
        setAuthLoading(false);
        return;
      }
      try {
        const stored = JSON.parse(raw) as SessionInfo;
        const validation = await apiPost<{ valid: boolean; display_name: string; role: 'agent' | 'investor'; user_id: string; expires_at: number }>(
          '/api/auth/validate',
          { token: stored.token },
        );
        if (!validation.valid) throw new Error('invalid session');
        const sessionData: SessionInfo = {
          token: stored.token,
          userId: validation.user_id,
          displayName: validation.display_name,
          role: validation.role,
          expiresAt: validation.expires_at,
        };
        setSession(sessionData);
      } catch (error) {
        console.error('Session restore failed:', error);
        localStorage.removeItem(SESSION_STORAGE_KEY);
      } finally {
        setAuthLoading(false);
      }
    };

    restoreSession();
  }, [apiPost]);

  const refreshUsageSummary = useCallback(async (authToken: string) => {
    try {
      const summary = await apiPost<UsageSummary>('/api/sessions/usage', { token: authToken });
      setUsageSummary(summary);
    } catch (error) {
      console.error('Usage summary error:', error);
    }
  }, [apiPost]);

  const fetchSessionCost = useCallback(async (authToken: string): Promise<number | null> => {
    try {
      const summary = await apiPost<SessionCostSummary>('/api/sessions/cost', { token: authToken });
      if (typeof summary.estimated_total_cost_eur === 'number') {
        return summary.estimated_total_cost_eur;
      }
    } catch (error) {
      console.error('Session cost error:', error);
    }
    return null;
  }, [apiPost]);

  const fetchSessionSlo = useCallback(async (authToken: string): Promise<SessionSloSummary | null> => {
    try {
      return await apiPost<SessionSloSummary>('/api/telemetry/slo', { token: authToken });
    } catch (error) {
      console.error('Session SLO error:', error);
      return null;
    }
  }, [apiPost]);

  useEffect(() => {
    if (!ENABLE_QA_TELEMETRY_PANEL || !session?.token) return;
    let cancelled = false;
    const refreshQaTelemetry = async () => {
      try {
        const [summary, slo] = await Promise.all([
          apiPost<TelemetrySummary>('/api/telemetry/summary', { token: session.token }),
          apiPost<SessionSloSummary>('/api/telemetry/slo', { token: session.token }),
        ]);
        if (!cancelled) {
          setQaTelemetrySummary(summary);
          setQaSloSummary(slo);
        }
      } catch (error) {
        console.error('QA telemetry panel error:', error);
      }
    };
    refreshQaTelemetry();
    const interval = window.setInterval(refreshQaTelemetry, 5_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [apiPost, session?.token]);

  const runCpuProbe = useCallback(() => {
    const probeWindowMs = 250;
    const start = performance.now();
    let ops = 0;
    let accumulator = 0;
    while (performance.now() - start < probeWindowMs) {
      for (let i = 0; i < 500; i += 1) {
        accumulator += Math.sin((ops + i) * 0.01);
      }
      ops += 500;
    }
    if (!Number.isFinite(accumulator)) return 0;
    const elapsed = Math.max(1, performance.now() - start);
    return Math.round(ops / elapsed);
  }, []);

  const runWebRtcProbe = useCallback(async () => {
    const pc1 = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const pc2 = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    let dc1: RTCDataChannel | null = null;
    let dc2: RTCDataChannel | null = null;
    let resolved = false;

    const cleanup = () => {
      try {
        dc1?.close();
      } catch {
        // noop
      }
      try {
        dc2?.close();
      } catch {
        // noop
      }
      try {
        pc1.close();
      } catch {
        // noop
      }
      try {
        pc2.close();
      } catch {
        // noop
      }
    };

    const waitForConnected = () => new Promise<boolean>((resolve) => {
      const timeout = window.setTimeout(() => {
        if (resolved) return;
        resolved = true;
        resolve(false);
      }, 8000);
      const maybeResolve = () => {
        if (resolved) return;
        const connected =
          (pc1.iceConnectionState === 'connected' || pc1.iceConnectionState === 'completed')
          && (pc2.iceConnectionState === 'connected' || pc2.iceConnectionState === 'completed');
        if (connected) {
          window.clearTimeout(timeout);
          resolved = true;
          resolve(true);
        }
      };
      pc1.oniceconnectionstatechange = maybeResolve;
      pc2.oniceconnectionstatechange = maybeResolve;
      maybeResolve();
    });

    try {
      pc1.onicecandidate = (event) => {
        if (event.candidate) {
          pc2.addIceCandidate(event.candidate).catch(() => undefined);
        }
      };
      pc2.onicecandidate = (event) => {
        if (event.candidate) {
          pc1.addIceCandidate(event.candidate).catch(() => undefined);
        }
      };

      dc1 = pc1.createDataChannel('precheck');
      pc2.ondatachannel = (event) => {
        dc2 = event.channel;
        dc2.onmessage = (msg) => {
          if (typeof msg.data === 'string' && msg.data.startsWith('ping:')) {
            dc2?.send(msg.data.replace('ping:', 'pong:'));
          }
        };
      };

      const offer = await pc1.createOffer();
      await pc1.setLocalDescription(offer);
      await pc2.setRemoteDescription(offer);
      const answer = await pc2.createAnswer();
      await pc2.setLocalDescription(answer);
      await pc1.setRemoteDescription(answer);

      const connected = await waitForConnected();
      if (!connected) {
        cleanup();
        return { ok: false, rttMs: -1, usesTurnRelay: false };
      }

      const pingRtt = await new Promise<number>((resolve) => {
        if (!dc1) {
          resolve(-1);
          return;
        }
        const timeout = window.setTimeout(() => resolve(-1), 2000);
        const sentAt = performance.now();
        dc1.onmessage = (msg) => {
          if (typeof msg.data === 'string' && msg.data.startsWith('pong:')) {
            window.clearTimeout(timeout);
            resolve(Math.round(performance.now() - sentAt));
          }
        };
        dc1.onopen = () => {
          dc1?.send(`ping:${Date.now()}`);
        };
        if (dc1.readyState === 'open') {
          dc1.send(`ping:${Date.now()}`);
        }
      });

      const stats = await pc1.getStats();
      let usesTurnRelay = false;
      const selectedPairIds = new Set<string>();
      stats.forEach((stat: any) => {
        if (stat.type === 'transport' && stat.selectedCandidatePairId) {
          selectedPairIds.add(stat.selectedCandidatePairId);
        }
      });
      stats.forEach((stat: any) => {
        if (stat.type === 'candidate-pair' && selectedPairIds.has(stat.id)) {
          const localCandidate = stat.localCandidateId ? stats.get(stat.localCandidateId as string) : null;
          const remoteCandidate = stat.remoteCandidateId ? stats.get(stat.remoteCandidateId as string) : null;
          if (
            (localCandidate as any)?.candidateType === 'relay'
            || (remoteCandidate as any)?.candidateType === 'relay'
          ) {
            usesTurnRelay = true;
          }
        }
      });

      cleanup();
      return { ok: true, rttMs: pingRtt, usesTurnRelay };
    } catch {
      cleanup();
      return { ok: false, rttMs: -1, usesTurnRelay: false };
    }
  }, []);

  const runPrecallCheck = useCallback(async () => {
    setIsRunningPrecallCheck(true);
    setPreCallStatus('');
    try {
      let mediaOk = false;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        stream.getTracks().forEach((track) => track.stop());
        mediaOk = true;
      } catch {
        mediaOk = false;
      }

      const networkOk = navigator.onLine;
      let backendOk = false;
      const backendLatencySamples: number[] = [];
      try {
        for (let i = 0; i < 3; i += 1) {
          const startedAt = performance.now();
          const response = await fetch(`${ASR_MT_HTTP_URL}/health`);
          const elapsed = Math.round(performance.now() - startedAt);
          if (response.ok) {
            backendLatencySamples.push(elapsed);
          }
          backendOk = response.ok;
          if (!response.ok) break;
        }
      } catch {
        backendOk = false;
      }
      const backendLatencyMs = backendLatencySamples.length
        ? Math.round(
          backendLatencySamples.reduce((sum, value) => sum + value, 0) / backendLatencySamples.length,
        )
        : -1;
      const cpuOpsPerMs = runCpuProbe();
      const webrtcProbe = await runWebRtcProbe();
      const performanceOk = backendLatencyMs > 0 && backendLatencyMs <= 1200 && cpuOpsPerMs >= 250;
      const webrtcOk = webrtcProbe.ok && (webrtcProbe.rttMs < 0 || webrtcProbe.rttMs <= 1600);

      const ok = mediaOk && networkOk && backendOk && performanceOk && webrtcOk;
      const perfSummary = `API ${backendLatencyMs > 0 ? backendLatencyMs : '--'}ms | CPU ${cpuOpsPerMs} ops/ms | ICE ${webrtcProbe.ok ? 'ok' : 'fail'} | RTT ${webrtcProbe.rttMs > 0 ? webrtcProbe.rttMs : '--'}ms`;
      setPreCallStatus(ok ? `${ui.precheckOk} (${perfSummary})` : `${ui.precheckFail} (${perfSummary})`);
      trackTelemetry('precheck_result', {
        ok,
        media_ok: mediaOk,
        network_ok: networkOk,
        backend_ok: backendOk,
        ice_ok: webrtcProbe.ok,
        turn_relay: webrtcProbe.usesTurnRelay,
        backend_latency_ms: backendLatencyMs,
        cpu_ops_per_ms: cpuOpsPerMs,
        precheck_rtt_ms: webrtcProbe.rttMs,
        rtt_ms: webrtcStats.rttMs ?? -1,
        jitter_ms: webrtcStats.jitterMs ?? -1,
        packet_loss_pct: webrtcStats.packetLossPct ?? -1,
      });
    } finally {
      setIsRunningPrecallCheck(false);
    }
  }, [
    runWebRtcProbe,
    runCpuProbe,
    trackTelemetry,
    ui.precheckFail,
    ui.precheckOk,
    webrtcStats.jitterMs,
    webrtcStats.packetLossPct,
    webrtcStats.rttMs,
  ]);

  const registerRoomPresence = useCallback(async (roomCode: string) => {
    if (!session?.token || !peerId) return;
    await apiPost('/api/rooms/register', {
      token: session.token,
      room_code: roomCode,
      peer_id: peerId,
    });
  }, [apiPost, peerId, session?.token]);

  const waitForRoomPeerViaSse = useCallback((roomCode: string): Promise<RoomResolveResponse | null> => {
    if (!session?.token || !peerId) {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      const params = new URLSearchParams({
        token: session.token,
        room_code: roomCode,
        requester_peer_id: peerId,
      });
      const url = `${ASR_MT_HTTP_URL}/api/rooms/subscribe?${params.toString()}`;
      const source = new EventSource(url);
      const timeout = window.setTimeout(() => {
        source.close();
        resolve(null);
      }, 10000);

      const clean = () => {
        window.clearTimeout(timeout);
      };

      source.addEventListener('paired', (event) => {
        try {
          const parsed = JSON.parse((event as MessageEvent).data) as RoomResolveResponse;
          clean();
          source.close();
          resolve(parsed);
        } catch {
          clean();
          source.close();
          resolve(null);
        }
      });

      source.addEventListener('timeout', () => {
        clean();
        source.close();
        resolve(null);
      });

      source.onerror = () => {
        clean();
        source.close();
        resolve(null);
      };
    });
  }, [peerId, session?.token]);

  const waitForRoomPeer = useCallback(async (roomCode: string): Promise<RoomResolveResponse> => {
    if (!session?.token || !peerId) {
      throw new Error('missing session or peer');
    }
    const timeoutMs = 120000;
    const startTime = Date.now();
    await registerRoomPresence(roomCode);
    const sseResolved = await waitForRoomPeerViaSse(roomCode);
    if (sseResolved?.target_peer_id && sseResolved?.initiator_peer_id) {
      trackTelemetry('room_pair_resolved', {
        room_code: roomCode,
        time_to_pair_ms: Date.now() - startTime,
        attempts: 1,
        transport: 'sse',
      });
      return sseResolved;
    }

    let attempt = 1;
    let lastPresenceRegisterTs = Date.now();
    while ((Date.now() - startTime) < timeoutMs) {
      try {
        // Only re-register presence every 45 seconds (TTL is 180s on backend).
        if (Date.now() - lastPresenceRegisterTs > 45000) {
          await registerRoomPresence(roomCode);
          lastPresenceRegisterTs = Date.now();
        }

        const resolved = await apiPost<RoomResolveResponse>('/api/rooms/resolve', {
          token: session.token,
          room_code: roomCode,
          requester_peer_id: peerId,
        });
        if (resolved.target_peer_id && resolved.initiator_peer_id) {
          trackTelemetry('room_pair_resolved', {
            room_code: roomCode,
            time_to_pair_ms: Date.now() - startTime,
            attempts: attempt + 1,
            transport: 'polling',
          });
          return resolved;
        }
      } catch (err: any) {
        // If rate limited, wait longer before next attempt.
        if (err?.message?.includes('429')) {
          console.warn('Rate limited on /api/rooms/resolve. Backing off.');
          await new Promise((resolve) => setTimeout(resolve, 5000));
          continue;
        }
        // For other errors (except transient 5xx), we might want to throw, but let's retry for now.
        console.error('Polling error:', err);
      }

      setPreCallStatus(ui.waitingInRoom);
      // Increased delays to avoid hitting 60 req/min rate limit easily.
      const delayMs = attempt < 3 ? 1000 : attempt < 10 ? 2000 : 3000;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      attempt += 1;
    }
    throw new Error('room participant timeout');
  }, [
    apiPost,
    peerId,
    registerRoomPresence,
    session?.token,
    trackTelemetry,
    ui.waitingInRoom,
    waitForRoomPeerViaSse,
  ]);

  useEffect(() => {
    if (!session?.token) return;
    refreshUsageSummary(session.token);
  }, [session?.token, refreshUsageSummary]);

  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = authName.trim();
    if (!cleanName) {
      setAuthError(ui.authNameError);
      return;
    }

    setIsAuthenticating(true);
    setAuthError('');
    try {
      const sessionResponse = await apiPost<{ token: string; user_id: string; expires_at: number }>(
        '/api/auth/session',
        { display_name: cleanName, role: authRole },
      );
      const newSession: SessionInfo = {
        token: sessionResponse.token,
        userId: sessionResponse.user_id,
        displayName: cleanName,
        role: authRole,
        expiresAt: sessionResponse.expires_at,
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
      setSession(newSession);
    } catch (error) {
      console.error('Authentication failed:', error);
      setAuthError(ui.authCreateError);
    } finally {
      setIsAuthenticating(false);
    }
  };

  useEffect(() => {
    let peerInstance: Peer | null = null;
    let fallbackAttempted = false;

    const initPeer = (useCloudFallback = false) => {
      const randomId = Math.random().toString(36).substring(2, 7).toUpperCase();
      const peerOptions = useCloudFallback
        ? { config: { iceServers: ICE_SERVERS } }
        : getPeerOptions();

      console.log(`Initializing PeerJS (${useCloudFallback ? 'Cloud fallback' : 'Configured host'})...`);
      const peer = new Peer(randomId, peerOptions);

      peer.on('open', (id: string) => {
        setPeerId(id);
        setPeerConnectionState('connected');
        console.log(`My peer ID is: ${id}`);
      });

      peer.on('call', async (call: any) => {
        if (!sessionRef.current) {
          call.close();
          alert('Authenticate before answering calls.');
          return;
        }
        try {
          callSetupStartedAtRef.current = Date.now();
          const profile = QUALITY_PROFILES[qualityRef.current];
          const stream = cameraStreamRef.current ?? await navigator.mediaDevices.getUserMedia({
            video: { width: profile.width, height: profile.height },
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          });
          cameraStreamRef.current = stream;
          activeCallIdRef.current = crypto.randomUUID();
          consentRegisteredRef.current = false;
          setRecordingConsentGranted(false);
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
          call.answer(stream);
          currentCallRef.current = call;
          handleCallRef.current(call, stream);
          applyBitrateLimit(call, profile.maxBitrate);
        } catch (err: any) {
          console.error('Failed to answer call:', err);
          setPreCallError(true);
          setPreCallStatus(
            err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
              ? cameraPermissionDeniedTextRef.current
              : `Error: ${err?.message ?? 'could not access camera/microphone'}`
          );
        }
      });

      peer.on('connection', (conn: any) => {
        dataConnRef.current = conn;
        setupDataChannelRef.current(conn);
      });

      let reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;

      peer.on('error', (err: any) => {
        console.warn('PeerJS error:', err?.type || err?.message || err);
        setPeerConnectionState('down');

        // If server connection fails or drops, attempt cloud fallback
        if (!fallbackAttempted && !useCloudFallback) {
          fallbackAttempted = true;
          console.warn('Primary PeerJS server connection lost/failed. Switching to PeerJS Cloud fallback...');
          try {
            peer.destroy();
          } catch {
            // noop
          }
          if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
          initPeer(true);
          return;
        }

        if (statusRef.current === CallStatus.ACTIVE) {
          setNetworkNotice(`Servidor de señalización reconectando (${err?.type || 'red'})...`);
        }

        // Schedule an automatic reconnect attempt
        if (!peer.destroyed) {
          if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
          reconnectTimeoutId = setTimeout(() => {
            if (!peer.destroyed && !peer.open) {
              try {
                peer.reconnect();
              } catch (e) {
                console.warn('Failed to auto-reconnect peer:', e);
              }
            }
          }, 3000);
        }
      });

      peer.on('disconnected', () => {
        setPeerConnectionState('reconnecting');
        setNetworkNotice('Señalización desconectada. Reconectando...');
        peerReconnectCountRef.current += 1;
        trackTelemetryRef.current('peer_reconnecting', { reconnect_count: peerReconnectCountRef.current });

        if (!peer.destroyed) {
          try {
            peer.reconnect();
          } catch (e) {
            console.warn('Reconnection error:', e);
          }
        }
      });

      peer.on('close', () => {
        setPeerConnectionState('down');
      });

      peerRef.current = peer;
      peerInstance = peer;
    };

    initPeer(false);

    return () => {
      recordingStopRef.current?.();
      streamingStopRef.current?.();
      if (peerInstance && !peerInstance.destroyed) {
        peerInstance.destroy();
      }
      stopMediaStream(cameraStreamRef.current);
      cameraStreamRef.current = null;
      stopMediaStream(screenStreamRef.current);
      screenStreamRef.current = null;
      stopMediaStream(remoteStreamRef.current);
      remoteStreamRef.current = null;
    };
  }, [applyBitrateLimit]);

  const sendChatMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim() || !dataConnRef.current) return;

    const newMessage: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      sender: 'me',
      text: chatInput,
      timestamp: Date.now(),
    };

    dataConnRef.current.send({ type: 'chat', text: chatInput });
    setMessages((prev) => [...prev, newMessage]);
    setChatInput('');
  };

  const translateMessage = async (msg: ChatMessage) => {
    if (translatingMessageId || !session) return;
    setTranslatingMessageId(msg.id);

    try {
      const source = msg.sender === 'peer' ? remoteLang : myLang;
      const target = msg.sender === 'peer' ? myLang : remoteLang;
      if (ENABLE_LOCAL_MT_PRIVACY) {
        const localTranslation =
          (await translateWithBergamotIfAvailable(msg.text, source, target))
          ?? translateLocalText(msg.text, source, target);
        if (localTranslation) {
          setMessages((prev) =>
            prev.map((m) => (m.id === msg.id ? { ...m, translatedText: localTranslation } : m)),
          );
          trackTelemetry('local_mt_used', {
            mode: 'chat_translate',
            source_lang: source,
            target_lang: target,
            provider: 'bergamot_or_fallback',
          });
        }
        return;
      }
      const response = await apiPost<{ translated_text: string }>('/api/chat/translate', {
        token: session.token,
        text: msg.text,
        source_lang: source,
        target_lang: target,
      });

      if (response.translated_text) {
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, translatedText: response.translated_text } : m)),
        );
        if (session?.token) refreshUsageSummary(session.token);
      }
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setTranslatingMessageId(null);
    }
  };

  const speakMessage = async (msg: ChatMessage) => {
    if (speakingMessageId || !session) return;
    setSpeakingMessageId(msg.id);

    try {
      const source = msg.sender === 'peer' ? remoteLang : myLang;
      const target = msg.sender === 'peer' ? myLang : remoteLang;
      if (ENABLE_LOCAL_MT_PRIVACY) {
        const textToSpeak =
          (await translateWithBergamotIfAvailable(msg.translatedText || msg.text, source, target))
          ?? translateLocalText(msg.translatedText || msg.text, source, target);
        if (!textToSpeak) return;
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = target;
        utterance.rate = 1;
        utterance.onend = () => setSpeakingMessageId(null);
        utterance.onerror = () => setSpeakingMessageId(null);
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
        trackTelemetry('local_mt_used', {
          mode: 'chat_tts',
          source_lang: source,
          target_lang: target,
          provider: 'bergamot_or_fallback',
        });
        return;
      }
      const ttsResponse = await apiPost<{ text_to_speak: string; voice_lang: string }>('/api/chat/tts', {
        token: session.token,
        text: msg.translatedText || msg.text,
        source_lang: source,
        target_lang: target,
      });
      const textToSpeak = ttsResponse.text_to_speak;

      if (!textToSpeak) return;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = ttsResponse.voice_lang || (msg.sender === 'peer' ? myLang : remoteLang);
      utterance.rate = 1;
      utterance.onend = () => setSpeakingMessageId(null);
      utterance.onerror = () => setSpeakingMessageId(null);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      refreshUsageSummary(session.token);
    } catch (error) {
      console.error('TTS error:', error);
      setSpeakingMessageId(null);
    }
  };

  const initiateCall = async () => {
    if (!session) return alert('Authenticate before starting calls.');
    if (CALL_TOPOLOGY === 'sfu') {
      if (ENABLE_INSERTABLE_E2EE && REQUIRE_INSERTABLE_E2EE && !supportsInsertableStreams()) {
        alert('This browser does not support Insertable Streams required for E2EE in SFU mode.');
        trackTelemetry('sfu_e2ee_blocked', { reason: 'unsupported_browser' });
        return;
      }
      if (ENABLE_INSERTABLE_E2EE && REQUIRE_INSERTABLE_E2EE && !E2EE_SHARED_KEY.trim()) {
        alert('E2EE shared key is required in SFU mode but not configured.');
        trackTelemetry('sfu_e2ee_blocked', { reason: 'missing_key' });
        return;
      }
      const normalizedRoomCode = extractRoomCode(targetPeerId || `ROOM-${peerId}`);
      if (!SFU_JOIN_URL) {
        alert('SFU mode is enabled but VITE_SFU_JOIN_URL is not configured.');
        return;
      }
      const joinUrl = `${SFU_JOIN_URL}${SFU_JOIN_URL.includes('?') ? '&' : '?'}room=${encodeURIComponent(normalizedRoomCode)}&name=${encodeURIComponent(session.displayName)}`;
      setActiveSfuRoomUrl(joinUrl);
      setStatus(CallStatus.ACTIVE);
      setNetworkNotice('');
      trackTelemetry('sfu_embed_open', { room_code: normalizedRoomCode, topology: 'sfu' });
      return;
    }
    if (peerConnectionState !== 'connected') {
      return alert('Signaling is reconnecting. Wait a moment and try again.');
    }
    if (!targetPeerId) return alert(ui.joinRoomPlaceholder);

    callSetupStartedAtRef.current = Date.now();
    setStatus(CallStatus.CONNECTING);
    setPreCallStatus('');
    setPreCallError(false);

    try {
      if (!navigator.mediaDevices) {
        throw new Error('Media devices are not available. This usually happens when the site is not served over a secure connection (HTTPS). Please ensure you are using HTTPS.');
      }
      const normalizedRoomCode = extractRoomCode(targetPeerId);
      const directHostPeerId =
        inviteHostPeerId && inviteHostPeerId !== peerId ? inviteHostPeerId : '';
      const room = directHostPeerId
        ? {
          room_code: normalizedRoomCode,
          participants: 2,
          target_peer_id: directHostPeerId,
          initiator_peer_id: peerId,
        }
        : await waitForRoomPeer(normalizedRoomCode);
      if (!room.target_peer_id || !room.initiator_peer_id) {
        throw new Error('room has no counterpart');
      }
      if (directHostPeerId) {
        await registerRoomPresence(normalizedRoomCode);
      }

      const profile = QUALITY_PROFILES[quality];
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: profile.width, height: profile.height },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      cameraStreamRef.current = stream;
      activeCallIdRef.current = crypto.randomUUID();
      consentRegisteredRef.current = false;
      setRecordingConsentGranted(false);

      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const shouldInitiate = shouldInitiateCall(peerId, room.initiator_peer_id);
      if (!shouldInitiate) {
        setPreCallStatus(ui.waitingInRoom);
        setStatus(CallStatus.CONNECTING);
        trackTelemetry('waiting_in_room', { room_code: normalizedRoomCode });
        return;
      }

      const call = peerRef.current?.call(room.target_peer_id, stream);
      const conn = peerRef.current?.connect(room.target_peer_id);
      if (!call || !conn) throw new Error('Peer connection unavailable');

      setupCaptionChannels(call, true);
      currentCallRef.current = call;
      dataConnRef.current = conn;
      setupDataChannel(conn);
      handleCall(call, stream);
      applyBitrateLimit(call, profile.maxBitrate);
      trackTelemetry('call_attempt_started', { room_code: normalizedRoomCode });
    } catch (err: any) {
      console.error('Error starting call:', err);
      setStatus(CallStatus.IDLE);
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        const isSystemDenial = err?.message?.toLowerCase().includes('system') || err?.message?.toLowerCase().includes('hardware');
        if (isSystemDenial) {
          alert('Error: Camera/Microphone access was denied by your system settings. Please check your OS Privacy settings (Windows Privacy or macOS Screen Time/Privacy) to allow the browser to access your media devices.');
        } else {
          alert('Error: camera/mic permission denied. Please click the camera icon in your address bar, allow access, and try again.');
        }
      } else if (err?.message?.includes('429')) {
        alert('Server is temporarily busy (rate limit reached). Please wait a minute and try again.');
      } else if (err?.message?.includes('timeout') || err?.message?.includes('counterpart')) {
        alert('Error: the other participant did not join in time. Share the invite link and try again once they are ready.');
      } else if (err?.message?.includes('invalid token') || err?.message?.includes('expired token')) {
        alert('Your session has expired. Please sign in again.');
      } else {
        alert(`Error: ${err?.message ?? 'could not start the call'}`);
      }
    }
  };

  const isRecording = recording.isRecording;

  const toggleScreenShare = async () => {
    if (!currentCallRef.current || status !== CallStatus.ACTIVE) return;

    try {
      if (!isScreenSharing) {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = stream;
        const videoTrack = stream.getVideoTracks()[0];

        const sender = currentCallRef.current.peerConnection
          .getSenders()
          .find((s: any) => s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        videoTrack.onended = () => {
          stopScreenShare();
        };

        setIsScreenSharing(true);
      } else {
        stopScreenShare();
      }
    } catch (err) {
      console.error('Error sharing screen:', err);
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    if (cameraStreamRef.current && currentCallRef.current) {
      const videoTrack = cameraStreamRef.current.getVideoTracks()[0];
      const sender = currentCallRef.current.peerConnection
        .getSenders()
        .find((s: any) => s.track.kind === 'video');
      if (sender) {
        sender.replaceTrack(videoTrack);
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = cameraStreamRef.current;
      }
    }

    setIsScreenSharing(false);
  };

  const registerConsent = async () => {
    if (!session || !activeCallIdRef.current || consentRegisteredRef.current) return;
    const response = await apiPost<ConsentResponse>('/api/sessions/consent', {
      token: session.token,
      call_id: activeCallIdRef.current,
      consent_recording: true,
    });
    if (response.status === 'ok') {
      consentRegisteredRef.current = true;
    }
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      recording.toggleRecording();
      return;
    }

    if (!recordingConsentGranted) {
      setShowConsentModal(true);
      return;
    }

    try {
      await registerConsent();
      recording.toggleRecording();
    } catch (error) {
      console.error('Consent registration failed:', error);
      alert('Could not register recording consent. Recording was not started.');
    }
  };

  const resetCallState = useCallback(() => {
    setStatus(CallStatus.IDLE);
    setActiveSfuRoomUrl(null);
    setIsScreenSharing(false);
    setIsPttPressed(false);
    setIsHandsFree(false);
    localSubtitleConfirmedRef.current = '';
    remoteSubtitleConfirmedRef.current = '';
    localSubtitleTrackRef.current = { lastHypothesis: '', stableCount: 0 };
    remoteSubtitleTrackRef.current = { lastHypothesis: '', stableCount: 0 };
    setLocalSubtitleConfirmed('');
    setLocalSubtitleHypothesis('');
    setRemoteSubtitleConfirmed('');
    setRemoteSubtitleHypothesis('');
    setShowSettings(false);
    setRecordingConsentGranted(false);
    setE2eeState('off');
    consentRegisteredRef.current = false;

    currentCallRef.current = null;
    dataConnRef.current = null;

    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;

    stopMediaStream(cameraStreamRef.current);
    cameraStreamRef.current = null;
    stopMediaStream(screenStreamRef.current);
    screenStreamRef.current = null;
    stopMediaStream(remoteStreamRef.current);
    remoteStreamRef.current = null;
    captionsHypChannelRef.current = null;
    captionsCommitChannelRef.current = null;
    subtitleSeqRef.current = 0;
    autoDetectedLanguageRef.current = null;
    remoteSubtitleOrderRef.current = { lastHypSeq: -1, lastCommitSeq: -1 };
    seenCaptionIdsRef.current = [];
    callStartedAtRef.current = null;
    firstRemoteSubtitleAtRef.current = null;
    captionLagSamplesRef.current = [];
    hypothesisSentRef.current = 0;
    hypothesisDroppedRef.current = 0;
    callSetupStartedAtRef.current = null;
    callSetupMsRef.current = null;
    peerReconnectCountRef.current = 0;
    lastWebRtcTelemetryAtRef.current = 0;
    backpressureTelemetryRef.current = false;
  }, []);

  useEffect(() => {
    resetCallStateRef.current = resetCallState;
  }, [resetCallState]);

  const endCall = async () => {
    if (CALL_TOPOLOGY === 'sfu' && activeSfuRoomUrl) {
      trackTelemetry('sfu_embed_closed', { topology: 'sfu' });
      resetCallState();
      return;
    }
    if (isRecording) recording.stopRecording();
    stopStreaming();

    if (dataConnRef.current?.open) {
      dataConnRef.current.close();
    }
    if (currentCallRef.current) {
      currentCallRef.current.close();
    }

    const lagSamples = captionLagSamplesRef.current;
    const p50 = percentile(lagSamples, 50);
    const p95 = percentile(lagSamples, 95);
    const droppedRate =
      hypothesisSentRef.current > 0
        ? Number(((hypothesisDroppedRef.current / hypothesisSentRef.current) * 100).toFixed(2))
        : 0;
    trackTelemetry('caption_metrics', {
      ttfc_ms:
        callStartedAtRef.current && firstRemoteSubtitleAtRef.current
          ? firstRemoteSubtitleAtRef.current - callStartedAtRef.current
          : -1,
      caption_lag_p50_ms: p50 ?? -1,
      caption_lag_p95_ms: p95 ?? -1,
      caption_lag_samples_ms: lagSamples.slice(-120),
      hypothesis_sent: hypothesisSentRef.current,
      hypothesis_dropped: hypothesisDroppedRef.current,
      dropped_hypothesis_rate_pct: droppedRate,
    });
    const sessionCostEur = session?.token ? await fetchSessionCost(session.token) : null;
    const sessionSlo = session?.token ? await fetchSessionSlo(session.token) : null;
    trackTelemetry('call_ended', {
      bitrate_kbps: webrtcStats.bitrateKbps ?? -1,
      packet_loss_pct: webrtcStats.packetLossPct ?? -1,
      jitter_ms: webrtcStats.jitterMs ?? -1,
      rtt_ms: webrtcStats.rttMs ?? -1,
      ice_state: webrtcStats.iceState || 'unknown',
      connection_state: webrtcStats.connectionState || 'unknown',
      reconnect_count: peerReconnectCountRef.current,
      call_setup_ms: callSetupMsRef.current ?? -1,
      latency_ms: latencyMs ?? -1,
      session_cost_estimated_eur: sessionCostEur,
      dropped_audio_chunks: droppedAudioChunks,
      audio_backpressure_active: isBackpressured,
      slo_pass: sessionSlo?.pass_slo ?? null,
      slo_ttfc_p95_ms: sessionSlo?.ttfc_ms_p95 ?? null,
      slo_caption_lag_p95_ms: sessionSlo?.caption_lag_ms_p95 ?? null,
    });
    resetCallState();
  };

  const handleQualityChange = (newQuality: string) => {
    setQuality(newQuality);
    if (currentCallRef.current) {
      applyBitrateLimit(currentCallRef.current, QUALITY_PROFILES[newQuality].maxBitrate);
    }
  };

  const toggleHypothesisVisibility = () => {
    const next = !showHypothesisSubtitles;
    setShowHypothesisSubtitles(next);
    trackTelemetry('caption_hypothesis_visibility', { visible: next });
  };

  const toggleLowBandwidthMode = () => {
    const next = !lowBandwidthMode;
    setLowBandwidthMode(next);
    localStorage.setItem(LOW_BANDWIDTH_STORAGE_KEY, String(next));
    if (next) handleQualityChange('low');
    trackTelemetry('low_bandwidth_mode_toggled', { enabled: next });
  };

  const handleCaptionSizeChange = (size: CaptionSize) => {
    setCaptionSize(size);
    localStorage.setItem(CAPTION_SIZE_STORAGE_KEY, size);
  };

  const handleCaptionPositionChange = (pos: CaptionPosition) => {
    setCaptionPosition(pos);
    localStorage.setItem(CAPTION_POSITION_STORAGE_KEY, pos);
  };

  const handleCaptionContrastChange = (contrast: CaptionContrast) => {
    setCaptionContrast(contrast);
    localStorage.setItem(CAPTION_CONTRAST_STORAGE_KEY, contrast);
  };

  const handleTargetPeerChange = (value: string) => {
    const code = extractRoomCode(value);
    setTargetPeerId(code);
    if (code) localStorage.setItem(LAST_ROOM_STORAGE_KEY, code);
  };

  const handlePttDown = () => {
    if (isHandsFree) return;
    setIsPttPressed(true);
    pttActiveRef.current = true;
    setSendActive(true);
  };

  const handlePttUp = () => {
    if (isHandsFree) return;
    setIsPttPressed(false);
    pttActiveRef.current = false;
    setSendActive(false);
  };

  const signOut = () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setSession(null);
    endCall();
  };

  const legalPath = typeof window !== 'undefined' ? window.location.pathname.replace(/^\/+/, '') : '';
  if (legalPath === 'privacy' || legalPath === 'terms' || legalPath === 'legal') {
    return <LegalPage kind={legalPath} />;
  }

  if (authLoading) {
    return (
      <div className="app-shell h-screen w-full flex items-center justify-center">
        <p className="text-text-secondary text-sm">{ui.validatingSession}</p>
      </div>
    );
  }

  if (!session) {
    return (
      <>
        <div className="app-shell min-h-dvh w-full flex items-center justify-center px-6 relative">
          <div className="absolute top-4 left-4 z-20">
            <div className="glass-panel flex items-center gap-2 rounded-xl px-3 py-2">
              <i className="fas fa-globe text-text-secondary text-xs"></i>
              <select
                value={uiLocale}
                onChange={(e) => setUiLocale(e.target.value as UiLocale)}
                className="bg-transparent text-text-primary text-sm outline-none"
              >
                {UI_LOCALE_OPTIONS.map((locale) => (
                  <option key={locale.code} value={locale.code} className="bg-card">
                    {locale.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="secure-access-card glass-panel flex flex-col justify-center">
            <div className="flex flex-col items-center pt-8 pb-5">
              <img
                src="/brand/anclora-linguo-cam.webp"
                alt="Anclora Linguo Cam"
                className="mb-2"
                style={{
                  width: 50,
                  height: 50,
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.3))',
                }}
              />
              <div className="secure-access-divider h-px w-[50px] mb-1.5" />
              <p className="text-sm font-bold">{ui.appTitle}</p>
            </div>
            <form
              onSubmit={handleAuthenticate}
              className="flex flex-col gap-3 px-6 pb-5 pt-1"
            >
              <h1 className="text-2xl font-bold">{ui.secureAccess}</h1>
              <p className="text-sm text-text-secondary">{ui.secureAccessDesc}</p>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-text-muted">{ui.name}</label>
                <input
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  placeholder={ui.namePlaceholder}
                  className="field-control rounded-lg px-3 py-2"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-text-muted">{ui.role}</label>
                <select
                  value={authRole}
                  onChange={(e) => setAuthRole(e.target.value as 'agent' | 'investor')}
                  className="field-control rounded-lg px-3 py-2"
                >
                  <option value="agent">{ui.agent}</option>
                  <option value="investor">{ui.investor}</option>
                </select>
              </div>
              {authError ? <p className="text-sm text-danger">{authError}</p> : null}
              <button
                type="submit"
                disabled={isAuthenticating}
                className="btn-primary w-full disabled:opacity-60 rounded-lg py-2 font-semibold"
              >
                {isAuthenticating ? ui.creatingSession : ui.enterWorkspace}
              </button>
            </form>
          </div>
        </div>
        <LegalFooter locale={uiLocale} mode="static" />
        <CookieConsent locale={uiLocale} />
      </>
    );
  }

  if (status === CallStatus.IDLE || status === CallStatus.CONNECTING) {
    return (
      <>
        <div className="app-shell h-dvh flex flex-col overflow-hidden relative">
          <div className="shrink-0 px-3 py-3 sm:px-5 sm:py-4 border-b border-border-subtle">
          <div className="relative mx-auto flex w-full max-w-225 flex-wrap items-center justify-between gap-3 sm:flex-nowrap">
            <div className="glass-panel flex items-center gap-2 rounded-xl px-3 py-2">
              <i className="fas fa-globe text-text-secondary text-xs"></i>
              <select
                value={uiLocale}
                onChange={(e) => setUiLocale(e.target.value as UiLocale)}
                className="bg-transparent text-text-primary text-sm outline-none"
              >
                {UI_LOCALE_OPTIONS.map((locale) => (
                  <option key={locale.code} value={locale.code} className="bg-card">
                    {locale.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="order-3 flex w-full items-center justify-center gap-2.5 pointer-events-none select-none sm:order-none sm:absolute sm:left-1/2 sm:w-auto sm:-translate-x-1/2">
              <AncloraMark className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl" testId="app-logo" decorative />
              <div className="leading-tight">
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight leading-none">{ui.appTitle}</h1>
                <p className="text-[11px] text-text-muted font-medium hidden sm:block">{ui.appSubtitle}</p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="btn-secondary ml-auto text-xs px-3 py-2 rounded-lg whitespace-nowrap"
            >
              {ui.signOut} ({session.displayName})
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <CallSetup
            status={status}
            peerId={peerId}
            myLang={myLang}
            remoteLang={remoteLang}
            quality={quality}
            targetPeerId={targetPeerId}
            supportedLanguages={SUPPORTED_LANGUAGES}
            qualityProfiles={QUALITY_PROFILES}
            onStartCall={initiateCall}
            onQualityChange={handleQualityChange}
            onMyLangChange={setMyLang}
            onRemoteLangChange={setRemoteLang}
            onTargetPeerChange={handleTargetPeerChange}
            onCopyPeerId={() => {
              navigator.clipboard.writeText(peerId);
              alert('Copied!');
            }}
            onCopyInviteLink={() => {
              const room = targetPeerId || `ROOM-${peerId}`;
              const url = buildInviteLink(window.location.origin, window.location.pathname, room, peerId, myLang, remoteLang);
              navigator.clipboard.writeText(url);
              alert('Invite link copied with language configuration for participant.');
            }}
            onRunPrecallCheck={runPrecallCheck}
            isRunningPrecallCheck={isRunningPrecallCheck}
            preCallStatus={preCallStatus}
            preCallError={preCallError}
            uiText={{
              title: ui.appTitle,
              subtitle: ui.appSubtitle,
              yourPeerId: ui.yourPeerId,
              iSpeak: ui.iSpeak,
              theySpeak: ui.theySpeak,
              callQuality: ui.callQuality,
              joinRoom: ui.joinRoom,
              joinRoomPlaceholder: ui.joinRoomPlaceholder,
              connecting: ui.connecting,
              startCall: ui.startCall,
              copyHint: ui.copyHint,
              copyInviteLink: ui.copyInviteLink,
              runPrecheck: ui.runPrecheck,
              checkingPrecheck: ui.checkingPrecheck,
            }}
          />
        </div>
        <LegalFooter locale={uiLocale} mode="static" />
        </div>
        <CookieConsent locale={uiLocale} />
      </>
    );
  }

  return (
    <div className="app-shell flex flex-col h-dvh min-h-dvh overflow-hidden relative">
      <CallHeader
        peerId={peerId}
        qualityLabel={QUALITY_PROFILES[quality].label.split(' ')[0]}
        isRecording={isRecording}
        peerConnectionState={peerConnectionState}
        showDiagnostics={SHOW_DIAGNOSTIC_OVERLAYS}
        e2eeState={e2eeState}
      />

      {networkNotice ? (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-50 px-3 py-2 rounded-xl status-warning text-xs max-w-[90vw] text-center">
          {networkNotice}
        </div>
      ) : null}

      {lowBandwidthSuggested ? (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 rounded-xl status-warning text-xs max-w-[90vw] backdrop-blur-sm">
          <i className="fas fa-wifi text-warning" aria-hidden="true"></i>
          <span>Poor connection detected.</span>
          <button
            onClick={toggleLowBandwidthMode}
            className="ml-1 underline underline-offset-2 font-semibold hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning rounded"
          >
            Enable Low Bandwidth Mode
          </button>
        </div>
      ) : null}

      {peerConnectionState === 'down' ? (
        <div
          className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm"
          role="alert"
          aria-live="assertive"
        >
          <i className="fas fa-plug-circle-xmark text-4xl text-danger" aria-hidden="true"></i>
          <p className="text-text-primary font-bold text-lg">Connection lost</p>
          <p className="text-text-secondary text-sm text-center max-w-xs">
            The call connection dropped. You can wait for automatic reconnection or end the call.
          </p>
          <button
            onClick={endCall}
            className="btn-danger px-5 py-2 rounded-xl font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
          >
            End call
          </button>
        </div>
      ) : null}

      {ENABLE_QA_TELEMETRY_PANEL ? (
        <div
          data-testid="qa-telemetry-panel"
          className="glass-panel absolute top-20 right-4 z-50 w-72 rounded-lg p-3 text-[11px] text-text-primary backdrop-blur"
        >
          <div className="mb-2 flex items-center justify-between text-xs font-semibold">
            <span>QA Telemetry</span>
            <span className={qaSloSummary?.pass_slo ? 'text-success' : 'text-warning'}>
              {qaSloSummary?.pass_slo ? 'SLO PASS' : 'SLO PENDING'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <span>TTFC p50/p95</span>
            <span>{qaTelemetrySummary?.ttfc_ms_p50 ?? '-'} / {qaTelemetrySummary?.ttfc_ms_p95 ?? '-'} ms</span>
            <span>Lag p50/p95</span>
            <span>{qaTelemetrySummary?.caption_lag_ms_p50 ?? '-'} / {qaTelemetrySummary?.caption_lag_ms_p95 ?? '-'} ms</span>
            <span>Errors/timeouts</span>
            <span>{qaTelemetrySummary?.error_events ?? 0} / {qaTelemetrySummary?.timeout_events ?? 0}</span>
            <span>WebRTC</span>
            <span>{qaTelemetrySummary?.latest_webrtc_quality ?? webrtcStats.quality}</span>
            <span>RTT/loss</span>
            <span>{qaTelemetrySummary?.webrtc_rtt_ms_p95 ?? webrtcStats.rttMs ?? '-'} ms / {qaTelemetrySummary?.webrtc_packet_loss_pct_p95 ?? webrtcStats.packetLossPct ?? '-'}%</span>
            <span>Provider</span>
            <span>{ENABLE_LOCAL_MT_PRIVACY ? 'local/browser' : 'asr-mt/server'}</span>
            <span>Schema</span>
            <span>{qaTelemetrySummary?.schema_version ?? 'telemetry.v1'}</span>
          </div>
        </div>
      ) : null}

      <div className="flex-1 min-h-0 relative flex pb-24 md:pb-28">
        <div className="flex-1 p-4 md:p-6 min-h-0">
          {CALL_TOPOLOGY === 'sfu' && activeSfuRoomUrl ? (
            <SfuRoomEmbed url={activeSfuRoomUrl} />
          ) : (
            <VideoGrid
              remoteVideoRef={remoteVideoRef}
              localVideoRef={localVideoRef}
              remoteSubtitleConfirmed={remoteSubtitleConfirmed}
              remoteSubtitleHypothesis={remoteSubtitleHypothesis}
              localSubtitleConfirmed={localSubtitleConfirmed}
              localSubtitleHypothesis={localSubtitleHypothesis}
              isScreenSharing={isScreenSharing}
              isPttPressed={isPttPressed}
              isHandsFree={isHandsFree}
              showHypothesis={showHypothesisSubtitles}
              captionSize={captionSize}
              captionPosition={captionPosition}
              captionContrast={captionContrast}
              lowBandwidthMode={lowBandwidthMode}
              myLang={myLang}
              remoteLang={remoteLang}
            />
          )}
        </div>

        {!(CALL_TOPOLOGY === 'sfu' && activeSfuRoomUrl) ? (
          <ChatSidebar
            isChatOpen={isChatOpen}
            messages={messages}
            chatInput={chatInput}
            speakingMessageId={speakingMessageId}
            translatingMessageId={translatingMessageId}
            canExportTranscript={transcriptEntries.length > 0}
            transcriptEntries={transcriptEntries}
            onClose={() => setIsChatOpen(false)}
            onExportVtt={exportTranscriptVtt}
            onExportSrt={exportTranscriptSrt}
            onTranslate={translateMessage}
            onSpeak={speakMessage}
            onChatInputChange={setChatInput}
            onSendMessage={sendChatMessage}
            chatEndRef={chatEndRef}
          />
        ) : null}
      </div>

      <SettingsModal
        show={showSettings}
        quality={quality}
        showHypothesis={showHypothesisSubtitles}
        qualityProfiles={QUALITY_PROFILES}
        onSelectQuality={handleQualityChange}
        onToggleHypothesis={toggleHypothesisVisibility}
        onClose={() => setShowSettings(false)}
        lowBandwidthMode={lowBandwidthMode}
        onToggleLowBandwidth={toggleLowBandwidthMode}
        captionSize={captionSize}
        captionPosition={captionPosition}
        captionContrast={captionContrast}
        onCaptionSizeChange={handleCaptionSizeChange}
        onCaptionPositionChange={handleCaptionPositionChange}
        onCaptionContrastChange={handleCaptionContrastChange}
      />

      {showConsentModal ? (
        <div className="absolute inset-0 z-30 bg-background/70 flex items-center justify-center px-6">
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold">Recording consent required</h2>
            <p className="text-sm text-text-secondary">
              By starting recording, you confirm all participants gave explicit consent for recording
              and storage according to your legal obligations.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConsentModal(false)}
                className="btn-secondary px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setRecordingConsentGranted(true);
                  setShowConsentModal(false);
                  await handleToggleRecording();
                }}
                className="btn-primary px-4 py-2 rounded-lg"
              >
                I confirm consent
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {CALL_TOPOLOGY === 'sfu' && activeSfuRoomUrl ? (
        <div className="absolute right-4 bottom-5 z-40">
          <button
            onClick={endCall}
            className="btn-danger px-4 py-2 rounded-lg text-sm font-semibold"
          >
            Leave SFU room
          </button>
        </div>
      ) : (
        <ControlBar
          isHandsFree={isHandsFree}
          isPttPressed={isPttPressed}
          isMuted={isMuted}
          remoteVolume={remoteVolume}
          isScreenSharing={isScreenSharing}
          isRecording={isRecording}
          showSettings={showSettings}
          isChatOpen={isChatOpen}
          hasUnreadPeerMessages={hasUnreadPeerMessages}
          myLangName={myLangName}
          remoteLangName={remoteLangName}
          onToggleHandsFree={() => setIsHandsFree(!isHandsFree)}
          onPttDown={handlePttDown}
          onPttUp={handlePttUp}
          onToggleMute={() => setIsMuted(!isMuted)}
          onRemoteVolumeChange={(value) => {
            setRemoteVolume(value);
            if (isMuted) setIsMuted(false);
          }}
          onToggleScreenShare={toggleScreenShare}
          onToggleRecording={handleToggleRecording}
          onShowSettings={() => setShowSettings(true)}
          onEndCall={endCall}
          onToggleChat={() => setIsChatOpen(!isChatOpen)}
        />
      )}

      <canvas ref={canvasRef} className="hidden" />
      <LegalFooter locale={uiLocale} mode="static" />
      <CookieConsent locale={uiLocale} />
    </div>
  );
};

export default App;
