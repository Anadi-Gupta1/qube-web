import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SessionService, { SessionData } from '../services/SessionService';
import { QuantumKeyService, Basis, Bit } from '../services/QuantumKeyService';
import EncryptionService from '../services/EncryptionService';
import LocalStorageService from '../services/LocalStorageService';
import { motion, AnimatePresence } from 'framer-motion';
import './Handshake.css';

type Role = 'neutral' | 'alice' | 'bob';

function Handshake() {
  const navigate = useNavigate();
  const { sessionId, peerUserId } = useParams<{ sessionId: string; peerUserId: string }>();
  const { currentUser } = useAuth();
  
  const [role, setRole] = useState<Role>('neutral');
  const [status, setStatus] = useState('waiting');
  const [progress, setProgress] = useState(0);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [key, setKey] = useState<string | null>(null);
  
  const cleanupRef = useRef<(() => void) | null>(null);
  const roleLockedRef = useRef(false);

  useEffect(() => {
    if (!currentUser || !sessionId) return;

    // Listen to session changes
    const unsubscribe = SessionService.listenToSession(sessionId, async (data) => {
      if (!data) {
        console.log('⚠️ [Handshake] No session data received');
        return;
      }
      
      console.log('📊 [Handshake] Session data:', { 
        status: data.status, 
        aliceId: data.aliceId, 
        handshakeComplete: data.handshakeComplete 
      });
      
      setSessionData(data);

      // Mid-Flight Abort Detection
      if (data.aliceId === null && data.status === 'initializing' && roleLockedRef.current) {
        console.log('❌ [Handshake] Peer aborted, ejecting to lobby');
        alert('The other user has aborted the handshake.');
        await cleanup();
        navigate('/users');
        return;
      }

      // Role Assignment Logic
      if (!roleLockedRef.current) {
        if (data.aliceId && data.aliceId === currentUser.uid) {
          setRole('alice');
          roleLockedRef.current = true;
          setStatus('transmitting');
        } else if (data.aliceId && data.aliceId !== currentUser.uid) {
          setRole('bob');
          roleLockedRef.current = true;
          setStatus('measuring');
          
          // Auto-generate Bob's bases
          if (!data.bobBases && data.quantumPayload) {
            await handleBobMeasurement(data);
          }
        }
      }

      // Alice detects Bob's bases -> Perform sifting
      if (role === 'alice' && data.bobBases && !data.matchingIndexes) {
        await handleAliceSifting(data);
      }

      // Both users: Handshake complete -> Navigate to chat
      if (data.handshakeComplete && data.matchingIndexes) {
        await deriveKey(data);
      }
    });

    cleanupRef.current = unsubscribe;

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [currentUser, sessionId, role]);

  const handleFirePhotons = async () => {
    if (!currentUser || !sessionId || roleLockedRef.current) return;

    setRole('alice');
    roleLockedRef.current = true;
    setStatus('transmitting');
    setProgress(20);

    try {
      // Generate quantum payload
      const result = await QuantumKeyService.generateAndTransmit(256, false);
      
      if (!result.success) {
        throw new Error('Quantum transmission failed');
      }

      setProgress(50);

      // Upload to Firebase
      await SessionService.uploadQuantumPayload(sessionId, currentUser.uid, {
        bits: result.aliceBits,
        bases: result.aliceBases,
      });

      setProgress(70);
      setStatus('waiting_for_bob');
      console.log('📤 [Alice] Photons fired!');
    } catch (error) {
      console.error('🚨 [Handshake] Fire failed:', error);
      alert('Failed to transmit quantum data. Please try again.');
      await cleanup();
      navigate('/users');
    }
  };

  const handleBobMeasurement = async (data: SessionData) => {
    if (!sessionId || !data.quantumPayload) return;

    setStatus('generating_bases');
    setProgress(30);

    try {
      // Generate random measurement bases
      const length = data.quantumPayload.bits.length;
      const bobBases: Basis[] = Array.from({ length }, () => 
        Math.random() > 0.5 ? 'X' : '+'
      );

      setProgress(60);

      // Upload bases to Firebase
      await SessionService.uploadBobBases(sessionId, bobBases);

      setProgress(80);
      setStatus('waiting_for_sift');
      console.log('📤 [Bob] Measurement bases uploaded');
    } catch (error) {
      console.error('🚨 [Handshake] Bob measurement failed:', error);
    }
  };

  const handleAliceSifting = async (data: SessionData) => {
    if (!sessionId || !data.quantumPayload || !data.bobBases) return;

    setStatus('sifting');
    setProgress(85);

    try {
      const aliceBases = data.quantumPayload.bases;
      const bobBases = data.bobBases;

      // Find matching indexes
      const matchingIndexes: number[] = [];
      for (let i = 0; i < aliceBases.length; i++) {
        if (aliceBases[i] === bobBases[i]) {
          matchingIndexes.push(i);
        }
      }

      console.log(`🔑 [Alice] Sifted ${matchingIndexes.length} matching bits`);

      setProgress(95);

      // Upload matching indexes
      await SessionService.uploadMatchingIndexes(sessionId, matchingIndexes);

      setStatus('complete');
      setProgress(100);
    } catch (error) {
      console.error('🚨 [Handshake] Sifting failed:', error);
    }
  };

  const deriveKey = async (data: SessionData) => {
    if (!data.quantumPayload || !data.matchingIndexes) return;

    const siftedBits: Bit[] = data.matchingIndexes.map(i => data.quantumPayload!.bits[i]);
    const keyHex = EncryptionService.bitsToHex(siftedBits);

    setKey(keyHex);
    setProgress(100);
    setStatus('secure');

    // Store key in local storage
    await LocalStorageService.storeSessionKey(sessionId!, keyHex);

    console.log('✅ [Handshake] Key derived and stored');

    // Navigate to chat after 1 second
    setTimeout(() => {
      navigate(`/chat/${sessionId}/${peerUserId}`);
    }, 1000);
  };

  const handleAbort = async () => {
    if (!sessionId) return;

    try {
      await SessionService.abortHandshake(sessionId);
      await cleanup();
      navigate('/users');
    } catch (error) {
      console.error('🚨 [Handshake] Abort failed:', error);
    }
  };

  const cleanup = async () => {
    roleLockedRef.current = false;
    setRole('neutral');
    setStatus('waiting');
    setProgress(0);
    if (cleanupRef.current) {
      cleanupRef.current();
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'waiting':
        return 'Waiting for quantum exchange to begin...';
      case 'transmitting':
        return 'Transmitting photons through quantum channel...';
      case 'waiting_for_bob':
        return 'Waiting for Bob to measure photons...';
      case 'measuring':
        return 'Measuring photons with random bases...';
      case 'generating_bases':
        return 'Generating measurement bases...';
      case 'waiting_for_sift':
        return 'Waiting for Alice to sift keys...';
      case 'sifting':
        return 'Comparing bases and sifting key...';
      case 'secure':
        return 'Quantum key established! Entering secure chat...';
      default:
        return 'Initializing...';
    }
  };

  return (
    <div className="handshake-container">
      <div className="handshake-card">
        <div className="handshake-header">
          <h1>🔐 Quantum Key Exchange</h1>
          <p className="protocol-name">BB84 Protocol</p>
        </div>

        <div className="role-indicator">
          <AnimatePresence mode="wait">
            {role === 'neutral' ? (
              <motion.div
                key="neutral"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="neutral-state"
              >
                <div className="quantum-particles">
                  <div className="particle"></div>
                  <div className="particle"></div>
                  <div className="particle"></div>
                </div>
                <p>Ready to establish quantum link</p>
              </motion.div>
            ) : (
              <motion.div
                key={role}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`role-badge ${role}`}
              >
                <span className="role-icon">{role === 'alice' ? '📡' : '📶'}</span>
                <span className="role-name">Role: {role === 'alice' ? 'Alice (Sender)' : 'Bob (Receiver)'}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="progress-section">
          <div className="progress-bar-container">
            <motion.div
              className="progress-bar-fill"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <p className="progress-text">{progress}%</p>
        </div>

        <div className="status-message">
          <motion.p
            key={status}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {getStatusMessage()}
          </motion.p>
        </div>

        {key && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="key-display"
          >
            <p className="key-label">256-bit AES Key Generated:</p>
            <code className="key-value">{key.substring(0, 32)}...</code>
          </motion.div>
        )}

        <div className="handshake-actions">
          {role === 'neutral' && (
            <>
              <button
                className="fire-btn"
                onClick={() => {
                  console.log('🔘 [Fire Button] Clicked!', { 
                    sessionData, 
                    aliceId: sessionData?.aliceId,
                    disabled: !sessionData || (sessionData.aliceId !== null && sessionData.aliceId !== undefined)
                  });
                  handleFirePhotons();
                }}
                disabled={!sessionData || (sessionData.aliceId !== null && sessionData.aliceId !== undefined)}
              >
                🚀 Fire Photons
              </button>
              <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
                Debug: sessionData={sessionData ? 'loaded' : 'null'}, 
                aliceId={sessionData?.aliceId === undefined ? 'undefined' : sessionData?.aliceId || 'null'}, 
                status={sessionData?.status || 'unknown'}
              </div>
            </>
          )}

          <button
            className="abort-btn"
            onClick={handleAbort}
            disabled={status === 'secure'}
          >
            ❌ Abort
          </button>
        </div>

        <div className="handshake-info">
          <div className="info-item">
            <span className="info-label">Session ID:</span>
            <span className="info-value">{sessionId?.substring(0, 12)}...</span>
          </div>
          <div className="info-item">
            <span className="info-label">Status:</span>
            <span className="info-value">{sessionData?.status || 'initializing'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Handshake;
