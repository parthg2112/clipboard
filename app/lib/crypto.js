/**
 * Derives a key from a password using PBKDF2.
 * @param {string} password The user's password.
 * @param {string} salt A unique salt (like the user's UID).
 * @returns {Promise<CryptoKey>} The derived cryptographic key.
 */
export async function deriveKey(password, salt) {
    const enc = new TextEncoder();
    const importedKey = await crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: enc.encode(salt),
            iterations: 100000,
            hash: "SHA-256",
        },
        importedKey,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}

/**
 * Encrypts data using the derived key.
 * @param {string} data The string data to encrypt.
 * @param {CryptoKey} key The encryption key.
 * @returns {Promise<string>} The base64-encoded encrypted string.
 */
export async function encrypt(data, key) {
    const enc = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedContent = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        enc.encode(data)
    );
    const encryptedArr = new Uint8Array([...iv, ...new Uint8Array(encryptedContent)]);
    return btoa(String.fromCharCode.apply(null, Array.from(encryptedArr)));
}

/**
 * Decrypts data using the derived key.
 * @param {string} encryptedData The base64-encoded encrypted string.
 * @param {CryptoKey} key The decryption key.
 * @returns {Promise<string | null>} The decrypted string, or null if decryption fails.
 */
export async function decrypt(encryptedData, key) {
    try {
        const encryptedArr = new Uint8Array(atob(encryptedData).split("").map(c => c.charCodeAt(0)));
        const iv = encryptedArr.slice(0, 12);
        const data = encryptedArr.slice(12);
        const decryptedContent = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            key,
            data
        );
        return new TextDecoder().decode(decryptedContent);
    } catch (error) {
        console.error("Decryption failed:", error);
        return null; // Indicates a decryption error
    }
}


/**
 * Creates a stable room ID from a password using SHA-256 hash.
 * This is NOT for security, but to get a consistent ID.
 * @param {string} password The user's password.
 * @returns {Promise<string>} A hex string representing the room ID.
 */
export async function getRoomId(password) {
    const enc = new TextEncoder();
    const buffer = await crypto.subtle.digest('SHA-256', enc.encode(password));
    const hashArray = Array.from(new Uint8Array(buffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}
