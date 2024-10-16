const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserGames = sequelize.define('UserGames', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    timestamps: false,
    tableName: 'user_games',
  });
  
  module.exports = UserGames ;