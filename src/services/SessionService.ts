import { database } from '../firebase/config';
import { ref, set, get, update, onValue, off, DataSnapshot } from 'firebase/database';
import { Basis, Bit } from './QuantumKeyService';

export type SessionStatus =
  | 'initializing'
  | 'ready_to_start'
  | 'transmitting'
  | 'photons_sent'
  | 'ready_to_measure'
  | 'measuring'
  | 'waiting_for_alice'
  | 'sifting'
  | 'secure'
  | 'rekeying';

export interface QuantumPayload {
  bits: Bit[];
  bases: Basis[];
}

export interface Message {
  id: string;
  text: string; // encrypted
  timestamp: number;
  senderId: string;
  senderName: string;
}

export interface SessionData {
  status: SessionStatus;
  handshakeComplete: boolean;
  aliceId: string | null;
  quantumPayload: QuantumPayload | null;
  bobBases: Basis[] | null;
  matchingIndexes: number[] | null;
  messages: { [key: string]: Message };
  createdAt: number;
  lastActivity: number;
}

export class SessionService {
  /**
   * Generate deterministic session ID from two user IDs
   */
  static getSessionId(uid1: string, uid2: string): string {
    return [uid1, uid2].sort().join('_');
  }

  /**
   * Check-and-Set: Initialize or join existing session
   */
  static async initializeSession(currentUid: string, peerUid: string): Promise<'created' | 'joined'> {
    const sessionId = this.getSessionId(currentUid, peerUid);
    const sessionRef = ref(database, `sessions/${sessionId}`);

    try {
      const snapshot = await get(sessionRef);
      const data = snapshot.val() as SessionData | null;

      // Case 1: Session doesn't exist OR handshake is complete (start fresh)
      if (!data || data.handshakeComplete === true) {
        await set(sessionRef, {
          status: 'initializing',
          handshakeComplete: false,
          aliceId: null,
          quantumPayload: null,
          bobBases: null,
          matchingIndexes: null,
          messages: {},
          createdAt: Date.now(),
          lastActivity: Date.now(),
        } as SessionData);
        
        console.log('🆕 [Session] Created new session:', sessionId);
        return 'created';
      }

      // Case 2: Handshake is in progress, join it
      if (data.handshakeComplete === false) {
        // Migration: Add missing fields to old sessions
        if (data.aliceId === undefined || data.quantumPayload === undefined) {
          console.log('🔧 [Session] Migrating old session to new schema');
          await update(sessionRef, {
            aliceId: data.aliceId ?? null,
            quantumPayload: data.quantumPayload ?? null,
            bobBases: data.bobBases ?? null,
            matchingIndexes: data.matchingIndexes ?? null,
            messages: data.messages ?? {},
          });
        }
        
        console.log('🔗 [Session] Joined existing handshake:', sessionId);
        return 'joined';
      }

      return 'created';
    } catch (error) {
      console.error('🚨 [Session] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Update session status
   */
  static async updateStatus(sessionId: string, status: SessionStatus): Promise<void> {
    const sessionRef = ref(database, `sessions/${sessionId}`);
    await update(sessionRef, {
      status,
      lastActivity: Date.now(),
    });
    console.log(`📡 [Session] Status updated: ${status}`);
  }

  /**
   * Alice: Upload quantum payload and claim role
   */
  static async uploadQuantumPayload(
    sessionId: string,
    aliceId: string,
    payload: QuantumPayload
  ): Promise<void> {
    const sessionRef = ref(database, `sessions/${sessionId}`);
    await update(sessionRef, {
      aliceId,
      quantumPayload: payload,
      status: 'photons_sent',
      lastActivity: Date.now(),
    });
    console.log('📤 [Alice] Quantum payload uploaded');
  }

  /**
   * Bob: Upload measurement bases
   */
  static async uploadBobBases(sessionId: string, bobBases: Basis[]): Promise<void> {
    const sessionRef = ref(database, `sessions/${sessionId}`);
    await update(sessionRef, {
      bobBases,
      status: 'ready_to_measure',
      lastActivity: Date.now(),
    });
    console.log('📤 [Bob] Measurement bases uploaded');
  }

  /**
   * Alice: Upload matching indexes after sifting
   */
  static async uploadMatchingIndexes(sessionId: string, matchingIndexes: number[]): Promise<void> {
    const sessionRef = ref(database, `sessions/${sessionId}`);
    await update(sessionRef, {
      matchingIndexes,
      handshakeComplete: true,
      status: 'secure',
      lastActivity: Date.now(),
    });
    console.log('✅ [Alice] Sifting complete, handshake secure');
  }

  /**
   * Send encrypted message
   */
  static async sendMessage(
    sessionId: string,
    message: Message
  ): Promise<void> {
    const messageRef = ref(database, `sessions/${sessionId}/messages/${message.id}`);
    await set(messageRef, message);
    console.log('💬 [Message] Sent:', message.id);
  }

  /**
   * Listen to session changes
   */
  static listenToSession(
    sessionId: string,
    callback: (data: SessionData | null) => void
  ): () => void {
    const sessionRef = ref(database, `sessions/${sessionId}`);
    
    const listener = (snapshot: DataSnapshot) => {
      const data = snapshot.val() as SessionData | null;
      callback(data);
    };

    onValue(sessionRef, listener);

    // Return cleanup function
    return () => {
      off(sessionRef, 'value', listener);
      console.log('🔌 [Session] Listener detached');
    };
  }

  /**
   * Abort handshake (Mid-Flight Abort)
   */
  static async abortHandshake(sessionId: string): Promise<void> {
    const sessionRef = ref(database, `sessions/${sessionId}`);
    await update(sessionRef, {
      aliceId: null,
      quantumPayload: null,
      bobBases: null,
      matchingIndexes: null,
      status: 'initializing',
      handshakeComplete: false,
      lastActivity: Date.now(),
    });
    console.log('❌ [Session] Handshake aborted');
  }

  /**
   * Trigger rekeying
   */
  static async startRekeying(
    sessionId: string,
    aliceId: string,
    payload: QuantumPayload
  ): Promise<void> {
    const sessionRef = ref(database, `sessions/${sessionId}`);
    await update(sessionRef, {
      aliceId,
      quantumPayload: payload,
      bobBases: null,
      matchingIndexes: null,
      handshakeComplete: false,
      status: 'rekeying',
      lastActivity: Date.now(),
    });
    console.log('🔄 [Session] Rekeying initiated');
  }

  /**
   * Get session data once
   */
  static async getSession(sessionId: string): Promise<SessionData | null> {
    const sessionRef = ref(database, `sessions/${sessionId}`);
    const snapshot = await get(sessionRef);
    return snapshot.val() as SessionData | null;
  }

  /**
   * Cleanup session on exit (Perfect Forward Secrecy)
   */
  static async cleanupSession(sessionId: string): Promise<void> {
    const sessionRef = ref(database, `sessions/${sessionId}`);
    await update(sessionRef, {
      aliceId: null,
      quantumPayload: null,
      bobBases: null,
      matchingIndexes: null,
      handshakeComplete: false,
      status: 'initializing',
      lastActivity: Date.now(),
    });
    console.log('🔥 [Session] Cleaned up (PFS enforced)');
  }
}

export default SessionService;
