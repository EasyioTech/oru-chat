
const DB_NAME = 'enterprise_chat_crypto';
const STORE_NAME = 'keys';

// Check if Web Crypto API is available (requires HTTPS or localhost)
function isCryptoAvailable(): boolean {
  return typeof window !== 'undefined' &&
    window.crypto !== undefined &&
    window.crypto.subtle !== undefined;
}

async function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function generateUserKeyPair(): Promise<string> {
  if (!isCryptoAvailable()) {
    console.warn('Web Crypto API not available. Encryption features disabled. Use HTTPS or localhost.');
    return ''; // Return empty string to indicate encryption is not available
  }

  try {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['wrapKey', 'unwrapKey']
    );

    const publicKeyJWK = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);

    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(keyPair.privateKey, 'privateKey');

    return JSON.stringify(publicKeyJWK);
  } catch (error) {
    console.error('Failed to generate encryption keys:', error);
    return '';
  }
}

export async function getPrivateKey(): Promise<CryptoKey | null> {
  if (!isCryptoAvailable()) return null;

  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    return new Promise((resolve) => {
      const request = tx.objectStore(STORE_NAME).get('privateKey');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  } catch (error) {
    return null;
  }
}

export async function importPublicKey(jwkString: string): Promise<CryptoKey | null> {
  if (!isCryptoAvailable()) return null;

  try {
    const jwk = JSON.parse(jwkString);
    return await window.crypto.subtle.importKey(
      'jwk',
      jwk,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      true,
      ['wrapKey']
    );
  } catch (error) {
    console.error('Failed to import public key:', error);
    return null;
  }
}

export async function generateChannelKey(): Promise<CryptoKey | null> {
  if (!isCryptoAvailable()) return null;

  try {
    return await window.crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    );
  } catch (error) {
    console.error('Failed to generate channel key:', error);
    return null;
  }
}

export async function wrapChannelKey(channelKey: CryptoKey, publicKey: CryptoKey): Promise<string> {
  if (!isCryptoAvailable()) return '';

  try {
    const wrapped = await window.crypto.subtle.wrapKey(
      'raw',
      channelKey,
      publicKey,
      { name: 'RSA-OAEP' }
    );
    return btoa(String.fromCharCode(...new Uint8Array(wrapped)));
  } catch (error) {
    console.error('Failed to wrap channel key:', error);
    return '';
  }
}

export async function unwrapChannelKey(wrappedKeyBase64: string, privateKey: CryptoKey): Promise<CryptoKey | null> {
  if (!isCryptoAvailable()) return null;

  try {
    const wrappedBuffer = Uint8Array.from(atob(wrappedKeyBase64), c => c.charCodeAt(0));
    return await window.crypto.subtle.unwrapKey(
      'raw',
      wrappedBuffer,
      privateKey,
      { name: 'RSA-OAEP' },
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  } catch (error) {
    console.error('Failed to unwrap channel key:', error);
    return null;
  }
}

export async function encryptMessage(text: string, aesKey: CryptoKey): Promise<{ content: string; iv: string } | null> {
  if (!isCryptoAvailable()) return null;

  try {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(text);

    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      aesKey,
      encoded
    );

    return {
      content: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      iv: btoa(String.fromCharCode(...new Uint8Array(iv))),
    };
  } catch (error) {
    console.error('Failed to encrypt message:', error);
    return null;
  }
}

export async function decryptMessage(encryptedBase64: string, ivBase64: string, aesKey: CryptoKey): Promise<string | null> {
  if (!isCryptoAvailable()) return null;

  try {
    const encrypted = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      aesKey,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Failed to decrypt message:', error);
    return null;
  }
}
