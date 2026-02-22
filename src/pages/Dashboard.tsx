import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, database } from '../firebase/config';
import { ref, onValue } from 'firebase/database';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

interface Session {
  id: string;
  userName: string;
  userEmail: string;
  lastMessage: string;
  timestamp: number;
  isSecured: boolean;
  qber?: number;
  avatar?: string;
}

function Dashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    const sessionsRef = ref(database, `users/${currentUser.uid}/sessions`);
    const unsubscribe = onValue(sessionsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const sessionsList: Session[] = Object.entries(data).map(([id, session]: [string, any]) => ({
          id,
          userName: session.userName || 'Unknown User',
          userEmail: session.userEmail || '',
          lastMessage: session.lastMessage || 'No messages yet',
          timestamp: session.timestamp || Date.now(),
          isSecured: session.isSecured || false,
          qber: session.qber,
          avatar: session.avatar
        }));
        setSessions(sessionsList);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const filteredSessions = sessions.filter(session =>
    session.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.userEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSecurityBadge = (session: Session) => {
    if (session.isSecured) {
      return (
        <div className="security-badge secured">
          <span className="badge-icon">🔒</span>
          <span>Quantum Secured</span>
          {session.qber !== undefined && <span className="qber">QBER: {session.qber}%</span>}
        </div>
      );
    }
    return (
      <div className="security-badge not-secured">
        <span className="badge-icon">⚠</span>
        <span>Not Secured</span>
      </div>
    );
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="dashboard">
      <nav className="dashboard-nav">
        <div className="nav-left">
          <div className="app-logo">
            <div className="quantum-icon">⬡</div>
            <span>QUBES</span>
          </div>
          <div className="search-container">
            <input
              type="text"
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
        <div className="nav-right">
          <button className="new-chat-btn" onClick={() => navigate('/users')}>
            <span className="plus-icon">+</span>
            New Chat
          </button>
          <button className="icon-btn" onClick={() => navigate('/settings')}>
            ⚙️
          </button>
          <div className="user-profile" onClick={() => setShowUserMenu(!showUserMenu)}>
            <div className="user-avatar">
              {currentUser?.photoURL ? (
                <img src={currentUser.photoURL} alt="Profile" />
              ) : (
                <span>{currentUser?.email?.[0].toUpperCase()}</span>
              )}
            </div>
            {showUserMenu && (
              <div className="user-menu">
                <div className="user-info">
                  <p className="user-name">{currentUser?.displayName || 'User'}</p>
                  <p className="user-email">{currentUser?.email}</p>
                </div>
                <button onClick={handleLogout} className="logout-btn">
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="dashboard-main">
        {filteredSessions.length === 0 ? (
          <div className="empty-state">
            <div className="quantum-illustration">
              <div className="quantum-circle"></div>
              <div className="quantum-circle"></div>
              <div className="quantum-circle"></div>
            </div>
            <h2>No Secure Sessions Yet</h2>
            <p>Start your first quantum-secured conversation</p>
            <button className="start-chat-btn" onClick={() => navigate('/users')}>
              Start Quantum Chat
            </button>
          </div>
        ) : (
          <div className="sessions-list">
            <h2 className="section-title">Your Secure Sessions</h2>
            <div className="sessions-grid">
              {filteredSessions.map((session) => (
                <div
                  key={session.id}
                  className="session-card"
                  onClick={() => navigate(`/chat/${session.id}`)}
                >
                  <div className="session-header">
                    <div className="session-avatar">
                      {session.avatar ? (
                        <img src={session.avatar} alt={session.userName} />
                      ) : (
                        <span>{session.userName[0].toUpperCase()}</span>
                      )}
                    </div>
                    <div className="session-info">
                      <h3>{session.userName}</h3>
                      <p className="session-email">{session.userEmail}</p>
                    </div>
                    <div className="session-time">{formatTimestamp(session.timestamp)}</div>
                  </div>
                  <p className="last-message">{session.lastMessage}</p>
                  {getSecurityBadge(session)}
                  <div className="fingerprint-indicator">
                    <span className="fingerprint-icon">🔑</span>
                    <span className="fingerprint-text">Verify Keys</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
