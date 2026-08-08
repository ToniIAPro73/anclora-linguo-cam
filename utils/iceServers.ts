export interface IceServerValidationResult {
  servers: RTCIceServer[];
  hasTurn: boolean;
  warnings: string[];
}

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];
const ALLOWED_ICE_SCHEMES = ['stun:', 'stuns:', 'turn:', 'turns:'];

const normalizeUrls = (urls: string | string[]): string[] =>
  (Array.isArray(urls) ? urls : [urls])
    .map((url) => url.trim())
    .filter(Boolean);

export function validateIceServers(input: unknown): IceServerValidationResult {
  if (!Array.isArray(input)) {
    return {
      servers: DEFAULT_ICE_SERVERS,
      hasTurn: false,
      warnings: ['VITE_ICE_SERVERS must be a JSON array; using default STUN.'],
    };
  }

  const warnings: string[] = [];
  const servers: RTCIceServer[] = [];

  input.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object' || !('urls' in entry)) {
      warnings.push(`ICE server at index ${index} has no urls field.`);
      return;
    }
    const candidate = entry as { urls: unknown; username?: unknown; credential?: unknown };
    if (typeof candidate.urls !== 'string' && !Array.isArray(candidate.urls)) {
      warnings.push(`ICE server at index ${index} has invalid urls type.`);
      return;
    }
    if (Array.isArray(candidate.urls) && candidate.urls.some((url) => typeof url !== 'string')) {
      warnings.push(`ICE server at index ${index} contains a non-string url.`);
      return;
    }

    const urls = normalizeUrls(candidate.urls as string | string[]);
    const validUrls = urls.filter((url) => ALLOWED_ICE_SCHEMES.some((scheme) => url.startsWith(scheme)));
    if (!validUrls.length) {
      warnings.push(`ICE server at index ${index} has no supported stun/turn urls.`);
      return;
    }

    const hasTurnUrl = validUrls.some((url) => url.startsWith('turn:') || url.startsWith('turns:'));
    if (hasTurnUrl && (typeof candidate.username !== 'string' || typeof candidate.credential !== 'string')) {
      warnings.push(`TURN server at index ${index} is missing username or credential.`);
    }

    servers.push({
      urls: Array.isArray(candidate.urls) ? validUrls : validUrls[0],
      username: typeof candidate.username === 'string' ? candidate.username : undefined,
      credential: typeof candidate.credential === 'string' ? candidate.credential : undefined,
    });
  });

  const finalServers = servers.length ? servers : DEFAULT_ICE_SERVERS;
  const hasTurn = finalServers.some((server) =>
    normalizeUrls(server.urls).some((url) => url.startsWith('turn:') || url.startsWith('turns:')),
  );
  if (!hasTurn) {
    warnings.push('No TURN server configured; restrictive NAT/firewall networks may fail.');
  }

  return { servers: finalServers, hasTurn, warnings };
}

export function parseIceServers(raw: string | undefined): IceServerValidationResult {
  if (!raw) {
    return validateIceServers(DEFAULT_ICE_SERVERS);
  }
  try {
    return validateIceServers(JSON.parse(raw));
  } catch {
    return {
      servers: DEFAULT_ICE_SERVERS,
      hasTurn: false,
      warnings: ['VITE_ICE_SERVERS is not valid JSON; using default STUN.'],
    };
  }
}
