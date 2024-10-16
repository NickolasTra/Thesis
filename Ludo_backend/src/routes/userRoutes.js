const express = require('express');
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/refresh-token', userController.refreshToken);
router.post('/logout', userController.logout);
router.get('/leaderboard', userController.getLeaderboard);
router.get('/profile/:userId', authMiddleware, userController.getProfile);
router.put('/profile/:userId', authMiddleware, userController.updateProfile);
router.post('/change-password/:userId', userController.changePassword);
router.post('/set-app-token', authMiddleware, userController.setAppToken);

module.exports = router;