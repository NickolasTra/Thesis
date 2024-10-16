const { v4: uuidv4 } = require("uuid");
const Game = require("../models/game");
const User = require("../models/user");
const { Op } = require("sequelize");

const COUNTDOWN_DURATION = 5;

const handleError = (socket, eventName, error) => {
  console.error(`Error in ${eventName}:`, error);
  socket.emit(`${eventName}Error`, {
    message: `Failed to ${eventName}`,
    details: error.message,
  });
};

const checkUserInGame = async (socket, { userId }) => {
  try {
    const game = await Game.findOne({
      where: {
        players: { [Op.like]: `%${userId}%` },
        status: { [Op.in]: [0, 1] }, // 0 for lobby, 1 for in-progress
      },
    });

    if (game) {
      socket.emit("checkUserInGameResponse", {
        inGame: true,
        gameId: game.id,
        gameState: {
          id: game.id,
          players: game.players,
          currentPlayer: game.currentPlayer,
          status: game.status,
          boardState: JSON.parse(game.boardState),
          pieces: JSON.parse(game.pieces),
          diceValue: game.diceValue,
          host: game.host,
          maxPlayers: game.maxPlayers,
          botCount: game.botCount,
        },
      });
    } else {
      socket.emit("checkUserInGameResponse", { inGame: false });
    }
  } catch (error) {
    handleError(socket, "checkUserInGame", error);
  }
};

const createGame = async (socket, data) => {
  try {
    const { maxPlayers, botCount, userId } = data;
    const gameId = uuidv4();
    const user = await User.findByPk(userId);

    if (!user) {
      return socket.emit("gameError", { message: "User does not exist" });
    }

    const botIds = Array.from({ length: botCount }, (_, i) => `bot${i + 1}`);
    const players = [userId, ...botIds].join(',');

    const game = await Game.create({
      id: gameId,
      players,
      maxPlayers,
      botCount,
      status: 0,
      host: userId,
      currentPlayer: userId,
    });

    socket.join(gameId);
    socket.emit("gameCreated", { gameId });
    console.log(`Game ${gameId} created successfully with players: ${players}`);

    user.addGame(gameId);

    if (user && user.appToken) {
      io.to(`appToken_${user.appToken}`).emit("userJoinedGame", {...game.dataValues, gameId: game.id});
    }
  } catch (error) {
    handleError(socket, "createGame", error);
  }
};

const joinGame = async (socket, io, data) => {
  try {
    const { gameId, userId } = data;
    const game = await Game.findByPk(gameId);

    if (!game) {
      return socket.emit("joinError", { message: "Game does not exist" });
    }

    const players = game.players.split(",");
    if (players.includes(userId)) {
      return socket.emit("joinError", {
        message: "You are already in this game",
      });
    }

    if (players.length >= game.maxPlayers) {
      return socket.emit("joinError", { message: "Game is full" });
    }

    players.push(userId);
    await game.update({ players: players.join(",") });

    socket.join(gameId);
    io.to(gameId).emit("playerJoined", {
      gameId,
      playerId: userId,
      playerCount: players.length,
    });

    User.findByPk(userId).then((user) => {
      if (user) {
        user.addGame(gameId);
      }
    });

    if (players.length === game.maxPlayers) {
      io.to(gameId).emit("gameReady", { gameId });
    }

    let pieces;
    try {
      pieces = JSON.parse(game.pieces);
    } catch (e) {
      pieces = game.pieces;
    }

    const joinSuccessData = { 
      gameId: game.id, 
      players: game.players,
      maxPlayers: game.maxPlayers,
      botCount: game.botCount,
      status: game.status,
      host: game.host,
      currentPlayer: game.currentPlayer,
      pieces: pieces,
      diceValue: game.diceValue
    };

    socket.emit("joinSuccess", joinSuccessData);

    // Notify the Python client
    const user = await User.findByPk(userId);
    if (user && user.appToken) {
      io.to(`appToken_${user.appToken}`).emit("userJoinedGame", joinSuccessData);
    }

    console.log(`User ${userId} joined game ${gameId}`);
  } catch (error) {
    console.error("Error in joinGame:", error);
    socket.emit("joinError", { message: "Failed to join game", details: error.message });
  }
};

