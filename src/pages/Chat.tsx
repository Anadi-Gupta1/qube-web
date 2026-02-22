import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, onValue, push, set } from 'firebase/database';
import { database } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import './Chat.css';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: number;
}

interface SessionInfo {
  otherUserId: string;
  userName: string;
  userEmail: string;
  isSecured: boolean;
}

function Chat() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentUser || !sessionId) return;

    // Load session info
    const sessionInfoRef = ref(database, `users/${currentUser.uid}/sessions/${sessionId}`);
    const unsubInfo = onValue(sessionInfoRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSessionInfo(data);
      }
      setLoading(false);
    });

    // Load messages
    const messagesRef = ref(database, `sessions/${sessionId}/messages`);
    const unsubMessages = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messagesList: Message[] = Object.entries(data).map(([id, msg]: [string, any]) => ({
          id,
          text: msg.text,
          senderId: msg.senderId,
          senderName: msg.senderName,
          timestamp: msg.timestamp
        }));
        messagesList.sort((a, b) => a.timestamp - b.timestamp);
        setMessages(messagesList);
      } else {
        setMessages([]);
      }
    });

    return () => {
      unsubInfo();
      unsubMessages();
    };
  }, [currentUser, sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !sessionId) return;

    try {
      const messagesRef = ref(database, `sessions/${sessionId}/messages`);
      const newMessageRef = push(messagesRef);

      await set(newMessageRef, {
        text: newMessage.trim(),
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
        timestamp: Date.now()
      });

      // Update last message in session
      await set(ref(database, `users/${currentUser.uid}/sessions/${sessionId}/lastMessage`), newMessage.trim());
      await set(ref(database, `users/${currentUser.uid}/sessions/${sessionId}/timestamp`), Date.now());
      
      if (sessionInfo?.otherUserId) {
        await set(ref(database, `users/${sessionInfo.otherUserId}/sessions/${sessionId}/lastMessage`), newMessage.trim());
        await set(ref(database, `users/${sessionInfo.otherUserId}/sessions/${sessionId}/timestamp`), Date.now());
      }

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (loading) {
    return (
      <div className="chat-loading">
        <div className="spinner"></div>
        <p>Loading chat...</p>
      </div>
    );
  }

  if (!sessionInfo) {
    return (
      <div className="chat-error">
        <p>Session not found</p>
        <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <button className="back-button" onClick={() => navigate('/dashboard')}>
          ←
        </button>
        <div className="chat-user-info">
          <div className="chat-avatar">
            {sessionInfo.userName[0].toUpperCase()}
          </div>
          <div className="chat-user-details">
            <h3>{sessionInfo.userName}</h3>
            <p className="chat-user-email">{sessionInfo.userEmail}</p>
          </div>
        </div>
        <div className="chat-security-status">
          {sessionInfo.isSecured ? (
            <span className="secured-badge">🔒 Secured</span>
          ) : (
            <span className="not-secured-badge">⚠ Not Secured</span>
          )}
        </div>
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <div className="quantum-icon-large">💬</div>
            <p>No messages yet</p>
            <span>Start the conversation!</span>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.senderId === currentUser?.uid ? 'sent' : 'received'}`}
            >
              <div className="message-content">
                {message.senderId !== currentUser?.uid && (
                  <div className="message-sender">{message.senderName}</div>
                )}
                <div className="message-text">{message.text}</div>
                <div className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="message-input-container" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="message-input"
        />
        <button 
          type="submit" 
          className="send-button"
          disabled={!newMessage.trim()}
        >
          <span className="send-icon">➤</span>
        </button>
      </form>
    </div>
  );
}

export default Chat;
