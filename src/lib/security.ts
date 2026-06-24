export async function hashPin(pin: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyPin(
  input: string,
  pinHash?: string | null,
  legacyPin?: string | null
): Promise<boolean> {
  if (pinHash) {
    const inputHash = await hashPin(input);
    return inputHash === pinHash;
  }
  if (legacyPin) {
    return input === legacyPin;
  }
  return false;
}