const reconnectToGame = async (socket, io, data) => {
  try {
    const { gameId, userId } = data;
    const game = await Game.findByPk(gameId);
    
    if (!game) {
      return socket.emit("reconnectError", { message: "Game does not exist" });
    }

    const players = game.players.split(",");
    if (!players.includes(userId)) {
      return socket.emit("reconnectError", { message: "You are not part of this game" });
    }

    socket.join(gameId);
    
    let pieces;
    try {
      pieces = JSON.parse(game.pieces);
    } catch (e) {
      pieces = game.pieces;
    }

    const gameState = {
      gameId: game.id,
      players: game.players,
      status: game.status,
      maxPlayers: game.maxPlayers,
      botCount: game.botCount,
      host: game.host,
      currentPlayer: game.currentPlayer,
      diceValue: game.diceValue,
      pieces: pieces
    };

    socket.emit("reconnectSuccess", gameState);
    socket.to(gameId).emit("playerReconnected", { gameId, playerId: userId });

    const user = await User.findByPk(userId);
    if (user && user.appToken) {
      io.to(`appToken_${user.appToken}`).emit("reconnectSuccess", gameState);
    }

    console.log(`User ${userId} reconnected to game ${gameId}`);
  } catch (error) {
    console.error("Error in reconnectToGame:", error);
    socket.emit("reconnectError", { message: "Failed to reconnect to game", details: error.message });
  }
};

const leaveGame = async (socket, io, data) => {
  try {
    const { gameId, userId } = data;
    const game = await Game.findByPk(gameId);
    
    if (!game) {
      return socket.emit("leaveError", { message: "Game does not exist" });
    }

    const players = game.players.split(",").filter(id => id !== userId);
    
    let updatedGame = { players: players.join(",") };
    
    if (game.host === userId) {
      if (players.length > 0) {
        // Assign the next player in the list as the new host
        updatedGame.host = players[0];
      }
    }

    await game.update(updatedGame);

    socket.leave(gameId);
    io.to(gameId).emit("playerLeft", {
      gameId,
      playerId: userId,
      playerCount: players.length,
      newHost: updatedGame.host
    });

    User.findByPk(userId).then((user) => {
      if (user) {
        user.removeGame(gameId);
      }
    });

    const allBots = players.every(playerId => playerId.startsWith("bot"));
    if (players.length === 0 || allBots) {
      await game.destroy();
      io.to(gameId).emit("gameEnded", { gameId });
    }

    socket.emit("leaveSuccess", { gameId });

    const user = await User.findByPk(userId);
    if (user) {
      // Send system message when a player reconnects
      const systemMessage = {
        sender: "System",
        message: `${user.username} has left the game.`,
        timestamp: new Date(),
      };
      io.to(gameId).emit("chatMessage", systemMessage);
    }

    // If a new host was assigned, notify all clients
    if (updatedGame.host && updatedGame.host !== game.host) {
      io.to(gameId).emit("newHostAssigned", { 
        gameId, 
        newHost: updatedGame.host 
      });

      const newHostMessage = {
        sender: "System",
        message: `New host: ${updatedGame.host}`,
        timestamp: new Date(),
      };

      io.to(gameId).emit("chatMessage", newHostMessage);
    }

    if (user && user.appToken) {
      io.to(`appToken_${user.appToken}`).emit("userLeftGame", { gameId: game.id });
    }

  } catch (error) {
    handleError(socket, "leaveGame", error);
  }
};

