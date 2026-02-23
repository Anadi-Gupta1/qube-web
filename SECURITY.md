# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.1.x   | :white_check_mark: |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Security Features

### Quantum Key Distribution (BB84)
- Photon polarization-based key exchange
- Basis reconciliation and error checking
- Post-quantum cryptography ready

### Encryption
- AES-256-CBC encryption for all messages
- Quantum-derived encryption keys
- Perfect Forward Secrecy (PFS)
- Automatic key rotation

### Data Storage
- Local-first architecture with IndexedDB
- Encrypted messages in Firebase (transport only)
- Automatic key deletion on session end
- No plaintext message persistence in cloud

### Authentication
- Firebase Authentication integration
- Secure session management
- User isolation per session

## Reporting a Vulnerability

If you discover a security vulnerability, please email:
- **Email**: security@qubesecure.local
- **Response Time**: Within 48 hours
- **Disclosure**: Responsible disclosure policy

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if available)

## Security Best Practices

### For Developers
1. Never commit Firebase credentials
2. Use environment variables for sensitive data
3. Regularly update dependencies
4. Follow secure coding practices
5. Implement proper error handling

### For Users
1. Use strong passwords
2. Enable two-factor authentication (if available)
3. Don't share encryption keys
4. Verify handshake completion before sending sensitive data
5. Log out after use

## Known Limitations

- Requires HTTPS in production
- Session keys stored in IndexedDB (browser-based)
- Quantum simulation (not real quantum hardware)
- Relies on Firebase security rules

## Cryptographic Dependencies

- **CryptoJS**: AES-256 encryption
- **Firebase**: Secure transport layer
- **Web Crypto API**: Random number generation
- **Custom BB84**: Quantum key distribution protocol

## Audit History

- **v1.0.0**: Initial security review (Feb 2026)
- **v1.1.0**: Session migration security audit (Feb 2026)
