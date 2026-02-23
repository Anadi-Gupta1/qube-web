import { get, set, del, keys } from 'idb-keyval';

/**
 * CachedMessage
 * 
 * Represents a decrypted message stored in IndexedDB
 */
export interface CachedMessage {
  id: string;
  text: string; // Decrypted plaintext
  timestamp: number;
  senderId: string;
  senderName: string;
  decryptedAt: number;
}

/**
 * LocalStorageService
 * 
 * Local-first message caching using IndexedDB
 * 
 * @remarks
 * Implements persistent storage for decrypted messages and session keys.
 * Part of the Perfect Forward Secrecy architecture.
 */
export class LocalStorageService {
  /**
   * Store a decrypted message in IndexedDB
   */
  static async cacheMessage(sessionId: string, message: CachedMessage): Promise<void> {
    try {
      const key = `msg_${sessionId}_${message.id}`;
      await set(key, message);
      console.log(`💾 [LocalCache] Saved message ${message.id}`);
    } catch (error) {
      console.error('🚨 [LocalCache] Failed to save:', error);
    }
  }

  /**
   * Get all cached messages for a session
   */
  static async getCachedMessages(sessionId: string): Promise<CachedMessage[]> {
    try {
      const prefix = `msg_${sessionId}_`;
      const allKeys = await keys();
      
      const sessionKeys = allKeys.filter(key => 
        typeof key === 'string' && key.startsWith(prefix)
      );

      const messages: CachedMessage[] = [];
      for (const key of sessionKeys) {
        const msg = await get<CachedMessage>(key);
        if (msg) {
          messages.push(msg);
        }
      }

      console.log(`📦 [LocalCache] Loaded ${messages.length} cached messages`);
      return messages.sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      console.error('🚨 [LocalCache] Failed to load:', error);
      return [];
    }
  }

  /**
   * Check if a specific message is cached
   */
  static async isMessageCached(sessionId: string, messageId: string): Promise<boolean> {
    try {
      const key = `msg_${sessionId}_${messageId}`;
      const msg = await get(key);
      return !!msg;
    } catch {
      return false;
    }
  }

  /**
   * Clear all cached messages for a session
   */
  static async clearSession(sessionId: string): Promise<void> {
    try {
      const prefix = `msg_${sessionId}_`;
      const allKeys = await keys();
      
      const sessionKeys = allKeys.filter(key => 
        typeof key === 'string' && key.startsWith(prefix)
      );

      for (const key of sessionKeys) {
        await del(key);
      }

      console.log(`🗑️ [LocalCache] Cleared ${sessionKeys.length} messages for session`);
    } catch (error) {
      console.error('🚨 [LocalCache] Failed to clear:', error);
    }
  }

  /**
   * Store the current session key (ephemeral)
   */
  static async storeSessionKey(sessionId: string, keyHex: string): Promise<void> {
    try {
      const key = `key_${sessionId}`;
      await set(key, { keyHex, storedAt: Date.now() });
      console.log('🔑 [LocalCache] Session key stored');
    } catch (error) {
      console.error('🚨 [LocalCache] Failed to store key:', error);
    }
  }

  /**
   * Get the current session key
   */
  static async getSessionKey(sessionId: string): Promise<string | null> {
    try {
      const key = `key_${sessionId}`;
      const data = await get<{ keyHex: string; storedAt: number }>(key);
      return data?.keyHex || null;
    } catch {
      return null;
    }
  }

  /**
   * Delete the session key (Perfect Forward Secrecy)
   */
  static async deleteSessionKey(sessionId: string): Promise<void> {
    try {
      const key = `key_${sessionId}`;
      await del(key);
      console.log('🔥 [LocalCache] Session key burned (PFS)');
    } catch (error) {
      console.error('🚨 [LocalCache] Failed to delete key:', error);
    }
  }
}

export default LocalStorageService;
