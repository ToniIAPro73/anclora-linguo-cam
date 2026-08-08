import { describe, expect, it, vi } from 'vitest';

import {
  buildInviteLink,
  extractHostPeerId,
  extractRoomCode,
  normalizeRoomCode,
  shouldInitiateCall,
  stopMediaStream,
} from './callSession';

describe('callSession utilities', () => {
  it('normalizes room code', () => {
    expect(normalizeRoomCode(' room-  abc ')).toBe('ROOM-ABC');
  });

  it('builds encoded invite link', () => {
    expect(buildInviteLink('https://demo.local', '/app', 'room a')).toBe(
      'https://demo.local/app?room=ROOMA',
    );
    expect(buildInviteLink('https://demo.local', '/app', 'room a', 'abc12')).toBe(
      'https://demo.local/app?room=ROOMA&hostPeerId=ABC12',
    );
  });

  it('extracts room code from full invite url', () => {
    expect(extractRoomCode('http://localhost:3000/?room=ROOM-AB12')).toBe('ROOM-AB12');
    expect(extractRoomCode('https://demo.local/path?ROOM=room-x9')).toBe('ROOM-X9');
  });

  it('extracts host peer id from full invite url', () => {
    expect(extractHostPeerId('https://demo.local/path?room=ROOM-X9&hostPeerId=abc12')).toBe('ABC12');
    expect(extractHostPeerId('ROOM-X9')).toBe('');
  });

  it('detects initiator peer', () => {
    expect(shouldInitiateCall('ABC123', 'ABC123')).toBe(true);
    expect(shouldInitiateCall('ABC123', 'XYZ999')).toBe(false);
  });

  it('stops all stream tracks', () => {
    const stopA = vi.fn();
    const stopB = vi.fn();
    const stream = {
      getTracks: () => [{ stop: stopA }, { stop: stopB }],
    } as unknown as MediaStream;

    stopMediaStream(stream);

    expect(stopA).toHaveBeenCalledTimes(1);
    expect(stopB).toHaveBeenCalledTimes(1);
  });
});
