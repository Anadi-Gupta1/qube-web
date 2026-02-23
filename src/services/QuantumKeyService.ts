/**
 * Bit type for quantum measurements
 */
export type Bit = 0 | 1;

/**
 * Basis type for BB84 protocol
 * 
 * @remarks
 * X = Diagonal basis (45°/135°)
 * + = Rectilinear basis (0°/90°)
 */
export type Basis = 'X' | '+';

/**
 * Response from quantum channel simulation
 */
export interface QuantumExchangeResponse {
  success: boolean;
  aliceBits: Bit[];
  aliceBases: Basis[];
  bobBits: Bit[];
  bobBases: Basis[];
}

// 1. Check carefully: Does your Vercel URL end with /api? 
// 2. Make sure there is NO trailing slash here.

const VERCEL_API_BASE = "https://qubesapi.vercel.app/api";

/**
 * QuantumKeyService
 * 
 * Implements BB84 Quantum Key Distribution protocol
 * 
 * @remarks
 * Handles photon transmission, basis reconciliation, and key derivation
 * Communicates with Vercel backend for quantum channel simulation
 */
export const QuantumKeyService = {

  generateAndTransmit: async (length: number = 256, eveActive: boolean = false): Promise<QuantumExchangeResponse> => {
    const fullUrl = `${VERCEL_API_BASE}/quantum_channel`;
    
    try {
      const aliceBits: Bit[] = Array.from({ length }, () => (Math.random() > 0.5 ? 1 : 0));
      const aliceBases: Basis[] = Array.from({ length }, () => (Math.random() > 0.5 ? 'X' : '+'));

      // --- DEBUG LOGS START ---
      console.log("🚀 [QuantumLink] Attempting Connection...");
      console.log("🔗 URL:", fullUrl);
      console.log("📦 Payload Sample (First 5 bits):", aliceBits.slice(0, 5));
      // --- DEBUG LOGS END ---

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bits: aliceBits,
          bases: aliceBases,
          eavesdropperActive: eveActive // Match the Python Pydantic model!
        }),
      });

      // --- RESPONSE LOGS START ---
      console.log("📡 [QuantumLink] Server Status:", response.status);
      
      if (!response.ok) {
        // This will print if it's 404, 500, etc.
        const errorBody = await response.text();
        console.error("❌ [QuantumLink] Error Body:", errorBody);
        throw new Error(`Quantum Channel failed: ${response.status}`);
      }
      // --- RESPONSE LOGS END ---

      const data = await response.json();
      console.log("✅ [QuantumLink] Photons Received Successfully");

      // Simulate Bob's measurement bases (random, as in real BB84)
      const bobBases: Basis[] = Array.from({ length }, () => (Math.random() > 0.5 ? 'X' : '+'));
      
      // Bob only gets correct bits when bases match
      const bobBits: Bit[] = data.received_states.map((bit: number, i: number) => {
        // If bases match, Bob gets Alice's bit; otherwise random
        return aliceBases[i] === bobBases[i] ? bit : (Math.random() > 0.5 ? 1 : 0);
      });

      console.log("🎲 [Bob] Generated random measurement bases");

      return {
        success: true,
        aliceBits,
        aliceBases,
        bobBits,
        bobBases
      };
    } catch (error: any) {
      console.error("🚨 [QuantumLink] CRITICAL FAILURE:", error.message);
      return { success: false, aliceBits: [], aliceBases: [], bobBits: [], bobBases: [] };
    }
  },

  deriveFinalKey: (bits: Bit[], myBases: Basis[], theirBases: Basis[]): Bit[] => {
    const siftedKey: Bit[] = [];
    for (let i = 0; i < myBases.length; i++) {
      if (myBases[i] === theirBases[i]) {
        siftedKey.push(bits[i]);
      }
    }
    console.log(`🔑 [Sifting] Key Derived. Original: ${bits.length} bits -> Sifted: ${siftedKey.length} bits`);
    return siftedKey;
  },

  formatToHex: (rawBits: Bit[]): string => {
    let targetBits = [...rawBits];
    if (targetBits.length > 256) targetBits = targetBits.slice(0, 256);
    while (targetBits.length < 256) targetBits.push(0); 

    let hexString = '';
    for (let i = 0; i < targetBits.length; i += 4) {
      const chunk = targetBits.slice(i, i + 4).join('');
      const hexChar = parseInt(chunk, 2).toString(16);
      hexString += hexChar;
    }
    return hexString;
  }
};
