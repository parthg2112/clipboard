// lib/crypto.js

/**
 * Hash password for server-side room authentication
 */
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Derive room ID from password
 */
export async function getRoomId(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'room_salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}

/**
 * Derive encryption key from password and room ID
 */
export async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt text content
 */
export async function encrypt(text, key) {
  if (!text) return '';
  
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    data
  );
  
  const encryptedArray = new Uint8Array(encrypted);
  const result = new Uint8Array(iv.length + encryptedArray.length);
  result.set(iv);
  result.set(encryptedArray, iv.length);
  
  return Array.from(result).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Decrypt text content
 */
export async function decrypt(encryptedHex, key) {
  if (!encryptedHex) return '';
  
  try {
    const encryptedArray = new Uint8Array(
      encryptedHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
    );
    
    const iv = encryptedArray.slice(0, 12);
    const data = encryptedArray.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      data
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    return 'Decryption failed';
  }
}

// --- Helper functions for ArrayBuffer and Base64 conversion ---
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Encrypts a file's ArrayBuffer.
 * @param {ArrayBuffer} fileBuffer - The raw file content.
 * @param {CryptoKey} key - The encryption key.
 * @returns {Promise<Blob>} - A Blob containing the encrypted file data.
 */
export async function encryptFile(fileBuffer, key) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    fileBuffer
  );

  // Prepend the IV to the encrypted data. This is crucial for decryption.
  const encryptedBytes = new Uint8Array(encryptedContent);
  const finalBuffer = new Uint8Array(iv.length + encryptedBytes.length);
  finalBuffer.set(iv);
  finalBuffer.set(encryptedBytes, iv.length);

  return new Blob([finalBuffer]);
}

/**
 * Decrypts a file Blob.
 * @param {ArrayBuffer} encryptedFileBuffer - The encrypted file content.
 * @param {CryptoKey} key - The encryption key.
 * @returns {Promise<Blob>} - A Blob containing the original, decrypted file data.
 */
export async function decryptFile(encryptedFileBuffer, key) {
  const encryptedData = new Uint8Array(encryptedFileBuffer);
  
  // Extract the IV from the beginning of the file
  const iv = encryptedData.slice(0, 12);
  const data = encryptedData.slice(12);

  const decryptedContent = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    key,
    data
  );

  return new Blob([decryptedContent]);
}
