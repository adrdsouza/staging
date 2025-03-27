// lib/encryption.ts
/**
 * Encryption utilities for sensitive data
 * 
 * This utility provides functions to encrypt and decrypt sensitive data
 * using Node.js built-in crypto module with AES-256-GCM algorithm.
 */

import crypto from 'crypto';

// Get encryption key from environment variable
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// Ensure encryption key is available and valid (32 bytes for AES-256)
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
  console.error('Invalid or missing ENCRYPTION_KEY environment variable');
  // In production, this should trigger an alert to administrators
}

// Algorithm configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For AES, this is always 16 bytes
const AUTH_TAG_LENGTH = 16; // For GCM mode

interface EncryptedData {
  iv: string;
  encryptedData: string;
  authTag: string;
}

/**
 * Encrypt sensitive data
 * 
 * @param text The plaintext to encrypt
 * @returns Object containing the IV, encrypted data, and authentication tag
 */
export function encrypt(text: string): EncryptedData {
  if (!ENCRYPTION_KEY) {
    throw new Error('Encryption key is not configured');
  }

  try {
    // Generate a random initialization vector
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher
    const cipher = crypto.createCipheriv(
      ALGORITHM, 
      Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), 
      iv
    );
    
    // Encrypt the data
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get the authentication tag
    const authTag = cipher.getAuthTag().toString('hex');
    
    return {
      iv: iv.toString('hex'),
      encryptedData: encrypted,
      authTag
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt encrypted data
 * 
 * @param encryptedData Object containing the IV, encrypted data, and authentication tag
 * @returns The decrypted plaintext
 */
export function decrypt(encryptedData: EncryptedData): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('Encryption key is not configured');
  }

  try {
    // Convert IV and auth tag from hex to buffers
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    
    // Create decipher
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)),
      iv
    );
    
    // Set auth tag
    decipher.setAuthTag(authTag);
    
    // Decrypt the data
    let decrypted = decipher.update(encryptedData.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hash a string (one-way) using SHA-256
 * 
 * @param text The text to hash
 * @returns The hashed string
 */
export function hash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Generate a secure random token
 * 
 * @param length The length of the token in bytes
 * @returns The token as a hex string
 */
export function generateToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Create a secure HMAC for data verification
 * 
 * @param data The data to sign
 * @param secret The secret key to use (defaults to ENCRYPTION_KEY)
 * @returns The HMAC signature
 */
export function createHmac(data: string, secret?: string): string {
  const key = secret || ENCRYPTION_KEY || 'default-fallback-key';
  return crypto.createHmac('sha256', key).update(data).digest('hex');
}

/**
 * Verify a HMAC signature
 * 
 * @param data The original data
 * @param signature The HMAC signature to verify
 * @param secret The secret key used to create the signature
 * @returns Whether the signature is valid
 */
export function verifyHmac(data: string, signature: string, secret?: string): boolean {
  const computedSignature = createHmac(data, secret);
  return crypto.timingSafeEqual(
    Buffer.from(computedSignature, 'hex'),
    Buffer.from(signature, 'hex')
  );
}
