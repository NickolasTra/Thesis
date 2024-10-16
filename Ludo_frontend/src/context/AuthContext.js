import React, { createContext, useState, useEffect, useCallback } from "react";
import { jwtDecode } from "jwt-decode";
import axios from "axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState(localStorage.getItem("userId"));
  const [accessToken, setAccessToken] = useState(
    localStorage.getItem("accessToken")
  );
  const [refreshToken, setRefreshToken] = useState(
    localStorage.getItem("refreshToken")
  );

  const isTokenExpired = (token) => {
    try {
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      return decoded.exp < currentTime;
    } catch (error) {
      return true;
    }
  };

  const refreshAccessToken = useCallback(async () => {
    try {
      const response = await axios.post('https://tragiannis.site/api/users/refresh-token', { refreshToken });
      const newAccessToken = response.data.accessToken;
      setAccessToken(newAccessToken);
      localStorage.setItem('accessToken', newAccessToken);
      return newAccessToken;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      logout();
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    if (!accessToken || !refreshToken || !userId) {
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }

    try {
      const decodedToken = jwtDecode(accessToken);
      const now = Date.now() / 1000;

      if (decodedToken.exp < now) {
        const newAccessToken = await refreshAccessToken();
        setIsAuthenticated(!!newAccessToken);
      } else {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error("Token validation error:", error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, refreshToken, userId, refreshAccessToken]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = (newAccessToken, newRefreshToken, newUserId) => {
    setIsLoading(true);
    localStorage.setItem("accessToken", newAccessToken);
    localStorage.setItem("refreshToken", newRefreshToken);
    localStorage.setItem("userId", newUserId);
    setAccessToken(newAccessToken);
    setRefreshToken(newRefreshToken);
    setUserId(newUserId);
    setIsAuthenticated(true);
    setIsLoading(false);
  };

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await axios.post('https://tragiannis.site/api/users/logout', { refreshToken });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("userId");
      setAccessToken(null);
      setRefreshToken(null);
      setUserId(null);
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  }, [refreshToken]);

  const axiosAuth = axios.create({
    baseURL: 'https://tragiannis.site/api',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  axiosAuth.interceptors.request.use(
    async (config) => {
      if (!accessToken || isTokenExpired(accessToken)) {
        const newAccessToken = await refreshAccessToken();
        if (newAccessToken) {
          config.headers['Authorization'] = `Bearer ${newAccessToken}`;
        }
      } else {
        config.headers['Authorization'] = `Bearer ${accessToken}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  axiosAuth.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      if (error.response && error.response.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          const newAccessToken = await refreshAccessToken();
          if (newAccessToken) {
            originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
            return axiosAuth(originalRequest);
          } else {
            logout();
            throw new Error('Session expired. Please login again.');
          }
        } catch (refreshError) {
          console.error('Error refreshing token:', refreshError);
          logout();
          throw refreshError;
        }
      }
      return Promise.reject(error);
    }
  );

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isLoading, login, logout, userId, axiosAuth }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => React.useContext(AuthContext);