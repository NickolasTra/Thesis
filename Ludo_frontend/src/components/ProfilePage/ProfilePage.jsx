import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import PasswordChangeModal from './PasswordChangeModal';
import styles from './ProfilePage.module.css';
import { useSocket } from '../../context/SocketContext';

ChartJS.register(ArcElement, Tooltip, Legend);

const GameItem = ({ game, index, totalGames, userId, handleJoinGame }) => {
    const isFinished = game.status === 2;
    const isClickable = !isFinished;
    const itemClassName = `${styles.gameItem} ${isClickable ? styles['gameItem-clickable'] : styles['gameItem-disabled']}`;

    const handleClick = (e) => {
        if (isClickable) {
            handleJoinGame(game.players, game.status, game.id);
        }
    };

    const getStatusText = (status) => {
        switch(status) {
            case 0: return 'Waiting';
            case 1: return 'In Progress';
            case 2: return 'Finished';
            default: return 'Unknown';
        }
    };

    const getStatusClass = (status) => {
        switch(status) {
            case 0: return 'waiting';
            case 1: return 'inProgress';
            case 2: return 'finished';
            default: return '';
        }
    };

    const userPieces = game.pieces[userId];
    const finishedPieces = userPieces ? userPieces.filter(piece => piece.is_finished).length : 0;
    const isWin = finishedPieces === 4;

    return (
        <div className={itemClassName} onClick={handleClick}>
            <span className={styles.gameNumber}>Game {totalGames - index}</span>
            <span className={styles.gameDate}>{new Date(game.createdAt).toLocaleDateString()}</span>
            <span className={`${styles.gameStatus} ${styles[`gameStatus-${getStatusClass(game.status)}`]}`}>
                {getStatusText(game.status)}
            </span>
            <span className={styles.gameResult}>
                {finishedPieces} / 4 pieces finished
            </span>
            {isFinished && (
                <span className={`${styles.gameWinLoss} ${isWin ? styles.gameWin : styles.gameLoss}`}>
                    {isWin ? 'Win' : 'Loss'}
                </span>
            )}
        </div>
    );
};

const ProfilePage = () => {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editedData, setEditedData] = useState({});
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});

    const { userId } = useParams();
    const navigate = useNavigate();
    const { axiosAuth, logout } = useAuth();
    const { joinGame } = useSocket();

    useEffect(() => {
        fetchUserData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    const fetchUserData = async () => {
        try {
            setLoading(true);
            const response = await axiosAuth.get(`/users/profile/${userId}`);
            setUserData(response.data);
            setEditedData({
                name: response.data.name,
                surname: response.data.surname,
                email: response.data.email,
                username: response.data.username
            });
            setError(null);
        } catch (err) {
            console.error('Error fetching user data:', err);
            setError('Failed to load user data. Please try again.');
            if (err.response && err.response.status === 403) {
                logout();
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditedData(prev => ({ ...prev, [name]: value }));
        setValidationErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validateForm = () => {
        const errors = {};
        if (editedData.email && !/\S+@\S+\.\S+/.test(editedData.email)) {
            errors.email = 'Invalid email format';
        }
        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            await axiosAuth.put(`/users/profile/${userId}`, editedData);
            fetchUserData();
            alert('Profile updated successfully');
        } catch (err) {
            console.error('Error updating profile:', err);
            if (err.response && err.response.data.message) {
                setValidationErrors({ email: err.response.data.message });
            } else {
                setError('Failed to update profile. Please try again.');
            }
        }
    };

    const isUserInGame= (players) => {
        return players.split(',').includes(userId);
    };

    const handleJoinGame = (players, gameStatus, gameId) => {
        if (isUserInGame(players) && gameStatus === 1) {
            navigate(`/game/${gameId}`);
        } else {
            if (gameStatus === 0){
                joinGame({ gameId, userId });
                navigate(`/game/${gameId}`);
            }
        }
    };

    if (loading) {
        return (
            <div className={styles.loaderContainer}>
                <div className={styles.loader}></div>
            </div>
        );
    }
    if (error) return <div className={styles.error}>{error}</div>;
    if (!userData) return null;

    const winRateData = {
        labels: ['Wins', 'Losses'],
        datasets: [
            {
                data: [userData.wins, userData.loses],
                backgroundColor: ['#2ecc71', '#e74c3c'],
                hoverBackgroundColor: ['#27ae60', '#c0392b']
            }
        ]
    };

    const latestGames = userData.games.slice(-5).reverse();

    return (
        <div className={styles.profilePage}>
            <h1 className={styles.pageTitle}>Welcome {editedData.username}!</h1>
            <div className={styles.cardContainer}>
                <div className={styles.profileDataCard}>
                    <h2 className={styles.cardTitle}>Profile Information</h2>
                    <form onSubmit={handleSubmit}>
                        <div className={styles.formGroup}>
                            <label htmlFor="name">Name:</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={editedData.name}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="surname">Surname:</label>
                            <input
                                type="text"
                                id="surname"
                                name="surname"
                                value={editedData.surname}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="email">Email:</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={editedData.email}
                                onChange={handleInputChange}
                            />
                            {validationErrors.email && <span className={styles.error}>{validationErrors.email}</span>}
                        </div>
                        <button type="submit" className={styles.submitButton}>Update Profile</button>
                        <button type="button" className={styles.passwordButton} onClick={() => setIsPasswordModalOpen(true)}>Change Password</button>
                    </form>
                </div>
                <div className={styles.statsCard}>
                    <h2 className={styles.cardTitle}>Game Statistics</h2>
                    <div className={styles.statsContainer}>
                        <div className={styles.statItem}>
                            <span className={styles.statLabel}>Total Games:</span>
                            <span className={styles.statValue}>{userData.totalGames || 0}</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statLabel}>Wins:</span>
                            <span className={styles.statValue}>{userData.wins || 0}</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statLabel}>Losses:</span>
                            <span className={styles.statValue}>{userData.loses || 0}</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statLabel}>Win Ratio:</span>
                            <span className={styles.statValue}>
                                {(userData.totalGames ? ((userData.wins / userData.totalGames) * 100).toFixed(2) : '0.00') + '%'}
                            </span>
                        </div>
                    </div>
                    <div className={styles.chartContainer}>
                        <Pie data={winRateData} options={{ responsive: true, maintainAspectRatio: false }} />
                    </div>
                    <h2 className={styles.cardTitle}>Latest Games</h2>
                    <div className={styles.latestGamesContainer}>
                    {latestGames.length > 0 ? (
                        latestGames.map((game, index) => (
                            <GameItem
                                key={game.id}
                                game={game}
                                index={index}
                                totalGames={latestGames.length}
                                userId={userId}
                                handleJoinGame={handleJoinGame}
                            />
                        ))
                    ) : (
                        <p className={styles.noDataMessage}>No game history available</p>
                    )}
                    </div>
                </div>
            </div>
            <PasswordChangeModal 
                isOpen={isPasswordModalOpen} 
                onClose={() => setIsPasswordModalOpen(false)}
                userId={userId}
                axiosAuth={axiosAuth}
            />
        </div>
    );
};

export default ProfilePage;