const startGame = async (socket, io, data) => {
  try {
    const { gameId, userId } = data;
    const game = await Game.findByPk(gameId);

    if (!game) {
      return socket.emit("gameError", { message: "Game does not exist" });
    }

    if (game.status !== 0) {
      return socket.emit("gameError", {
        message: "Game is not in the correct state to start",
      });
    }

    if (game.host !== userId) {
      return socket.emit("gameError", {
        message: "Only the host can start the game",
      });
    }

    let countdown = COUNTDOWN_DURATION;
    let pieces;
    try {
      pieces = JSON.parse(game.pieces);
    } catch (e) {
      pieces = game.pieces;
    }

    const countdownInterval = setInterval(() => {
      io.to(gameId).emit("gameCountdown", { countdown });
      countdown--;

      if (countdown < 0) {
        clearInterval(countdownInterval);
        game.update({ status: 1 });
        const gameStartData = { 
          gameId: game.id,
          players: game.players,
          maxPlayers: game.maxPlayers,
          botCount: game.botCount,
          status: 1,
          host: game.host,
          currentPlayer: game.currentPlayer,
          pieces: pieces,
          diceValue: game.diceValue
        };
        io.to(gameId).emit("gameStarted", gameStartData);

        // Notify all Python clients connected to this game
        game.players.split(',').forEach(async (playerId) => {
          const user = await User.findByPk(playerId);
          if (user && user.appToken) {
            io.to(`appToken_${user.appToken}`).emit("gameStarted", gameStartData);
          }
        });
      }
    }, 1000);
  } catch (error) {
    handleError(socket, "startGame", error);
  }
};

const chatMessage = async (socket, io, data) => {
  try {
    const { gameId, userId, message } = data;
    const game = await Game.findByPk(gameId);
    const user = await User.findByPk(userId);

    if (!game) {
      return socket.emit("chatError", { message: "Game does not exist" });
    }

    if (!user) {
      return socket.emit("chatError", { message: "User does not exist" });
    }

    const chatMessage = {
      sender: user.username,
      message: message,
      timestamp: new Date(),
    };

    io.to(gameId).emit("chatMessage", chatMessage);
  } catch (error) {
    handleError(socket, "chatMessage", error);
  }
};

const updateGameState = async (socket, io, data) => {
  try {
    const { gameId, gameState } = data;
    const game = await Game.findByPk(gameId);
    
    if (!game) {
      return socket.emit("gameError", { message: "Game does not exist" });
    }

    const players = game.players.split(",");
    const currentPlayerIndex = players.indexOf(gameState.currentPlayer);

    // Only change the current player if the dice value is not 6
    if (game.diceValue !== 6) {
      const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
      gameState.currentPlayer = players[nextPlayerIndex];
    }

    // Update the game with the new state
    await game.update({
      players: gameState.players,
      currentPlayer: gameState.currentPlayer,
      diceValue: 0, // Reset dice value after each move
      pieces: gameState.pieces,
    });

    // Check for a winner
    const winnerId = checkForWinner(gameState.pieces);
    if (winnerId) {
      await endGame(game, winnerId);
      io.to(gameId).emit("gameEnded", { winner: winnerId });
      User.findByPk(winnerId).then((user) => {
        if (user){
          user.update({ wins: user.wins + 1 });
        }
      });

      players.forEach((playerId) => {
        User.findByPk(playerId).then((user) => {
          if (user){
            user.update({ totalGames: user.totalGames + 1 });
          }
        });
      });
      console.log(`Game ${gameId} ended. Winner: ${winnerId}`);
    } else {
      // Broadcast the updated game state to all players
      io.to(gameId).emit("gameStateUpdate", gameState);
      console.log(`Game state updated for game ${gameId}`);
    }
  } catch (error) {
    console.error("Error in updateGameState:", error);
    socket.emit("updateGameStateError", { message: "Failed to update game state", details: error.message });
  }
};

