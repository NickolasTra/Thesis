import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import io from "socket.io-client";

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [gameState, setGameState] = useState(null);
    const [currentRoom, setCurrentRoom] = useState(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionError, setConnectionError] = useState(null);
    const [reconnectAttempts, setReconnectAttempts] = useState(0);
    const MAX_RECONNECT_ATTEMPTS = 5;

    useEffect(() => {
        const newSocket = io("https://tragiannis.site", {
            reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
            reconnectionDelay: 1000,
            transports: ["websocket"],
        });
        setSocket(newSocket);

        const socketEventHandlers = {
            connect: () => {
                console.log("Socket connected");
                setIsConnecting(false);
                setConnectionError(null);
                setReconnectAttempts(0);
            },
            connect_error: (error) => {
                console.error("Socket connection error:", error);
                setConnectionError("Failed to connect to the server. Please try again.");
                setReconnectAttempts((prev) => prev + 1);
                if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                    setConnectionError("Maximum reconnection attempts reached. Please refresh the page.");
                }
            },
            disconnect: (reason) => {
                console.log("Socket disconnected:", reason);
                setIsConnecting(true);
                if (reason === "io server disconnect") {
                    newSocket.connect();
                }
            },
            gameStateUpdate: (data) => {
                console.log("Game state update received:", data);
                setGameState(prevState => ({ ...prevState, ...data }));
            },
            joinSuccess: (data) => {
                console.log("Join success:", data);
                setCurrentRoom(data.gameId);
                setGameState(prevState => ({ ...prevState, ...data }));
                newSocket.emit("requestGameState", { gameId: data.gameId });
                setIsConnecting(false);
            },
            gameCreated: (data) => {
                console.log("Game created:", data);
                setCurrentRoom(data.gameId);
                setGameState(data);
                setIsConnecting(false);
            },
            reconnectSuccess: (data) => {
                console.log("Reconnect success:", data);
                setCurrentRoom(data.gameId);
                setGameState(data);
                setIsConnecting(false);
            },
            newHostAssigned: (data) => {
                console.log("New host assigned:", data);
                setGameState(prevState => ({ ...prevState, host: data.newHost }));
            },
            playerJoined: (data) => {
                console.log("Player joined:", data);
                setGameState(prevState => ({
                    ...prevState,
                    players: data.players
                }));
            },
            playerLeft: (data) => {
                console.log("Player left:", data);
                setGameState(prevState => ({
                    ...prevState,
                    players: data.players
                }));
            },
            fullGameState: (data) => {
                console.log("Full game state received:", data);
                setGameState(data);
            }
        };

        Object.entries(socketEventHandlers).forEach(([event, handler]) => {
            newSocket.on(event, handler);
        });

        return () => {
            Object.keys(socketEventHandlers).forEach((event) => {
                newSocket.off(event);
            });
            newSocket.close();
        };
    }, [reconnectAttempts]);

    const createGame = useCallback((data) => {
        if (socket) {
            setIsConnecting(true);
            console.log('Emitting createGame event with data:', data);
            socket.emit("createGame", data);
        } else {
            console.error('Socket is not initialized');
            setConnectionError("Socket connection not established");
        }
    }, [socket]);

    const joinGame = useCallback(({ gameId, userId }) => {
        if (socket) {
            setIsConnecting(true);
            console.log(`Emitting joinGame event for game ${gameId} and user ${userId}`);
            socket.emit("joinGame", { gameId, userId });
        } else {
            console.error('Socket is not initialized');
            setConnectionError("Socket connection not established");
        }
    }, [socket]);

    const reconnectToGame = useCallback(({ gameId, userId }) => {
        if (socket) {
            setIsConnecting(true);
            console.log(`Emitting reconnectToGame event for game ${gameId} and user ${userId}`);
            socket.emit("reconnectToGame", { gameId, userId });
        } else {
            console.error('Socket is not initialized');
            setConnectionError("Socket connection not established");
        }
    }, [socket]);

    const leaveGame = useCallback(({ gameId, userId }) => {
        if (socket) {
            console.log(`Emitting leaveGame event for game ${gameId} and user ${userId}`);
            socket.emit("leaveGame", { gameId, userId });
            setCurrentRoom(null);
            setGameState(null);
        } else {
            console.error('Socket is not initialized');
            setConnectionError("Socket connection not established");
        }
    }, [socket]);

    const startGame = useCallback(({ gameId, userId }) => {
        if (socket) {
            console.log(`Emitting startGame event for game ${gameId} and user ${userId}`);
            socket.emit("startGame", { gameId, userId });
        } else {
            console.error('Socket is not initialized');
            setConnectionError("Socket connection not established");
        }
    }, [socket]);

    const sendChatMessage = useCallback(({ gameId, userId, message }) => {
        if (socket) {
            console.log(`Emitting chatMessage event for game ${gameId} and user ${userId}`);
            socket.emit("chatMessage", { gameId, userId, message });
        } else {
            console.error('Socket is not initialized');
            setConnectionError("Socket connection not established");
        }
    }, [socket]);

    const resetConnectionError = useCallback(() => {
        setConnectionError(null);
    }, []);

    const value = {
        socket,
        gameState,
        currentRoom,
        isConnecting,
        connectionError,
        setConnectionError,
        createGame,
        joinGame,
        reconnectToGame,
        leaveGame,
        startGame,
        sendChatMessage,
        resetConnectionError,
        reconnectAttempts,
        MAX_RECONNECT_ATTEMPTS
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};

export default SocketProvider;