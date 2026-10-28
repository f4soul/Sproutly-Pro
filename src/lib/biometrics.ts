import { logger } from '../lib/logger';
export const isBiometricsSupported = async () => {
  if (typeof window === 'undefined') return false;
  try {
    // If running in an iframe (like a preview sandbox),
    // WebAuthn is generally blocked by Permissions-Policy and security constraints.
    if (window.self !== window.top) {
      return false;
    }
    if (window.PublicKeyCredential) {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch (e) {
    logger.warn("Biometrics support check failed:", e);
    return false;
  }
  return false;
};

const randomChallenge = () => {
  return crypto.getRandomValues(new Uint8Array(32));
};

/**
 * Возвращает имя пользователя для регистрации Passkey (WebAuthn)
 * в соответствии со стандартами FIDO Alliance (Apple, Google, GitHub):
 * 1. Email аккаунта (основной системный идентификатор в менеджерах паролей)
 * 2. Имя профиля (displayName), если email недоступен
 * 3. «Пользователь Sproutly» для локального офлайн-режима
 */
export const getPasskeyUserName = (userEmail?: string | null, userDisplayName?: string | null): string => {
  if (userEmail && userEmail.trim().length > 0) {
    return userEmail.trim();
  }
  if (userDisplayName && userDisplayName.trim().length > 0) {
    return userDisplayName.trim();
  }
  return 'Пользователь Sproutly';
};

export const registerBiometricCredential = async (userId: string, userName?: string) => {
  if (!window.PublicKeyCredential) throw new Error("WebAuthn not supported");
  
  const finalName = userName && userName.trim().length > 0 ? userName.trim() : 'Пользователь Sproutly';

  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge: randomChallenge(),
    rp: { name: "Sproutly.Pro", id: window.location.hostname },
    user: {
      id: Uint8Array.from(userId, c => c.charCodeAt(0)),
      name: finalName,
      displayName: finalName,
    },
    pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required",
    },
    timeout: 60000,
    attestation: "none",
  };

  const credential = await navigator.credentials.create({ publicKey });
  return credential as PublicKeyCredential;
};

export const verifyBiometricCredential = async (credentialId: string | string[]) => {
  if (!window.PublicKeyCredential) throw new Error("WebAuthn not supported");
  
  const ids = Array.isArray(credentialId) ? credentialId : [credentialId];
  const allowCredentials = ids.map(id => ({
    id: base64UrlToArrayBuffer(id),
    type: "public-key" as const,
  }));

  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge: randomChallenge(),
    allowCredentials,
    userVerification: "required",
    timeout: 60000,
  };

  const credential = await navigator.credentials.get({ publicKey });
  return credential as PublicKeyCredential;
};

const base64UrlToArrayBuffer = (base64url: string) => {
  const padding = '='.repeat((4 - base64url.length % 4) % 4);
  const base64 = (base64url + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

export const arrayBufferToBase64Url = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};