const skipTurn = async (socket, io, data) => {
  try {
    const { gameId, userId } = data;
    const game = await Game.findByPk(gameId);

    if (!game) {
      console.log(`Game not found: ${gameId}`);
      return socket.emit("skipTurnError", { message: "Game does not exist" });
    }

    if (game.currentPlayer !== userId) {
      console.log(`Not current player's turn. Expected: ${game.currentPlayer}, Actual: ${userId}`);
      return socket.emit("skipTurnError", { message: "It's not your turn to skip" });
    }

    const players = game.players.split(",");
    const currentPlayerIndex = players.indexOf(userId);
    const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
    const nextPlayerId = players[nextPlayerIndex];

    await game.update({ currentPlayer: nextPlayerId });
    io.to(gameId).emit("currentPlayerChanged", { gameId, currentPlayer: nextPlayerId });
    console.log(`Player ${userId} skipped their turn in game ${gameId}`);
  } catch (error) {
    console.error("Error in skipTurn:", error);
    socket.emit("skipTurnError", { message: "Failed to skip turn", details: error.message });
  }
};

const handleDiceRoll = async (socket, io, data) => {
  try {
    const { gameId, userId } = data;
    const game = await Game.findByPk(gameId);

    if (!game) {
      console.log(`Game not found: ${gameId}`);
      return socket.emit("diceRollError", { message: "Game does not exist" });
    }

    const isBot = game.currentPlayer.startsWith('bot');

    const isValidTurn = isBot || game.currentPlayer === userId;
    if (!isValidTurn) {
      console.log(`Not current player's turn. Expected: ${game.currentPlayer}, Actual: ${userId}`);
      io.to(gameId).emit("diceRolled", { value: game.diceValue, playerId: game.currentPlayer });
      return socket.emit("diceRollError", { message: "It's not your turn to roll" });
    }

    const diceValue = Math.floor(Math.random() * 6) + 1;
    game.diceValue = diceValue;
    await game.save();

    console.log(`Emitting diceRolled event to room ${gameId}: { value: ${diceValue}, playerId: ${game.currentPlayer} }`);
    io.to(gameId).emit("diceRolled", { value: diceValue, playerId: game.currentPlayer });
    
    console.log(`Player ${game.currentPlayer} rolled a ${diceValue} in game ${gameId}`);

  } catch (error) {
    console.error(`Error in handleDiceRoll: ${error}`);
    handleError(socket, "handleDiceRoll", error);
  }
};

const requestGameState = async (socket, data) => {
  try {
    const { gameId } = data;
    const game = await Game.findByPk(gameId);
    
    if (!game) {
      return socket.emit("gameError", { message: "Game does not exist" });
    }

    let pieces;
    try {
      pieces = JSON.parse(game.pieces);
    } catch (e) {
      pieces = game.pieces;
    }

    const fullGameState = {
      gameId: game.id,
      players: game.players,
      status: game.status,
      maxPlayers: game.maxPlayers,
      botCount: game.botCount,
      host: game.host,
      currentPlayer: game.currentPlayer,
      diceValue: game.diceValue,
      pieces: pieces
    };

    socket.emit("fullGameState", fullGameState);
    console.log(`Full game state sent for game ${gameId}`);
  } catch (error) {
    console.error("Error in requestGameState:", error);
    socket.emit("gameError", { message: "Failed to get game state", details: error.message });
  }
};

const checkForWinner = (pieces) => {
  for (const [playerId, playerPieces] of Object.entries(pieces)) {
    if (playerPieces.every(piece => piece.is_finished)) {
      return playerId;
    }
  }
  return null;
};

const endGame = async (game, winnerId) => {
  await game.update({
    status: 2,  // 2 represents a finished game
    winner: winnerId
  });
};

const joinSocketRoom = (socket, data) => {
  const { room } = data;
  socket.join(room);
  console.log(`Socket ${socket.id} joined room ${room}`);
};

