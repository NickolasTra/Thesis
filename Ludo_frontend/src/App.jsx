import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import HomePage from './components/HomePage/HomePage';
import LoginPage from './components/LoginPage/LoginPage';
import SignupPage from './components/SignupPage/SignupPage';
import ProfilePage from './components/ProfilePage/ProfilePage';
import JoinGamePage from './components/JoinGamePage/JoinGamePage';
import GamePage from './components/GamePage/GamePage';
import NotFoundPage from './components/NotFoundPage/NotFoundPage';
import PrivateRoute from './components/PrivateRoute/PrivateRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import './App.css';

const AuthRedirect = ({ children }) => {
  const { isAuthenticated, isLoading, axiosAuth } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const appToken = params.get('appToken');

    if (appToken && isAuthenticated) {
      axiosAuth.post("/users/set-app-token", { appToken: appToken });
    }
  }, [location.search, isAuthenticated, axiosAuth]);

  if (isLoading) {
    return null;
  }

  if (isAuthenticated && (location.pathname === '/login' || location.pathname === '/signup')) {
    console.log('Redirecting to home page', location.pathname);
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <div className="App">
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<AuthRedirect><LoginPage /></AuthRedirect>} />
          <Route path="/signup" element={<AuthRedirect><SignupPage /></AuthRedirect>} />
          <Route element={<PrivateRoute />}>
            <Route path="/profile/:userId" element={<ProfilePage />} />
            <Route path="/join-game" element={<JoinGamePage />} />
            <Route path="/game/:gameId" element={<GamePage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

function AppWrapper() {
  return (
    <AuthProvider>
      <SocketProvider>
        <App />
      </SocketProvider>
    </AuthProvider>
  );
}

export default AppWrapper;