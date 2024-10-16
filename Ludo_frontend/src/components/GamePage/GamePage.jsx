import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSocket } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext";
import {
  FaUser,
  FaCrown,
  FaSpinner,
  FaDoorOpen,
  FaExclamationTriangle,
  FaSync,
} from "react-icons/fa";
import styles from "./GamePage.module.css";

const GamePage = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const {
    socket,
    gameState,
    leaveGame,
    startGame,
    sendChatMessage,
    reconnectToGame,
    isConnecting,
    connectionError,
    setConnectionError,
    resetConnectionError,
    reconnectAttempts,
    MAX_RECONNECT_ATTEMPTS,
  } = useSocket();
  const { userId } = useAuth();
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [countdown, setCountdown] = useState(null);
  const [showAppWarning, setShowAppWarning] = useState(false);
  const chatContainerRef = useRef(null);

  const handleReconnect = useCallback(() => {
    if (reconnectToGame && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      console.log(
        `Attempting to reconnect to game ${gameId} (Attempt ${
          reconnectAttempts + 1
        })`
      );
      reconnectToGame({ gameId, userId });
    } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error("Max reconnection attempts reached");
      setConnectionError(
        "Failed to reconnect after multiple attempts. Please refresh the page."
      );
    }
  }, [
    gameId,
    userId,
    reconnectToGame,
    reconnectAttempts,
    MAX_RECONNECT_ATTEMPTS,
    setConnectionError,
  ]);

  useEffect(() => {
    if (gameId && userId && !gameState) {
      handleReconnect();
    }
  }, [gameId, userId, gameState, handleReconnect]);

  useEffect(() => {
    if (gameState && gameState.gameId && !gameState.players) {
      socket.emit("requestGameState", { gameId: gameState.gameId });
    }
  }, [gameState, socket]);

  useEffect(() => {
    if (socket) {
      const socketEventHandlers = {
        chatMessage: (message) => {
          setChatMessages((prevMessages) => [...prevMessages, message]);
        },
        gameCountdown: ({ countdown }) => {
          setCountdown(countdown);
        },
        gameStarted: () => {
          setCountdown(null);
          setShowAppWarning(true);
        },
        newHostAssigned: ({ newHost }) => {
          console.log(`New host assigned: ${newHost}`);
        },
        playerJoined: (data) => {
          console.log("Player joined:", data);
        },
        playerLeft: (data) => {
          console.log("Player left:", data);
        },
      };

      Object.entries(socketEventHandlers).forEach(([event, handler]) => {
        socket.on(event, handler);
      });

      return () => {
        Object.keys(socketEventHandlers).forEach((event) => {
          socket.off(event);
        });
      };
    }
  }, [socket]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  useEffect(() => {
    if (gameState && gameState.status === 1) {
      setShowAppWarning(true);
    }
  }, [gameState]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() && gameId) {
      sendChatMessage({ gameId, userId, message: newMessage });
      setNewMessage("");
    }
  };

  const handleStartGame = () => {
    if (gameId && userId) {
      startGame({ gameId, userId });
    }
  };

  const handleLeaveGame = () => {
    leaveGame({ gameId, userId });
    navigate("/join-game");
  };

  if (isConnecting) {
    return (
      <div className={styles.loadingOverlay}>
        <FaSpinner className={styles.spinnerIcon} />
        <p>
          Connecting to game... (Attempt {reconnectAttempts + 1}/
          {MAX_RECONNECT_ATTEMPTS})
        </p>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className={styles.errorOverlay}>
        <FaExclamationTriangle className={styles.errorIcon} />
        <p>{connectionError}</p>
        {reconnectAttempts < MAX_RECONNECT_ATTEMPTS && (
          <button onClick={handleReconnect} className={styles.retryButton}>
            <FaSync className={styles.retryIcon} /> Retry
          </button>
        )}
        <button
          onClick={() => {
            resetConnectionError();
            navigate("/join-game");
          }}
          className={styles.backButton}
        >
          Back to Lobby
        </button>
      </div>
    );
  }

  if (!gameState || !gameState.players) {
    return (
      <div className={styles.loadingOverlay}>
        <FaSpinner className={styles.spinnerIcon} />
        <p>Loading game...</p>
      </div>
    );
  }

  const players = Array.isArray(gameState.players)
    ? gameState.players
    : gameState.players
    ? gameState.players.split(",")
    : [];
  const isHost = gameState.host === userId;
  const gameHasStarted = gameState.status === 1;

  return (
    <div className={styles.main}>
      <div className={styles.gamePage}>
        <div className={styles.gameInfo}>
          <h2 className={styles.gameTitle}>Game Lobby: {gameId}</h2>
          <button onClick={handleLeaveGame} className={styles.leaveButton}>
            <FaDoorOpen /> Leave Game
          </button>
        </div>
        {countdown !== null && (
          <div className={styles.countdownOverlay}>
            <h2>Game Starting In</h2>
            <div className={styles.countdown}>{countdown}</div>
          </div>
        )}
        {showAppWarning && (
          <div className={styles.appWarning}>
            <FaExclamationTriangle className={styles.warningIcon} />
            <p>
              Please check that the main game application is running on your
              computer.
            </p>
          </div>
        )}
        <div className={styles.lobbyContainer}>
          <div className={styles.playerSection}>
            <h3 className={styles.sectionTitle}>
              Players ({players.length}/{gameState.maxPlayers})
            </h3>
            <div className={styles.playerList}>
              {players.map((playerId) => (
                <div key={playerId} className={styles.playerItem}>
                  <FaUser className={styles.playerIcon} />
                  <span className={styles.playerName}>
                    {playerId === userId
                      ? "You"
                      : `Player ${playerId.slice(0, 6)}`}
                  </span>
                  {playerId === gameState.host && (
                    <FaCrown className={styles.hostIcon} title="Host" />
                  )}
                  {playerId === gameState.host && playerId === userId && (
                    <span className={styles.hostLabel}> (Host)</span>
                  )}
                </div>
              ))}
            </div>
            <div className={styles.gameSettings}>
              <p>
                Players: {players.length} / {gameState.maxPlayers}
              </p>
              <p>Bots: {gameState.botCount}</p>
            </div>
            {isHost && !gameHasStarted && countdown === null && (
              <button
                onClick={handleStartGame}
                disabled={players.length < 2}
                className={`${styles.startButton} ${
                  players.length < 2 ? styles.disabled : ""
                }`}
              >
                Start Game
              </button>
            )}
            {gameHasStarted && (
              <div className={styles.gameStartedMessage}>Game has started!</div>
            )}
          </div>
          <div className={styles.chatSection}>
            <h3 className={styles.sectionTitle}>Chat</h3>
            <div className={styles.chatMessages} ref={chatContainerRef}>
              {chatMessages.map((msg, index) => (
                <div key={index} className={styles.message}>
                  <span className={styles.messageSender}>{msg.sender}:</span>
                  <span className={styles.messageContent}>{msg.message}</span>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendMessage} className={styles.chatForm}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className={styles.chatInput}
              />
              <button type="submit" className={styles.sendButton}>
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamePage;