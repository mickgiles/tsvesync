export interface Session {
  token: string;
  accountId: string;
  countryCode?: string | null;
  region: string;
  apiBaseUrl: string;
  authFlowUsed?: 'legacy' | 'new';
  issuedAt?: number | null; // epoch seconds
  expiresAt?: number | null; // epoch seconds
  lastValidatedAt?: number | null; // epoch ms
  libraryVersion?: string;
}

export interface SessionStore {
  load(): Promise<Session | null>;
  save(session: Session): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Decode a JWT token payload to extract iat/exp without verifying the signature.
 */
export function decodeJwtTimestamps(token: string): { iat?: number; exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    let iat = typeof payload.iat === 'number' ? payload.iat : undefined;
    let exp = typeof payload.exp === 'number' ? payload.exp : undefined;
    // Normalize to seconds if values are in milliseconds
    if (iat && iat > 1e11) iat = Math.floor(iat / 1000);
    if (exp && exp > 1e11) exp = Math.floor(exp / 1000);
    return { iat, exp };
  } catch {
    return null;
  }
}
