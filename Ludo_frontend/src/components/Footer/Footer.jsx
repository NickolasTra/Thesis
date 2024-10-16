// Footer.js
import React from 'react';
import styles from './Footer.module.css';

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className={styles.footer}>
            <div className={styles.wrapper}>
                <p className={styles.copyright}>&copy; {currentYear} All Rights Reserved</p>
                <p className={styles.creator}>Created by Tragiannis Nikolaos</p>
            </div>
        </footer>
    );
};

export default Footer;