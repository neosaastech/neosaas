/**
 * Utilitaires de chiffrement pour sécuriser les credentials des fournisseurs
 * Utilise AES-256-GCM avec Web Crypto API
 * Dérive la clé de cryptage à partir de NEXTAUTH_SECRET
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;

/**
 * Récupérer le secret de cryptage depuis NEXTAUTH_SECRET
 */
function getEncryptionSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error('NEXTAUTH_SECRET ou AUTH_SECRET est requis pour le cryptage des données');
  }

  if (secret.length < 32) {
    throw new Error('NEXTAUTH_SECRET doit faire au moins 32 caractères');
  }

  return secret;
}

/**
 * Dériver une clé de chiffrement depuis le secret
 */
async function deriveKey(secret: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Chiffrer des données sensibles
 */
export async function encrypt(data: string): Promise<string> {
  const secret = getEncryptionSecret();

  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  // Générer salt et IV aléatoires
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Dériver la clé
  const key = await deriveKey(secret, salt);

  // Chiffrer
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    dataBuffer
  );

  // Combiner salt + IV + encrypted data
  const resultBuffer = new Uint8Array(
    SALT_LENGTH + IV_LENGTH + encryptedBuffer.byteLength
  );
  resultBuffer.set(salt, 0);
  resultBuffer.set(iv, SALT_LENGTH);
  resultBuffer.set(new Uint8Array(encryptedBuffer), SALT_LENGTH + IV_LENGTH);

  // Encoder en base64
  return Buffer.from(resultBuffer).toString('base64');
}

/**
 * Déchiffrer des données
 */
export async function decrypt(encryptedData: string): Promise<string> {
  const secret = getEncryptionSecret();

  // Décoder depuis base64
  const buffer = Buffer.from(encryptedData, 'base64');

  // Extraire salt, IV et données chiffrées
  const salt = buffer.slice(0, SALT_LENGTH);
  const iv = buffer.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const encrypted = buffer.slice(SALT_LENGTH + IV_LENGTH);

  // Dériver la clé
  const key = await deriveKey(secret, salt);

  // Déchiffrer
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    encrypted
  );

  // Décoder en string
  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * Hasher une string (pour les clés API dans les logs)
 */
export function hash(data: string): string {
  // Utilise un simple hash non-cryptographique pour l'affichage
  let h = 0;
  for (let i = 0; i < data.length; i++) {
    h = (Math.imul(31, h) + data.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16);
}

/**
 * Masquer les données sensibles pour l'affichage
 */
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (data.length <= visibleChars) {
    return '*'.repeat(data.length);
  }
  return data.slice(0, visibleChars) + '*'.repeat(data.length - visibleChars);
}
