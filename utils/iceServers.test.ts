import { describe, expect, it } from 'vitest';

import { parseIceServers, validateIceServers } from './iceServers';

describe('iceServers', () => {
  it('falls back to STUN when JSON is invalid', () => {
    const result = parseIceServers('{bad json');

    expect(result.servers).toEqual([{ urls: 'stun:stun.l.google.com:19302' }]);
    expect(result.hasTurn).toBe(false);
    expect(result.warnings[0]).toMatch(/not valid JSON/);
  });

  it('accepts multiple STUN and TURN urls', () => {
    const result = validateIceServers([
      { urls: ['stun:stun.example.com:3478', 'turns:turn.example.com:5349'], username: 'u', credential: 'c' },
    ]);

    expect(result.servers[0].urls).toEqual(['stun:stun.example.com:3478', 'turns:turn.example.com:5349']);
    expect(result.hasTurn).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it('warns when TURN credentials are missing', () => {
    const result = validateIceServers([{ urls: 'turn:turn.example.com:3478' }]);

    expect(result.hasTurn).toBe(true);
    expect(result.warnings).toContain('TURN server at index 0 is missing username or credential.');
  });

  it('drops unsupported urls and warns when no TURN exists', () => {
    const result = validateIceServers([{ urls: 'https://example.com' }, { urls: 'stun:stun.example.com' }]);

    expect(result.servers).toEqual([{ urls: 'stun:stun.example.com' }]);
    expect(result.hasTurn).toBe(false);
    expect(result.warnings).toContain('ICE server at index 0 has no supported stun/turn urls.');
    expect(result.warnings).toContain('No TURN server configured; restrictive NAT/firewall networks may fail.');
  });
});
