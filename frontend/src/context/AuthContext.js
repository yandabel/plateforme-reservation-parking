import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Configurer axios
  axios.defaults.baseURL = process.env.REACT_APP_API_URL;

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      loadUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const loadUser = async () => {
    try {
      const res = await axios.get('/auth/me');
      setUser(res.data.user);
    } catch (error) {
      console.error('Erreur chargement utilisateur:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      const res = await axios.post('/auth/register', userData);
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      toast.success('Compte créé avec succès!');
      return { success: true, data: res.data };
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'inscription');
      return { success: false, error: error.response?.data };
    }
  };

  const login = async (credentials) => {
    try {
      const res = await axios.post('/auth/login', credentials);
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      toast.success('Connexion réussie!');
      return { success: true, data: res.data };
    } catch (error) {
      toast.error(error.response?.data?.message || 'Email ou mot de passe incorrect');
      return { success: false, error: error.response?.data };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    toast.info('Déconnexion réussie');
  };

  const updateProfile = async (userData) => {
    try {
      const res = await axios.put('/users/profile', userData);
      setUser(res.data.user);
      toast.success('Profil mis à jour avec succès!');
      return { success: true, data: res.data };
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour');
      return { success: false, error: error.response?.data };
    }
  };

  const changePassword = async (passwords) => {
    try {
      await axios.put('/users/change-password', passwords);
      toast.success('Mot de passe modifié avec succès!');
      return { success: true };
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors du changement de mot de passe');
      return { success: false, error: error.response?.data };
    }
  };

  const value = {
    user,
    loading,
    token,
    register,
    login,
    logout,
    updateProfile,
    changePassword,
    isAuthenticated: !!user,
    isOwner: user?.role === 'proprietaire',
    isAdmin: user?.role === 'admin',
    isClient: user?.role === 'client'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};