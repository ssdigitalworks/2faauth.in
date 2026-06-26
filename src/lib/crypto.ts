// Web Crypto AES-GCM Utility

export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  
  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordData,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptData(data: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(data);
  
  const encryptedContent = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedData
  );
  
  // Pack into a single base64 string: salt + iv + encryptedData
  const encryptedBuffer = new Uint8Array(encryptedContent);
  const packed = new Uint8Array(salt.length + iv.length + encryptedBuffer.length);
  packed.set(salt, 0);
  packed.set(iv, salt.length);
  packed.set(encryptedBuffer, salt.length + iv.length);
  
  return btoa(String.fromCharCode(...packed));
}

export async function decryptData(packedBase64: string, password: string): Promise<string> {
  try {
    const packedString = atob(packedBase64);
    const packed = new Uint8Array(packedString.length);
    for (let i = 0; i < packedString.length; i++) {
      packed[i] = packedString.charCodeAt(i);
    }
    
    const salt = packed.slice(0, 16);
    const iv = packed.slice(16, 28);
    const encryptedData = packed.slice(28);
    
    const key = await deriveKey(password, salt);
    
    const decryptedContent = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decryptedContent);
  } catch (e) {
    throw new Error("Invalid password or corrupted data");
  }
}
