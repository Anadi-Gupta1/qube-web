import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, onValue, set, push } from 'firebase/database';
import { database } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import './UserDirectory.css';

interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  online?: boolean;
}

interface UserSession {
  sessionId: string;
  isSecured: boolean;
  handshakeComplete: boolean;
}

function UserDirectory() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [sessions, setSessions] = useState<Map<string, UserSession>>(new Map());
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

    // Load current user's sessions
    const sessionsRef = ref(database, `users/${currentUser.uid}/sessions`);
    const unsubSessions = onValue(sessionsRef, (snapshot) => {
      const data = snapshot.val();
      const sessionMap = new Map<string, UserSession>();
      if (data) {
        Object.entries(data).forEach(([sessionId, session]: [string, any]) => {
          sessionMap.set(session.otherUserId, {
            sessionId,
            isSecured: session.isSecured || false,
            handshakeComplete: session.handshakeComplete || false
          });
        });
      }
      setSessions(sessionMap);
    });

    return () => {
      unsubUsers();
      unsubSessions();
    };
  }, [currentUser]);

  const handleStartChat = async (user: User) => {
    if (!currentUser) return;

    const existingSession = sessions.get(user.id);
    
    if (existingSession) {
      // Session exists, navigate directly to chat
      navigate(`/chat/${existingSession.sessionId}`);
      return;
    }

    // Create new session
    try {
      const newSessionRef = push(ref(database, 'sessions'));
      const sessionId = newSessionRef.key!;

      const sessionData = {
        participants: {
          [currentUser.uid]: true,
          [user.id]: true
        },
        createdAt: Date.now(),
        isSecured: false,
        handshakeComplete: true
      };

      await set(newSessionRef, sessionData);

      // Add to current user's sessions
      await set(ref(database, `users/${currentUser.uid}/sessions/${sessionId}`), {
        otherUserId: user.id,
        userName: user.displayName,
        userEmail: user.email,
        timestamp: Date.now(),
        isSecured: false,
        handshakeComplete: true
      });

      // Add to other user's sessions
      await set(ref(database, `users/${user.id}/sessions/${sessionId}`), {
        otherUserId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
        userEmail: currentUser.email || '',
        timestamp: Date.now(),
        isSecured: false,
        handshakeComplete: true
      });

      navigate(`/chat/${sessionId}`);
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const getButtonText = (user: User) => {
    const session = sessions.get(user.id);
    if (!session) return 'Start Quantum Chat';
    if (session.isSecured) return 'Open Secure Chat';
    return 'Open Chat';
  };

  const getButtonClass = (user: User) => {
    const session = sessions.get(user.id);
    if (!session) return 'start-chat';
    if (session.isSecured) return 'secure';
    return 'open';
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
                  className={`action-btn ${getButtonClass(user)}`}
                  onClick={() => handleStartChat(user)}
                >
                  {getButtonText(user)}
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
