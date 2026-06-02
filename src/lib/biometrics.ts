export const isBiometricsSupported = async () => {
  if (typeof window === 'undefined') return false;
  try {
    // If running in an iframe (like the AI Studio development/share preview),
    // WebAuthn is generally blocked by Permissions-Policy and security constraints.
    if (window.self !== window.top) {
      return false;
    }
    if (window.PublicKeyCredential) {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch (e) {
    console.warn("Biometrics support check failed:", e);
    return false;
  }
  return false;
};

const randomChallenge = () => {
  return crypto.getRandomValues(new Uint8Array(32));
};

export const registerBiometricCredential = async (userId: string, userName: string) => {
  if (!window.PublicKeyCredential) throw new Error("WebAuthn not supported");
  
  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge: randomChallenge(),
    rp: { name: "Sproutly.Pro", id: window.location.hostname },
    user: {
      id: Uint8Array.from(userId, c => c.charCodeAt(0)),
      name: userName,
      displayName: userName,
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
