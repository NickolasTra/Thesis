const { sequelize, createDatabaseIfNotExists } = require('../config/database');
const { User, Game, UserGames, Token } = require('../models');

async function initializeDatabase() {
  try {
    await createDatabaseIfNotExists();

    // Sync models with the database
    await sequelize.sync({ alter: true });

    console.log('Database and models synchronized successfully.');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

module.exports = { initializeDatabase };