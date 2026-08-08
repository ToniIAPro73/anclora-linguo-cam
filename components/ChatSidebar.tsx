import React from 'react';
import type { TranscriptEntry } from '../utils/transcript';

interface ChatMessage {
  id: string;
  sender: 'me' | 'peer';
  text: string;
  translatedText?: string;
  timestamp: number;
}

interface ChatSidebarProps {
  isChatOpen: boolean;
  messages: ChatMessage[];
  chatInput: string;
  speakingMessageId: string | null;
  translatingMessageId: string | null;
  canExportTranscript: boolean;
  transcriptEntries: TranscriptEntry[];
  onClose: () => void;
  onExportVtt: () => void;
  onExportSrt: () => void;
  onTranslate: (msg: ChatMessage) => void;
  onSpeak: (msg: ChatMessage) => void;
  onChatInputChange: (value: string) => void;
  onSendMessage: (event: React.FormEvent) => void;
  chatEndRef: React.RefObject<HTMLDivElement>;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isChatOpen,
  messages,
  chatInput,
  speakingMessageId,
  translatingMessageId,
  canExportTranscript,
  transcriptEntries,
  onClose,
  onExportVtt,
  onExportSrt,
  onTranslate,
  onSpeak,
  onChatInputChange,
  onSendMessage,
  chatEndRef,
}) => {
  const [activePanel, setActivePanel] = React.useState<'chat' | 'transcript'>('chat');
  const [transcriptQuery, setTranscriptQuery] = React.useState('');

  const filteredTranscript = React.useMemo(() => {
    const query = transcriptQuery.trim().toLowerCase();
    if (!query) return transcriptEntries;
    return transcriptEntries.filter((entry) =>
      `${entry.speaker} ${entry.text}`.toLowerCase().includes(query),
    );
  }, [transcriptEntries, transcriptQuery]);

  const copyTranscript = async () => {
    if (!transcriptEntries.length) return;
    const text = transcriptEntries
      .map((entry) => {
        const time = new Date(entry.timestampMs).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        return `[${time}] ${entry.speaker}: ${entry.text}`;
      })
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // noop
    }
  };

  return (
    <div className={`transition-all duration-300 ease-in-out bg-sidebar backdrop-blur-2xl border-l border-sidebar-border flex flex-col ${isChatOpen ? 'w-80 md:w-96' : 'w-0 overflow-hidden opacity-0'}`}>
      <div className="p-4 border-b border-sidebar-border flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActivePanel('chat')}
            className={`text-xs px-2 py-1 rounded-md border transition-colors ${
              activePanel === 'chat'
                ? 'border-accent-border text-accent bg-accent-soft'
                : 'border-border-default text-text-secondary hover:text-text-primary'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActivePanel('transcript')}
            className={`text-xs px-2 py-1 rounded-md border transition-colors ${
              activePanel === 'transcript'
                ? 'border-accent-border text-accent bg-accent-soft'
                : 'border-border-default text-text-secondary hover:text-text-primary'
            }`}
          >
            Transcript
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onExportVtt}
            disabled={!canExportTranscript}
            className={`text-xs px-2 py-1 rounded-md border transition-colors ${
              canExportTranscript
                ? 'border-border-default text-text-secondary hover:text-text-primary hover:border-border-strong'
                : 'border-border-default text-text-muted cursor-not-allowed'
            }`}
            title="Export transcript as VTT"
          >
            VTT
          </button>
          <button
            onClick={onExportSrt}
            disabled={!canExportTranscript}
            className={`text-xs px-2 py-1 rounded-md border transition-colors ${
              canExportTranscript
                ? 'border-border-default text-text-secondary hover:text-text-primary hover:border-border-strong'
                : 'border-border-default text-text-muted cursor-not-allowed'
            }`}
            title="Export transcript as SRT"
          >
            SRT
          </button>
          <button
            onClick={copyTranscript}
            disabled={!canExportTranscript}
            className={`text-xs px-2 py-1 rounded-md border transition-colors ${
              canExportTranscript
                ? 'border-border-default text-text-secondary hover:text-text-primary hover:border-border-strong'
                : 'border-border-default text-text-muted cursor-not-allowed'
            }`}
            title="Copy transcript"
          >
            Copy
          </button>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <i className="fas fa-times"></i>
          </button>
        </div>
      </div>

      {activePanel === 'chat' ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-text-muted opacity-50 text-center px-6">
              <i className="fas fa-comments text-3xl mb-2"></i>
              <p className="text-xs">No messages yet.<br/>Type below to start chatting.</p>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className={`flex flex-col ${msg.sender === 'me' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm relative group ${msg.sender === 'me' ? 'bg-accent text-text-primary rounded-tr-none' : 'bg-elevated text-text-primary rounded-tl-none'}`}>
                  {msg.text}

                  {msg.translatedText && (
                    <div className="mt-2 pt-2 border-t border-border-default text-accent italic text-xs">
                      <i className="fas fa-language mr-2"></i>
                      {msg.translatedText}
                    </div>
                  )}

                  {msg.sender === 'peer' && (
                    <div className="absolute -right-10 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => onTranslate(msg)}
                        disabled={translatingMessageId === msg.id || !!msg.translatedText}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${translatingMessageId === msg.id ? 'text-accent animate-pulse' : msg.translatedText ? 'text-success cursor-default' : 'text-text-muted hover:text-text-primary'}`}
                        title="Translate message"
                      >
                        {translatingMessageId === msg.id ? (
                          <i className="fas fa-circle-notch animate-spin text-[10px]"></i>
                        ) : (
                          <i className="fas fa-language text-[10px]"></i>
                        )}
                      </button>
                      <button
                        onClick={() => onSpeak(msg)}
                        disabled={speakingMessageId === msg.id}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${speakingMessageId === msg.id ? 'text-accent animate-pulse' : 'text-text-muted hover:text-text-primary'}`}
                        title="Translate & Read aloud"
                      >
                        {speakingMessageId === msg.id ? (
                          <i className="fas fa-circle-notch animate-spin text-[10px]"></i>
                        ) : (
                          <i className="fas fa-volume-up text-[10px]"></i>
                        )}
                      </button>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-text-muted mt-1 uppercase font-bold tracking-tighter">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          <input
            type="text"
            value={transcriptQuery}
            onChange={(e) => setTranscriptQuery(e.target.value)}
            placeholder="Search transcript..."
            className="w-full bg-elevated border border-border-default rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent outline-none transition-all text-text-primary"
          />
          {filteredTranscript.length === 0 ? (
            <div className="h-full min-h-36 flex flex-col items-center justify-center text-text-muted opacity-70 text-center px-6">
              <i className="fas fa-file-alt text-3xl mb-2"></i>
              <p className="text-xs">No transcript lines yet.</p>
            </div>
          ) : (
            filteredTranscript.map((entry, idx) => (
              <div key={`${entry.timestampMs}-${idx}`} className="rounded-xl border border-border-default bg-elevated px-3 py-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-text-secondary">{entry.speaker}</span>
                  <span className="text-[10px] text-text-muted">
                    {new Date(entry.timestampMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-text-primary">{entry.text}</p>
              </div>
            ))
          )}
        </div>
      )}

      {activePanel === 'chat' && (
        <div className="px-3 py-2 border-t border-sidebar-border/50 bg-background/10 flex items-center gap-1.5 overflow-x-auto custom-scrollbar text-[11px]">
          <span className="text-text-muted shrink-0 text-[10px] uppercase font-bold tracking-wider">🏡 Inmobiliaria:</span>
          {[
            "¿Cuál es el precio de venta?",
            "Какова стоимость недвижимости?",
            "¿Cómo está la documentación?",
            "Каковы условия оплаты?",
          ].map((phrase, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onChatInputChange(phrase)}
              className="shrink-0 bg-elevated hover:bg-accent-soft hover:text-accent border border-border-default rounded-lg px-2 py-1 text-text-secondary transition-all"
            >
              {phrase}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={onSendMessage} className="p-4 bg-background/20 border-t border-sidebar-border flex gap-2">
        <input
          type="text"
          value={chatInput}
          onChange={(e) => onChatInputChange(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-elevated border border-border-default rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-accent outline-none transition-all text-text-primary"
        />
        <button type="submit" className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center hover:bg-accent-hover transition-colors">
          <i className="fas fa-paper-plane text-xs text-text-primary"></i>
        </button>
      </form>
    </div>
  );
};

export default ChatSidebar;
