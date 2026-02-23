# API Documentation

## Quantum Key Service

### `QuantumKeyService`

Handles BB84 quantum key distribution protocol implementation.

#### Methods

##### `generateAndTransmit(sessionId: string)`
Generates quantum states and transmits them to the peer.

**Parameters:**
- `sessionId`: Unique session identifier

**Returns:** `Promise<{ bases: Basis[], bits: Bit[] }>`

**Example:**
```typescript
const { bases, bits } = await QuantumKeyService.generateAndTransmit('session123');
```

##### `deriveFinalKey(aliceBases: Basis[], bobBases: Basis[], aliceBits: Bit[])`
Derives the final encryption key from matching bases.

**Parameters:**
- `aliceBases`: Alice's measurement bases
- `bobBases`: Bob's measurement bases
- `aliceBits`: Alice's measured bits

**Returns:** `string` (256-bit hex key)

---

## Encryption Service

### `EncryptionService`

Provides AES-256-CBC encryption/decryption utilities.

#### Methods

##### `encrypt(plaintext: string, keyHex: string)`
Encrypts plaintext using AES-256.

**Parameters:**
- `plaintext`: Message to encrypt
- `keyHex`: 256-bit hex encryption key

**Returns:** `string` (encrypted ciphertext)

**Example:**
```typescript
const encrypted = EncryptionService.encrypt('Hello World', key);
```

##### `decrypt(ciphertext: string, keyHex: string)`
Decrypts ciphertext.

**Parameters:**
- `ciphertext`: Encrypted message
- `keyHex`: 256-bit hex decryption key

**Returns:** `string | null` (decrypted plaintext or null if failed)

---

## Session Service

### `SessionService`

Manages Firebase session state and lifecycle.

#### Methods

##### `initializeSession(currentUid: string, peerUid: string)`
Creates or joins a session with check-and-set logic.

**Parameters:**
- `currentUid`: Current user's UID
- `peerUid`: Peer user's UID

**Returns:** `Promise<'created' | 'joined'>`

**Example:**
```typescript
const result = await SessionService.initializeSession(myUid, peerUid);
if (result === 'created') {
  console.log('Session created, I am Alice');
}
```

##### `uploadQuantumPayload(sessionId: string, bases: Basis[], bits: Bit[])`
Uploads Alice's quantum transmission data.

**Parameters:**
- `sessionId`: Session identifier
- `bases`: Alice's random bases
- `bits`: Alice's random bits

**Returns:** `Promise<void>`

##### `uploadBobBases(sessionId: string, bases: Basis[])`
Uploads Bob's measurement bases.

**Parameters:**
- `sessionId`: Session identifier
- `bases`: Bob's random bases

**Returns:** `Promise<void>`

##### `uploadMatchingIndexes(sessionId: string, indexes: number[])`
Uploads indices where bases matched.

**Parameters:**
- `sessionId`: Session identifier
- `indexes`: Array of matching indices

**Returns:** `Promise<void>`

##### `listenToSession(sessionId: string, callback: (data: SessionData | null) => void)`
Real-time listener for session updates.

**Parameters:**
- `sessionId`: Session identifier
- `callback`: Function called on data changes

**Returns:** `() => void` (cleanup function)

**Example:**
```typescript
const unsubscribe = SessionService.listenToSession(sessionId, (data) => {
  console.log('Session updated:', data);
});

// Later, cleanup:
unsubscribe();
```

##### `sendMessage(sessionId: string, message: Message)`
Sends encrypted message to session.

**Parameters:**
- `sessionId`: Session identifier
- `message`: Message object with encrypted text

**Returns:** `Promise<void>`

##### `startRekeying(sessionId: string)`
Initiates background rekeying process.

**Parameters:**
- `sessionId`: Session identifier

**Returns:** `Promise<void>`

##### `abortHandshake(sessionId: string)`
Aborts current handshake session.

**Parameters:**
- `sessionId`: Session identifier

**Returns:** `Promise<void>`

##### `cleanupSession(sessionId: string)`
Performs Perfect Forward Secrecy cleanup.

**Parameters:**
- `sessionId`: Session identifier

**Returns:** `Promise<void>`

---

## Local Storage Service

### `LocalStorageService`

Manages IndexedDB for local message caching.

#### Methods

##### `cacheMessage(sessionId: string, message: CachedMessage)`
Stores decrypted message in IndexedDB.

**Parameters:**
- `sessionId`: Session identifier
- `message`: Decrypted message with metadata

**Returns:** `Promise<void>`

##### `getCachedMessages(sessionId: string)`
Retrieves all cached messages for a session.

**Parameters:**
- `sessionId`: Session identifier

**Returns:** `Promise<CachedMessage[]>`

##### `storeSessionKey(sessionId: string, key: string)`
Stores session encryption key.

**Parameters:**
- `sessionId`: Session identifier
- `key`: Hex encryption key

**Returns:** `Promise<void>`

##### `getSessionKey(sessionId: string)`
Retrieves session encryption key.

**Parameters:**
- `sessionId`: Session identifier

**Returns:** `Promise<string | null>`

##### `deleteSessionKey(sessionId: string)`
Deletes session key (Perfect Forward Secrecy).

**Parameters:**
- `sessionId`: Session identifier

**Returns:** `Promise<void>`

---

## Type Definitions

### SessionData
```typescript
interface SessionData {
  status: SessionStatus;
  handshakeComplete: boolean;
  aliceId: string | null;
  quantumPayload: { bases: Basis[], bits: Bit[] } | null;
  bobBases: Basis[] | null;
  matchingIndexes: number[] | null;
  messages: { [messageId: string]: Message };
  createdAt: number;
  lastActivity: number;
}
```

### Message
```typescript
interface Message {
  id: string;
  text: string;        // encrypted
  timestamp: number;
  senderId: string;
  senderName: string;
}
```

### CachedMessage
```typescript
interface CachedMessage {
  id: string;
  text: string;        // decrypted
  timestamp: number;
  senderId: string;
  senderName: string;
  decryptedAt: number;
}
```

### Basis & Bit
```typescript
type Basis = '+' | 'x';  // Rectilinear or Diagonal
type Bit = 0 | 1;
```

---

## Error Handling

All service methods throw errors that should be caught:

```typescript
try {
  await SessionService.sendMessage(sessionId, message);
} catch (error) {
  console.error('Failed to send message:', error);
  // Handle error appropriately
}
```

---

## Firebase Security Rules

Ensure your Firebase Realtime Database has proper security rules:

```json
{
  "rules": {
    "sessions": {
      "$sessionId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "users": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth.uid == $uid"
      }
    }
  }
}
```
