import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { database } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import SessionService from '../services/SessionService';
import './UserDirectory.css';

interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  online?: boolean;
}

function UserDirectory() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOnline, setFilterOnline] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    // Load all users
    const usersRef = ref(database, 'users');
    const unsubUsers = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const usersList: User[] = Object.entries(data)
          .filter(([id]) => id !== currentUser.uid) // Exclude current user
          .map(([id, user]: [string, any]) => ({
            id,
            email: user.email || '',
            displayName: user.displayName || user.email?.split('@')[0] || 'User',
            photoURL: user.photoURL,
            online: user.online || false
          }));
        setUsers(usersList);
      }
      setLoading(false);
    });

    return () => {
      unsubUsers();
    };
  }, [currentUser]);

  const handleStartChat = async (user: User) => {
    if (!currentUser) return;

    try {
      // Check-and-Set logic: Initialize or join session
      const action = await SessionService.initializeSession(currentUser.uid, user.id);
      const sessionId = SessionService.getSessionId(currentUser.uid, user.id);

      if (action === 'created') {
        console.log('🆕 [Lobby] Starting new chat session');
      } else {
        console.log('🔗 [Lobby] Joining existing handshake');
      }

      // Navigate to handshake screen
      navigate(`/handshake/${sessionId}/${user.id}`);
    } catch (error) {
      console.error('🚨 [Lobby] Failed to start chat:', error);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = !filterOnline || user.online;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="user-directory">
      <nav className="directory-nav">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          ← Back
        </button>
        <div className="nav-title">
          <span className="lock-icon">🔐</span>
          Start Secure Chat
        </div>
        <div className="nav-spacer"></div>
      </nav>

      <div className="directory-header">
        <div className="search-filter-container">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input-dir"
            />
          </div>
          <div className="filter-controls">
            <label className="filter-checkbox">
              <input
                type="checkbox"
                checked={filterOnline}
                onChange={(e) => setFilterOnline(e.target.checked)}
              />
              <span>Show Online Only</span>
            </label>
          </div>
        </div>
      </div>

      <main className="directory-main">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="empty-directory">
            <div className="quantum-network">
              <div className="network-node"></div>
              <div className="network-node"></div>
              <div className="network-node"></div>
            </div>
            <h2>No users found</h2>
            <p>Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="users-grid">
            {filteredUsers.map((user) => (
              <div key={user.id} className="user-card">
                <div className="user-card-header">
                  <div className="user-avatar-dir">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName} />
                    ) : (
                      <span>{user.displayName[0].toUpperCase()}</span>
                    )}
                    <div className={`status-indicator ${user.online ? 'online' : 'offline'}`}></div>
                  </div>
                  <div className="user-details">
                    <h3>{user.displayName}</h3>
                    <p className="user-email-dir">{user.email}</p>
                    <div className="user-status">
                      {user.online ? (
                        <span className="status-text online">🟢 Online</span>
                      ) : (
                        <span className="status-text offline">⚪ Offline</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  className="action-btn start-chat"
                  onClick={() => handleStartChat(user)}
                >
                  Start Quantum Chat
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default UserDirectory;
