import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = api.getToken();
    if (token) {
      api.getMe().then(setUser).catch(() => { api.clearToken(); setUser(null); }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
    const onLogout = () => setUser(null);
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  const register = useCallback(async (data) => {
    const res = await api.register(data);
    api.setToken(res.token);
    setUser(res.user);
    return res;
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.login({ email, password });
    api.setToken(res.token);
    setUser(res.user);
    return res;
  }, []);

  const logout = useCallback(() => {
    api.clearToken();
    setUser(null);
  }, []);

  const verifyEmail = useCallback(async (code) => {
    await api.verifyEmail(code);
    const u = await api.getMe();
    setUser(u);
  }, []);

  const setupArtistProfile = useCallback(async (data) => {
    const res = await api.setupArtist(data);
    const u = await api.getMe();
    setUser(u);
    return res;
  }, []);

  const setupCharityProfile = useCallback(async (data) => {
    const res = await api.setupCharity(data);
    const u = await api.getMe();
    setUser(u);
    return res;
  }, []);

  const refreshUser = useCallback(async () => {
    const u = await api.getMe();
    setUser(u);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout, verifyEmail, setupArtistProfile, setupCharityProfile, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
