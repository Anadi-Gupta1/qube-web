import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/config';

const AUTH_LOADING_TIMEOUT_MS = 5000;

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ currentUser: null, loading: true });

export function useAuth() {
  return useContext(AuthContext);
}

const loadingStyles: React.CSSProperties = {
  width: '100vw',
  height: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#000000',
  color: '#ffffff',
  fontSize: '1.2rem',
  letterSpacing: '2px',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: () => void = () => {};

    try {
      unsubscribe = onAuthStateChanged(
        auth,
        (user) => {
          setCurrentUser(user);
          setLoading(false);
        },
        () => {
          // Auth error — treat as unauthenticated
          setCurrentUser(null);
          setLoading(false);
        }
      );
    } catch {
      // Firebase not configured — treat as unauthenticated
      setCurrentUser(null);
      setLoading(false);
    }

    // Safety timeout: resolve loading after AUTH_LOADING_TIMEOUT_MS in case Firebase hangs
    const timeout = setTimeout(() => setLoading(false), AUTH_LOADING_TIMEOUT_MS);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  if (loading) {
    return <div style={loadingStyles}>QUBES</div>;
  }

  return (
    <AuthContext.Provider value={{ currentUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
