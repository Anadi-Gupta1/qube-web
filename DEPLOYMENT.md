# 🚀 Deployment Guide

## ✅ What's Ready:
- ✅ Frontend service configured
- ✅ Backend API endpoint created
- ✅ Vercel configuration updated

## 📦 Deploy Steps:

### 1. Install Vercel CLI (if not installed)
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy to Vercel
```bash
cd qube-web
vercel --prod
```

### 4. Update Frontend URL
After deployment, Vercel will give you a URL like:
```
https://your-project-name.vercel.app
```

Update line 14 in `src/services/QuantumKeyService.ts`:
```typescript
const VERCEL_API_BASE = "https://your-project-name.vercel.app/api";
```

### 5. Redeploy
```bash
vercel --prod
```

## 🧪 Test the API:
```bash
curl -X POST https://your-project-name.vercel.app/api/quantum_channel \
  -H "Content-Type: application/json" \
  -d '{
    "bits": [0,1,0,1],
    "bases": ["X","+","X","+"],
    "eavesdropperActive": false
  }'
```

Expected response:
```json
{
  "received_states": [-1, 1, -1, 1],
  "bob_bases": ["X", "+", "X", "+"]
}
```

## 📊 How to Use in Your App:

```typescript
import { QuantumKeyService } from './services/QuantumKeyService';

// Generate quantum key
const result = await QuantumKeyService.generateAndTransmit(256, false);

if (result.success) {
  // Derive final key using Bob's bases
  const finalKey = QuantumKeyService.deriveFinalKey(
    result.aliceBits,
    result.aliceBases,
    result.bobBases
  );
  
  // Convert to hex for encryption
  const hexKey = QuantumKeyService.formatToHex(finalKey);
  console.log("256-bit AES Key:", hexKey);
}
```

## 🔍 Troubleshooting:

**404 Error:** Backend not deployed
- Run `vercel --prod` again
- Check `api/quantum_channel.py` exists

**CORS Error:** Missing headers
- Already configured in the backend
- Clear browser cache

**Connection refused:** Wrong URL
- Verify `VERCEL_API_BASE` matches your deployment URL
