import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NewGameModal from '../NewGameModal/NewGameModal';
import styles from './Header.module.css';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNewGameModalOpen, setIsNewGameModalOpen] = useState(false);
  const { isAuthenticated, logout, userId } = useAuth();
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const openNewGameModal = () => {
    setIsNewGameModalOpen(true);
    if (isMenuOpen) {
      setIsMenuOpen(false);
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.leftSide}>
        <div className={styles.logo}>
          <Link to="/">
            <img src="/assets/logo.png" alt="Logo" className={styles.logoImage} />
          </Link>
        </div>
      </div>
      <div className={styles.rightSide}>
        {isAuthenticated ? (
          <>
            <nav className={`${styles.nav} ${styles.desktopNav}`}>
              <Link to="/join-game" className={styles.navLink}>Join Game</Link>
              <span className={styles.navLink} onClick={openNewGameModal}>New Game</span>
              <Link to={`/profile/${userId}`} className={styles.navLink}>Profile</Link>
              <span className={`${styles.navLink} ${styles.logoutButton}`} onClick={handleLogout}>Log Out</span>
              <a href="/downloads/LudoGame.exe" download className={styles.downloadButton}>Download</a>
            </nav>
            <button className={`${styles.hamburger} ${isMenuOpen ? styles.open : ''}`} onClick={toggleMenu}>
              <span></span>
              <span></span>
              <span></span>
            </button>
          </>
        ) : (
          <nav className={styles.nav}>
            <Link to="/signup" className={styles.navLink}>Sign Up</Link>
            <Link to="/login" className={`${styles.navLink} ${styles.loginButton}`}>Log In</Link>
          </nav>
        )}
      </div>

      {isAuthenticated && (
        <div className={`${styles.mobileNav} ${isMenuOpen ? styles.open : ''}`}>
          <Link to="/join-game" className={styles.navLink} onClick={toggleMenu}>Join Game</Link>
          <span className={styles.navLink} onClick={openNewGameModal}>New Game</span>
          <Link to={`/profile/${userId}`} className={styles.navLink} onClick={toggleMenu}>Profile</Link>
          <span className={`${styles.navLink} ${styles.logoutButton}`} onClick={() => { toggleMenu(); handleLogout(); }}>Log Out</span>
          <a href="/downloads/LudoGame.exe" download className={styles.downloadButton}>Download</a>
        </div>
      )}

      {isNewGameModalOpen && (
        <NewGameModal onClose={() => setIsNewGameModalOpen(false)} />
      )}
    </header>
  );
};

export default Header;
