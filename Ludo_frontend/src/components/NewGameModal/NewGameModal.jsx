import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import styles from './NewGameModal.module.css';

const NewGameModal = ({ onClose }) => {
    const [maxPlayers, setMaxPlayers] = useState(4);
    const [botCount, setBotCount] = useState(0);
    const [error, setError] = useState('');
    const { socket, createGame } = useSocket();
    const { userId } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        if (maxPlayers - botCount < 1) {
            setError('At least one human player is required.');
            return;
        }
        if (botCount + (maxPlayers - botCount) > 4) {
            setError('Total number of players (bots + humans) must not exceed 4.');
            return;
        }

        console.log('Attempting to create game with:', { maxPlayers, botCount, userId });
        createGame({
            maxPlayers: maxPlayers,
            botCount: botCount,
            userId: userId
        });
    };

    useEffect(() => {
        if (socket) {
            const handleGameCreated = ({ gameId }) => {
                console.log('Game created event received, navigating to:', gameId);
                onClose();
                navigate(`/game/${gameId}`);
            };

            const handleGameError = ({ message }) => {
                console.error('Game creation error:', message);
                setError(message);
            };

            socket.on('gameCreated', handleGameCreated);
            socket.on('gameError', handleGameError);

            return () => {
                socket.off('gameCreated', handleGameCreated);
                socket.off('gameError', handleGameError);
            };
        }
    }, [socket, navigate, onClose]);

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <h2>Create New Game</h2>
                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label htmlFor="maxPlayers">Max Players:</label>
                        <select
                            id="maxPlayers"
                            value={maxPlayers}
                            onChange={(e) => {
                                setMaxPlayers(Number(e.target.value));
                                setError('');
                            }}
                            className={styles.select}
                        >
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="botCount">Number of Bots:</label>
                        <input
                            type="number"
                            id="botCount"
                            value={botCount}
                            onChange={(e) => {
                                setBotCount(Number(e.target.value));
                                setError('');
                            }}
                            min="0"
                            max={maxPlayers - 1}
                            className={styles.input}
                        />
                    </div>
                    {error && <div className={styles.error}>{error}</div>}
                    <div className={styles.modalActions}>
                        <button type="submit" className={styles.submitButton}>Create Game</button>
                        <button type="button" onClick={onClose} className={styles.cancelButton}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewGameModal;