import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import styles from './JoinGamePage.module.css';

const JoinGamePage = () => {
    const [games, setGames] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const navigate = useNavigate();
    const { axiosAuth, logout, userId } = useAuth();
    const { socket, joinGame, leaveGame, isJoining, joinError, currentRoom } = useSocket();

    const fetchGames = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await axiosAuth.get('/games');
            setGames(response.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching games:', err);
            setError('Failed to load games. Please try again later.');
            if (err.response && err.response.status === 403) {
                logout();
                navigate('/login');
            }
        } finally {
            setIsLoading(false);
        }
    }, [axiosAuth, logout, navigate]);

    useEffect(() => {
        fetchGames();
        
        if (socket) {
            const handleJoinSuccess = (data) => {
                console.log('Join success event received:', data);
                if (data && data.gameId) {
                    console.log(`Navigating to game ${data.gameId}`);
                    navigate(`/game/${data.gameId}`);
                } else {
                    console.error('Join success event received without gameId');
                }
            };
            
            const handleJoinError = (error) => {
                console.error('Error joining game:', error);
                alert('Failed to join the game. Please try again.');
                fetchGames();
            };

            const handleLeaveSuccess = () => {
                console.log('Successfully left the game');
                fetchGames();
            };

            const handleLeaveError = (error) => {
                console.error('Error leaving game:', error);
                alert('Failed to leave the game. Please try again.');
                fetchGames();
            };

            console.log('Setting up socket event listeners');
            socket.on('joinSuccess', handleJoinSuccess);
            socket.on('joinError', handleJoinError);
            socket.on('leaveSuccess', handleLeaveSuccess);
            socket.on('leaveError', handleLeaveError);

            return () => {
                console.log('Cleaning up socket event listeners');
                socket.off('joinSuccess', handleJoinSuccess);
                socket.off('joinError', handleJoinError);
                socket.off('leaveSuccess', handleLeaveSuccess);
                socket.off('leaveError', handleLeaveError);
            };
        }
    }, [socket, navigate, fetchGames]);

    useEffect(() => {
        if (joinError) {
            setError(joinError);
        }
    }, [joinError]);

    useEffect(() => {
        if (currentRoom) {
            navigate(`/game/${currentRoom}`);
        }
    }, [currentRoom, navigate]);

    const handleJoinGame = useCallback((gameId) => {
        console.log(`Attempting to join game ${gameId}`);
        setError(null);
        joinGame({ gameId, userId });
    }, [userId, joinGame]);

    const handleLeaveGame = useCallback((gameId) => {
        console.log(`Attempting to leave game ${gameId}`);
        leaveGame({ gameId, userId });
    }, [leaveGame, userId]);

    const handleGameClick = useCallback((gameId, isUserInGame, gameStatus) => {
        if (isUserInGame && gameStatus === 1) {
            console.log(`Navigating to game ${gameId} (already joined or in progress)`);
            navigate(`/game/${gameId}`);
        } else {
            if (gameStatus === 0) handleJoinGame(gameId);
        }
    }, [handleJoinGame, navigate]);

    const getPlayerCount = useCallback((players) => {
        return players.split(',').length;
    }, []);

    const isUserInGame = useCallback((players) => {
        return players.split(',').includes(userId);
    }, [userId]);

    if (isLoading) {
        return (
            <div className={styles.loadingSpinner}>
                <div className={styles.spinner}></div>
                <p>Loading games...</p>
            </div>
        );
    }

    return (
        <div className={styles.joinGamePage}>
            <h1 className={styles.pageTitle}>Join a Game</h1>
            <p className={styles.pageDescription}>
                Welcome to the game lobby! Here you can see all the available games waiting for players.
                Join an existing game or create your own to start playing.
            </p>
            <button onClick={fetchGames} className={styles.refreshButton}>Refresh Games</button>
            {error && <div className={styles.errorMessage}>{error}</div>}
            {games.length === 0 ? (
                <p className={styles.noGamesMessage}>No games available at the moment. Why not create one?</p>
            ) : (
                <div className={styles.gamesList}>
                    {games.map((game) => {
                        const userInGame = isUserInGame(game.players);
                        return (
                            <div 
                                key={game.id} 
                                className={`${styles.gameCard} 
                                            ${userInGame ? styles.userInGame : ''} 
                                            ${isJoining === game.id ? styles.joining : ''}
                                            ${game.status === 1 ? styles.inProgress : ''}`}
                                onClick={() => handleGameClick(game.id, userInGame, game.status)}
                            >
                                <h3 className={styles.gameName}>Game {game.id.slice(0, 8)}</h3>
                                <p className={styles.gameStatus}>
                                    {game.status === 1 
                                        ? <span className={styles.inProgressLabel}>In Progress</span> 
                                        : "Waiting"}
                                </p>
                                <p className={styles.playerCount}>
                                    Players: {getPlayerCount(game.players)}/{game.maxPlayers}
                                </p>
                                <p className={styles.botCount}>Bots: {game.botCount}</p>
                                {userInGame ? (
                                    <>
                                        <button
                                            className={`${styles.joinButton} ${styles.rejoinButton}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/game/${game.id}`);
                                            }}
                                        >
                                            {game.status === 1 ? 'Rejoin Game' : 'Enter Game'}
                                        </button>
                                        {game.status !== 1 && (
                                            <button
                                                className={`${styles.joinButton} ${styles.leaveButton}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleLeaveGame(game.id);
                                                }}
                                            >
                                                Leave Game
                                            </button>
                                        )}
                                    </>
                                ) : game.status !== 1 && (
                                    <button
                                        className={styles.joinButton}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleJoinGame(game.id);
                                        }}
                                        disabled={getPlayerCount(game.players) >= game.maxPlayers || isJoining === game.id}
                                    >
                                        {isJoining === game.id ? 'Joining...' : getPlayerCount(game.players) >= game.maxPlayers ? 'Full' : 'Join Game'}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default JoinGamePage;