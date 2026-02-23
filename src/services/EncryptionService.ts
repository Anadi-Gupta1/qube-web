import CryptoJS from 'crypto-js';
import { Bit } from './QuantumKeyService';

/**
 * EncryptionService
 * 
 * Provides AES-256-CBC encryption/decryption using quantum-derived keys
 * 
 * @remarks
 * This service converts BB84-generated bit arrays into hex encryption keys
 * and provides secure message encryption/decryption functionality
 */
export class EncryptionService {
  /**
   * Convert array of bits to hex string (AES-256 key)
   */
  static bitsToHex(bits: Bit[]): string {
    let targetBits = [...bits];
    
    // Ensure we have exactly 256 bits for AES-256
    if (targetBits.length > 256) {
      targetBits = targetBits.slice(0, 256);
    }
    while (targetBits.length < 256) {
      targetBits.push(0);
    }

    let hexString = '';
    for (let i = 0; i < targetBits.length; i += 4) {
      const chunk = targetBits.slice(i, i + 4).join('');
      const hexChar = parseInt(chunk, 2).toString(16);
      hexString += hexChar;
    }
    
    return hexString;
  }

  /**
   * Encrypt plaintext using AES-256
   */
  static encrypt(plaintext: string, keyHex: string): string {
    try {
      const encrypted = CryptoJS.AES.encrypt(plaintext, keyHex);
      return encrypted.toString();
    } catch (error) {
      console.error('🚨 [Encryption] Failed:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt ciphertext using AES-256
   */
  static decrypt(ciphertext: string, keyHex: string): string | null {
    try {
      const decrypted = CryptoJS.AES.decrypt(ciphertext, keyHex);
      const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!plaintext) {
        console.warn('⚠️ [Decryption] Failed - wrong key or corrupted data');
        return null;
      }
      
      return plaintext;
    } catch (error) {
      console.error('🚨 [Decryption] Error:', error);
      return null;
    }
  }

  /**
   * Generate a random IV for additional security (optional enhancement)
   */
  static generateIV(): string {
    return CryptoJS.lib.WordArray.random(128 / 8).toString();
  }
}

export default EncryptionService;
