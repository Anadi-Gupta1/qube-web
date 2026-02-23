# Changelog

All notable changes to the Quantum Key Distribution E2EE Chat project will be documented in this file.

## [1.1.0] - 2026-02-23

### Added
- Session migration system for backward compatibility
- Real-time message synchronization with IndexedDB
- Comprehensive debug logging across all components
- Session data persistence improvements

### Fixed
- Fire Photons button disabled state issue
- Real-time message display in chat component
- Session key loading race condition
- UserDirectory syntax errors from refactoring

### Changed
- Enhanced SessionService with automatic migration
- Improved message merge strategy in Chat component
- Updated Handshake component with better debug visibility

## [1.0.0] - 2026-02-22

### Added
- Complete BB84 quantum key distribution protocol
- End-to-end encrypted chat with AES-256
- Local-first message architecture with IndexedDB
- Perfect Forward Secrecy implementation
- Background rekeying mechanism
- Firebase Realtime Database integration
- User authentication with Firebase Auth
- Responsive UI with Framer Motion animations
