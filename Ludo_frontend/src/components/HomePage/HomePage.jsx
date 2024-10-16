import React, { useEffect, useState } from 'react';
import styles from './HomePage.module.css';

const HomePage = () => {
    const [leaderboard, setLeaderboard] = useState([]);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const response = await fetch('https://tragiannis.site/api/users/leaderboard');
                const data = await response.json();
                setLeaderboard(data);
            } catch (error) {
                console.error('Error fetching leaderboard:', error);
            }
        };

        fetchLeaderboard();
    }, []);

    return (
        <div className={styles['home-page']}>
            <div className={`${styles.quarter} ${styles.boardQuarter}`}>
                <img src='assets/3.png' alt="Board" className={styles.image} />
            </div>
            <div className={`${styles.quarter} ${styles.leaderboardQuarter}`}>
                <div className={styles.leaderboards}>
                    <div className={styles.title}>
                        <img src="assets/crown.png" alt="Crown" className={styles.crown} />
                        <h2>Leaderboards</h2>
                    </div>
                    <div className={styles['leaderboard-header']}>
                        <span className={styles['header-position']}>#</span>
                        <span className={styles['header-username']}>Username</span>
                        <span className={styles['header-wins']}>Wins</span>
                    </div>
                    <ol className={styles['top-players']}>
                        {leaderboard.map((player, index) => (
                            <li key={player.id}>
                                <span className={styles.playerRank}>{index + 1}</span>
                                <span className={styles.playerName}>{player.username}</span>
                                <span className={styles.playerScore}>{player.wins}</span>
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
            <div className={`${styles.quarter} ${styles.rulesQuarter}`}>
                <div className={styles['game-rules']}>
                    <h2>Game Rules</h2>
                    <ul className={styles['rules-list']}>
                        <li>Create a new game and choose the number of players/bots.</li>
                        <li>All players roll a dice. Highest roll plays first.</li>
                        <li>Roll a 6 to move a piece out of your "base".</li>
                        <li>No available moves? Lose your turn.</li>
                        <li>Move 1-6 positions clockwise based on your roll.</li>
                        <li>Land on an opponent's piece to send it back to their base.</li>
                        <li>First to get all four pieces to "Finish" wins!</li>
                    </ul>
                </div>
            </div>
            <div className={`${styles.quarter} ${styles.creditsQuarter}`}>
                <div className={styles.credits}>
                    <h2>Credits</h2>
                    <p>
                        Diploma Thesis by<br />
                        <strong>Nikolaos Tragiannis</strong>
                    </p>
                    <p>
                        Supervisor: Dasygenis Minas<br />
                        University of Western Macedonia<br />
                        Laboratory of Digital Systems and Computer Architecture
                    </p>
                    <p className={styles.location}>Kozani, Greece • September 2022</p>
                </div>
            </div>
        </div>
    );
};

export default HomePage;
