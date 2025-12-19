import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Use AES-256-GCM encryption (military-grade)
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For GCM mode
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

// Get encryption key from environment variable
// IMPORTANT: This must be a 32-byte (256-bit) key
const getEncryptionKey = () => {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  
  // Ensure the key is exactly 32 bytes by hashing it
  return crypto.createHash('sha256').update(key).digest();
};

/**
 * Encrypts sensitive data using AES-256-GCM
 * @param {string} text - The text to encrypt
 * @returns {string} - Encrypted data in format: iv:authTag:encrypted
 */
export const encrypt = (text) => {
  try {
    if (!text) {
      throw new Error('Text to encrypt cannot be empty');
    }

    const key = getEncryptionKey();
    
    // Generate a random IV (Initialization Vector) for each encryption
    // This ensures that encrypting the same text twice produces different ciphertext
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt the text
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get the authentication tag (prevents tampering)
    const authTag = cipher.getAuthTag();
    
    // Combine IV, auth tag, and encrypted data
    // Format: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypts data encrypted with the encrypt function
 * @param {string} encryptedData - Data in format: iv:authTag:encrypted
 * @returns {string} - Decrypted text
 */
export const decrypt = (encryptedData) => {
  try {
    if (!encryptedData) {
      throw new Error('Encrypted data cannot be empty');
    }

    const key = getEncryptionKey();
    
    // Split the encrypted data
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const [ivHex, authTagHex, encrypted] = parts;
    
    // Convert from hex to Buffer
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    // Set the authentication tag
    decipher.setAuthTag(authTag);
    
    // Decrypt the data
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
};

/**
 * Generates a secure random encryption key
 * Use this to generate a new ENCRYPTION_KEY for .env
 * @returns {string} - 64-character hex string (32 bytes)
 */
export const generateEncryptionKey = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Hashes sensitive data (one-way, cannot be reversed)
 * Use for passwords, not for API keys that need to be retrieved
 * @param {string} text - Text to hash
 * @returns {string} - Hashed text
 */
export const hash = (text) => {
  return crypto.createHash('sha256').update(text).digest('hex');
};

/**
 * Verifies a hash matches the original text
 * @param {string} text - Original text
 * @param {string} hashedText - Hashed text to compare
 * @returns {boolean} - True if match
 */
export const verifyHash = (text, hashedText) => {
  const textHash = hash(text);
  return crypto.timingSafeEqual(
    Buffer.from(textHash),
    Buffer.from(hashedText)
  );
};

export default {
  encrypt,
  decrypt,
  generateEncryptionKey,
  hash,
  verifyHash
};