const leaveSocketRoom = (socket, data) => {
  const { room } = data;
  socket.leave(room);
  console.log(`Socket ${socket.id} left room ${room}`); 
};

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    socket.on("checkUserInGame", (data) => checkUserInGame(socket, data));
    socket.on("createGame", (data) => createGame(socket, data));
    socket.on("joinGame", (data) => joinGame(socket, io, data));
    socket.on("joinRoom", (data) => joinSocketRoom(socket, data));
    socket.on("leaveRoom", (data) => leaveSocketRoom(socket, data));
    socket.on("reconnectToGame", (data) => reconnectToGame(socket, io, data));
    socket.on("leaveGame", (data) => leaveGame(socket, io, data));
    socket.on("requestGameState", (data) => requestGameState(socket, data));
    socket.on("startGame", (data) => startGame(socket, io, data));
    socket.on("chatMessage", (data) => chatMessage(socket, io, data));
    socket.on("updateGameState", (data) => updateGameState(socket, io, data));
    socket.on("skipTurn", (data) => skipTurn(socket, io, data));
    socket.on("waitForAppToken", (appToken) => waitForAppToken(socket, appToken));
    socket.on("rollDice", (data) => handleDiceRoll(socket, io, data));

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  Game.addHook("afterUpdate", async (game, options) => {
    const changedFields = {};
    if (game.changed("boardState")) changedFields.boardState = JSON.parse(game.boardState);
    if (game.changed("status")) changedFields.status = game.status;
    if (game.changed("players")) changedFields.players = game.players;
    if (game.changed("currentPlayer")) changedFields.currentPlayer = game.currentPlayer;
    if (game.changed("host")) changedFields.host = game.host;
    if (game.changed("maxPlayers")) changedFields.maxPlayers = game.maxPlayers;
    if (game.changed("botCount")) changedFields.botCount = game.botCount;

    if (Object.keys(changedFields).length > 0) {
      console.log(`Game state updated for game ${game.id}`);
      io.to(game.id).emit("gameStateUpdate", {
        gameId: game.id,
        ...changedFields,
      });

      if (game.changed("players")) {
        io.to(game.id).emit("playersChanged", {
          gameId: game.id,
          players: game.players,
        });
      }

      if (game.changed("currentPlayer")) {
        io.to(game.id).emit("currentPlayerChanged", {
          gameId: game.id,
          currentPlayer: game.currentPlayer,
        });
      }

      if (game.changed("host")) {
        io.to(game.id).emit("newHost", {
          gameId: game.id,
          newHost: game.host,
        });
      }
    }
  });

  User.addHook("afterUpdate", async (user, options) => {
    if (user.changed("appToken") && user.appToken) {
      console.log(`AppToken updated for user ${user.id}`);
      const result = await handleAppTokenUpdate(user.id, user.appToken);
      if (result) {
        io.to(`appToken_${result.appToken}`).emit("appTokenUsed", result);
      }
    }
  });

  global.io = io;
};

const waitForAppToken = async (socket, appToken) => {
  try {
    console.log(`Received appToken: ${appToken}`);
    socket.appToken = appToken;
    socket.join(`appToken_${appToken}`);
    console.log(`Socket ${socket.id} is waiting for appToken ${appToken} to be used`);
  } catch (error) {
    handleError(socket, "waitForAppToken", error);
  }
};

const handleAppTokenUpdate = async (userId, appToken) => {
  try {
    const user = await User.findByPk(userId);
    if (!user) {
      console.log(`User not found: ${userId}`);
      return;
    }

    const activeGame = await Game.findOne({
      where: {
        players: { [Op.like]: `%${userId}%` },
        status: 1,
      },
    });

    if (activeGame) {
      console.log(
        `User ${userId} logged in with appToken ${appToken} and has an active game ${activeGame.id}`
      );
      return {
        gameId: activeGame.id,
        playerId: userId,
        appToken: appToken,
      };
    } else {
      console.log(
        `User ${userId} logged in with appToken ${appToken} but has no active game`
      );
      return {
        playerId: userId,
        appToken: appToken,
      };
    }
  } catch (error) {
    console.error("Error handling app token update:", error);
    return null;
  }
};