// Keep this module dependency-free and safe to run very early.

function bytesToUuidV4(bytes: Uint8Array): string {
  // RFC 4122 v4
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex: string[] = [];
  for (let i = 0; i < bytes.length; i++) {
    hex.push(bytes[i].toString(16).padStart(2, '0'));
  }
  return (
    hex.slice(0, 4).join('') + '-' +
    hex.slice(4, 6).join('') + '-' +
    hex.slice(6, 8).join('') + '-' +
    hex.slice(8, 10).join('') + '-' +
    hex.slice(10, 16).join('')
  );
}

function ensureRandomUUID(): void {
  try {
    const c: any = (globalThis as any).crypto;
    if (!c) return;
    if (typeof c.randomUUID === 'function') return;

    if (typeof c.getRandomValues === 'function') {
      c.randomUUID = () => {
        const bytes = new Uint8Array(16);
        c.getRandomValues(bytes);
        return bytesToUuidV4(bytes);
      };
      return;
    }

    // Last resort: non-crypto UUID (should be extremely rare).
    c.randomUUID = () => {
      const bytes = new Uint8Array(16);
      for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
      return bytesToUuidV4(bytes);
    };
  } catch {
    // ignore
  }
}

ensureRandomUUID();
