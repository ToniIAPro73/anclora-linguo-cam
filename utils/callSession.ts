export function normalizeRoomCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '');
}

export function extractRoomCode(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      const room = parsed.searchParams.get('room') || parsed.searchParams.get('ROOM');
      if (room) return normalizeRoomCode(room);
    } catch {
      return normalizeRoomCode(trimmed);
    }
  }

  const roomMatch = trimmed.match(/[?&]room=([^&]+)/i);
  if (roomMatch?.[1]) {
    return normalizeRoomCode(decodeURIComponent(roomMatch[1]));
  }

  return normalizeRoomCode(trimmed);
}

export function extractHostPeerId(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) return '';

  try {
    const parsed = new URL(trimmed);
    return normalizeRoomCode(
      parsed.searchParams.get('hostPeerId')
      || parsed.searchParams.get('host_peer_id')
      || '',
    );
  } catch {
    return '';
  }
}

export function buildInviteLink(
  origin: string,
  pathname: string,
  roomCode: string,
  hostPeerId?: string,
  hostMyLang?: string,
  hostRemoteLang?: string,
): string {
  const room = normalizeRoomCode(roomCode);
  const params = new URLSearchParams({ room });
  const normalizedHostPeerId = normalizeRoomCode(hostPeerId || '');
  if (normalizedHostPeerId) params.set('hostPeerId', normalizedHostPeerId);
  // Invert languages for the invitee if provided (host's remote is invitee's speaker language)
  if (hostRemoteLang) params.set('myLang', hostRemoteLang);
  if (hostMyLang) params.set('remoteLang', hostMyLang);
  return `${origin}${pathname}?${params.toString()}`;
}

export function shouldInitiateCall(myPeerId: string, initiatorPeerId: string | null): boolean {
  return Boolean(myPeerId && initiatorPeerId && myPeerId === initiatorPeerId);
}

export function stopMediaStream(stream: MediaStream | null): void {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
}
