const express = require('express');
const gameController = require('../controllers/gameController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', authMiddleware, gameController.createGame);
router.get('/:id', authMiddleware, gameController.getGame);
router.get('/', authMiddleware, gameController.getGames);

// Add more game-related routes as needed

module.exports = router;