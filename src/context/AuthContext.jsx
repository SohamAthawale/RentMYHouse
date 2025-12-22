import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [pendingEmail, setPendingEmail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  /** Called ONLY after successful login */
  const login = (userData) => {
    setUser(userData);
    setPendingVerification(false);
    setPendingEmail(null);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  /** Called after signup if OTP is required */
  const requireVerification = (email) => {
    setPendingVerification(true);
    setPendingEmail(email);
  };

  const logout = () => {
    setUser(null);
    setPendingVerification(false);
    setPendingEmail(null);
    localStorage.removeItem('user');
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        updateUser,
        pendingVerification,
        pendingEmail,
        requireVerification,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
