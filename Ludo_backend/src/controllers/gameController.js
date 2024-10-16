const Game = require('../models/game');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');

exports.createGame = async (req, res) => {
  try {
    const gameData = {
      ...req.body,
      id: uuidv4(),
    };
    const game = await Game.create(gameData);
    res.status(201).json(game);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getGame = async (req, res) => {
  try {
    const game = await Game.findByPk(req.params.id);
    if (game) {
      res.json(game);
    } else {
      res.status(404).json({ message: 'Game not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getGames = async (req, res) => {
  try {
    const games = await Game.findAll({ 
      where: { 
        status: {
          [Op.or]: [0, 1]
        }
      }
    });
    res.json(games);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};