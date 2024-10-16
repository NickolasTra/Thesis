const { sequelize } = require('../config/database');
const User = require('./user');
const Game = require('./game');
const UserGames = require('./usergames');
const Token = require('./token');

User.belongsToMany(Game, { through: UserGames });
Game.belongsToMany(User, { through: UserGames });

module.exports = { User, Game, UserGames, Token, sequelize };