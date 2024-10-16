const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Game = sequelize.define('game', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  status: {
    type: DataTypes.INTEGER,
    defaultValue: 0, // 0: waiting, 1: in progress, 2: finished
  },
  players: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  currentPlayer: {
    type: DataTypes.STRING,
  },
  pieces: {
    type: DataTypes.TEXT,
    defaultValue: '{}',
    get() {
      const rawValue = this.getDataValue('pieces');
      return rawValue ? JSON.parse(rawValue) : {};
    },
    set(value) {
      this.setDataValue('pieces', JSON.stringify(value));
    }
  },
  diceValue: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  host: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  maxPlayers: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 4,
  },
  botCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
}, {
  timestamps: true,
});

module.exports = Game;