const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const { testConnection } = require('./src/config/database');
const { initializeDatabase } = require('./src/config/init');
const socketService = require('./src/services/socketService');
const app = require('./src/app');

dotenv.config();

app.use(cors());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  }
});

socketService(io);

async function startServer() {
  try {
    await initializeDatabase();

    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Unable to connect to the database. Exiting...');
    }

    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();