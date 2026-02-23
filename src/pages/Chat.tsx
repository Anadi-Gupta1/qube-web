import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SessionService, { SessionData, Message } from '../services/SessionService';
import LocalStorageService, { CachedMessage } from '../services/LocalStorageService';
import EncryptionService from '../services/EncryptionService';
import { QuantumKeyService, Basis } from '../services/QuantumKeyService';
import { motion, AnimatePresence } from 'framer-motion';
import './Chat.css';

interface MergedMessage {
  id: string;
  text: string; // decrypted
  timestamp: number;
  senderId: string;
  senderName: string;
  isDecrypted: boolean;
}

function Chat() {
  const { sessionId, peerUserId } = useParams<{ sessionId: string; peerUserId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [messages, setMessages] = useState<MergedMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [isRekeying, setIsRekeying] = useState(false);
  const [rekeyProgress, setRekeyProgress] = useState(0);
  const [peerDisconnected, setPeerDisconnected] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const roleRef = useRef<'alice' | 'bob' | null>(null);

  useEffect(() => {
    if (!currentUser || !sessionId) return;

    loadInitialData();

    // Listen to session changes
    const unsubscribe = SessionService.listenToSession(sessionId, async (data) => {
      if (!data) return;

      // Peer Disconnect Detection
      if (data.status === 'initializing' && data.handshakeComplete === false) {
        console.log('🔌 [Chat] Peer disconnected');
        setPeerDisconnected(true);
        setTimeout(() => {
          navigate('/users');
        }, 3000);
        return;
      }

      // Background Rekeying Logic
      if (data.status === 'rekeying') {
        handleBackgroundRekeying(data);
      }

      // New key established after rekey
      if (data.handshakeComplete && data.matchingIndexes && isRekeying) {
        await deriveNewKey(data);
      }

      // Merge messages
      await mergeMessages(data);
    });

    cleanupRef.current = unsubscribe;

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [currentUser, sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadInitialData = async () => {
    if (!sessionId) return;

    // Load session key from local storage
    const key = await LocalStorageService.getSessionKey(sessionId);
    setSessionKey(key);

    // Load cached messages
    const cachedMessages = await LocalStorageService.getCachedMessages(sessionId);
    const merged: MergedMessage[] = cachedMessages.map(msg => ({
      id: msg.id,
      text: msg.text,
      timestamp: msg.timestamp,
      senderId: msg.senderId,
      senderName: msg.senderName,
      isDecrypted: true,
    }));
    setMessages(merged);
  };

  const mergeMessages = async (sessionData: SessionData) => {
    if (!sessionId || !sessionKey) return;

    const firebaseMessages = sessionData.messages || {};
    const cachedMessages = await LocalStorageService.getCachedMessages(sessionId);

    // Create unique set of message IDs
    const allMessageIds = new Set<string>([
      ...Object.keys(firebaseMessages),
      ...cachedMessages.map(m => m.id),
    ]);

    const merged: MergedMessage[] = [];

    for (const id of allMessageIds) {
      // Check if already cached
      const cached = cachedMessages.find(m => m.id === id);
      if (cached) {
        merged.push({
          id: cached.id,
          text: cached.text,
          timestamp: cached.timestamp,
          senderId: cached.senderId,
          senderName: cached.senderName,
          isDecrypted: true,
        });
        continue;
      }

      // Try to decrypt from Firebase
      const firebaseMsg = firebaseMessages[id];
      if (firebaseMsg) {
        const decrypted = EncryptionService.decrypt(firebaseMsg.text, sessionKey);
        
        if (decrypted) {
          // Successfully decrypted, cache it
          const cachedMsg: CachedMessage = {
            id,
            text: decrypted,
            timestamp: firebaseMsg.timestamp,
            senderId: firebaseMsg.senderId,
            senderName: firebaseMsg.senderName,
            decryptedAt: Date.now(),
          };
          await LocalStorageService.cacheMessage(sessionId, cachedMsg);

          merged.push({
            id,
            text: decrypted,
            timestamp: firebaseMsg.timestamp,
            senderId: firebaseMsg.senderId,
            senderName: firebaseMsg.senderName,
            isDecrypted: true,
          });
        } else {
          // Decryption failed (wrong key)
          merged.push({
            id,
            text: '[Encrypted - Key Required]',
            timestamp: firebaseMsg.timestamp,
            senderId: firebaseMsg.senderId,
            senderName: firebaseMsg.senderName,
            isDecrypted: false,
          });
        }
      }
    }

    merged.sort((a, b) => a.timestamp - b.timestamp);
    setMessages(merged);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !sessionId || !sessionKey) return;

    try {
      const plaintext = newMessage.trim();
      const encrypted = EncryptionService.encrypt(plaintext, sessionKey);

      const message: Message = {
        id: `${Date.now()}_${currentUser.uid}`,
        text: encrypted,
        timestamp: Date.now(),
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
      };

      await SessionService.sendMessage(sessionId, message);

      // Cache our own message
      const cachedMsg: CachedMessage = {
        id: message.id,
        text: plaintext,
        timestamp: message.timestamp,
        senderId: message.senderId,
        senderName: message.senderName,
        decryptedAt: Date.now(),
      };
      await LocalStorageService.cacheMessage(sessionId, cachedMsg);

      setNewMessage('');
      console.log('💬 [Chat] Message sent and cached');
    } catch (error) {
      console.error('🚨 [Chat] Failed to send message:', error);
    }
  };

  const handleBackgroundRekeying = async (data: SessionData) => {
    if (!currentUser || !sessionId) return;

    setIsRekeying(true);
    setRekeyProgress(10);

    // Check if we are Bob (auto-responder)
    if (data.aliceId && data.aliceId !== currentUser.uid && !data.bobBases) {
      roleRef.current = 'bob';
      setRekeyProgress(30);

      // Auto-generate Bob's bases
      const length = data.quantumPayload?.bits.length || 256;
      const bobBases: Basis[] = Array.from({ length }, () => 
        Math.random() > 0.5 ? 'X' : '+'
      );

      setRekeyProgress(60);

      await SessionService.uploadBobBases(sessionId, bobBases);

      setRekeyProgress(80);
      console.log('🔄 [Bob] Auto-responded to rekey');
    } else if (data.aliceId && data.aliceId === currentUser.uid) {
      roleRef.current = 'alice';
      setRekeyProgress(50);

      // Alice: wait for Bob's bases, then sift
      if (data.bobBases && !data.matchingIndexes) {
        await performAliceSifting(data);
      }
    }
  };

  const performAliceSifting = async (data: SessionData) => {
    if (!sessionId || !data.quantumPayload || !data.bobBases) return;

    setRekeyProgress(85);

    const aliceBases = data.quantumPayload.bases;
    const bobBases = data.bobBases;

    const matchingIndexes: number[] = [];
    for (let i = 0; i < aliceBases.length; i++) {
      if (aliceBases[i] === bobBases[i]) {
        matchingIndexes.push(i);
      }
    }

    setRekeyProgress(95);

    await SessionService.uploadMatchingIndexes(sessionId, matchingIndexes);

    console.log('🔑 [Alice] Rekey sifting complete');
  };

  const deriveNewKey = async (data: SessionData) => {
    if (!sessionId || !data.quantumPayload || !data.matchingIndexes) return;

    const siftedBits = data.matchingIndexes.map(i => data.quantumPayload!.bits[i]);
    const keyHex = EncryptionService.bitsToHex(siftedBits);

    setSessionKey(keyHex);
    await LocalStorageService.storeSessionKey(sessionId, keyHex);

    setRekeyProgress(100);
    setIsRekeying(false);

    console.log('✅ [Chat] New key established');

    // Re-merge messages with new key
    await mergeMessages(data);
  };

  const handleRekey = async () => {
    if (!currentUser || !sessionId || isRekeying) return;

    setIsRekeying(true);
    setRekeyProgress(10);

    try {
      const result = await QuantumKeyService.generateAndTransmit(256, false);
      
      if (!result.success) {
        throw new Error('Quantum transmission failed');
      }

      setRekeyProgress(40);

      await SessionService.startRekeying(sessionId, currentUser.uid, {
        bits: result.aliceBits,
        bases: result.aliceBases,
      });

      setRekeyProgress(60);
      console.log('🔄 [Chat] Rekeying initiated');
    } catch (error) {
      console.error('🚨 [Chat] Rekey failed:', error);
      setIsRekeying(false);
      setRekeyProgress(0);
    }
  };

  const handleLeaveChat = async () => {
    if (!sessionId) return;

    // Cleanup session (Perfect Forward Secrecy)
    await SessionService.cleanupSession(sessionId);
    await LocalStorageService.deleteSessionKey(sessionId);

    console.log('🔥 [Chat] Session burned, key destroyed');

    navigate('/users');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (peerDisconnected) {
    return (
      <div className="chat-container">
        <div className="disconnect-overlay">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="disconnect-card"
          >
            <h2>🔌 Peer Disconnected</h2>
            <p>The other user has left the chat.</p>
            <p>Redirecting to lobby...</p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      {/* Rekeying Overlay */}
      <AnimatePresence>
        {isRekeying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rekey-overlay"
          >
            <div className="rekey-card">
              <h3>🔄 Negotiating New Key</h3>
              <div className="progress-bar-container">
                <motion.div
                  className="progress-bar-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${rekeyProgress}%` }}
                />
              </div>
              <p>{rekeyProgress}%</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Header */}
      <div className="chat-header">
        <button className="back-btn" onClick={handleLeaveChat}>
          ← Leave
        </button>
        <div className="chat-title">
          <span className="lock-icon">🔐</span>
          <span>Quantum Secure Chat</span>
        </div>
        <button className="rekey-btn" onClick={handleRekey} disabled={isRekeying}>
          🔑 Rekey
        </button>
      </div>

      {/* Messages Area */}
      <div className="messages-container">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`message ${msg.senderId === currentUser?.uid ? 'sent' : 'received'}`}
          >
            <div className="message-header">
              <span className="sender-name">{msg.senderName}</span>
              <span className="message-time">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div className={`message-content ${!msg.isDecrypted ? 'encrypted' : ''}`}>
              {msg.text}
            </div>
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form className="message-input-container" onSubmit={handleSendMessage}>
        <input
          type="text"
          className="message-input"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          disabled={!sessionKey || isRekeying}
        />
        <button
          type="submit"
          className="send-btn"
          disabled={!newMessage.trim() || !sessionKey || isRekeying}
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default Chat;
