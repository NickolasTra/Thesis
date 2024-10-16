const User = require('../models/user');
const Token = require('../models/token');
const Game = require('../models/game');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

exports.register = async (req, res) => {
  try {
    const { username, name, surname, email, password } = req.body;

    let existingUser = await User.findOne({ where: { username: username } });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    existingUser = await User.findOne({ where: { email: email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      id: uuidv4(),
      username,
      name,
      surname,
      email,
      password: hashedPassword,
    });

    res.status(201).json({ message: 'User created successfully', userId: user.id });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, appToken } = req.body;
    const user = await User.findOne({ where: { email } });
    if (user && await bcrypt.compare(password, user.password)) {
      const accessToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
      const refreshToken = jwt.sign({ userId: user.id }, process.env.REFRESH_SECRET, { expiresIn: '7d' });
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      user.appToken=appToken;
      await user.save();

      await Token.create({
        id: uuidv4(),
        token: refreshToken,
        id_u: user.id,
        expiresAt: expiresAt,
        type: 'refresh'
      });

      res.json({ accessToken, refreshToken, userId: user.id });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const userId = req.params.userId || req.userId;
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] },
      include: Game
    });
    if (user) {
      res.json({
        ...user.toJSON(),
        loses: user.totalGames - user.wins
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { name, surname, email } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing && existing.id !== userId) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const user = await User.findByPk(userId);
    if (user) {
      user.name = name || user.name;
      user.surname = surname || user.surname;
      user.email = email || user.email;
      await user.save();
      
      const updatedUser = user.toJSON();
      delete updatedUser.password;
      
      res.json({ message: 'Profile updated successfully', user: updatedUser });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { currentPassword, newPassword } = req.body;
    const
    user = await User.findByPk(userId);
    if (user && await bcrypt.compare(currentPassword, user.password)) {
      user.password = await bcrypt.hash(newPassword, 10);
      await user.save();
      res.json({ message: 'Password changed successfully' });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  }
  catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    await Token.destroy({ where: { token: refreshToken } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh Token is required' });
  }

  try {
    const tokenDoc = await Token.findOne({ where: { token: refreshToken } });
    if (!tokenDoc) {
      return res.status(403).json({ message: 'Refresh token is not found in the database' });
    }

    jwt.verify(refreshToken, process.env.REFRESH_SECRET, async (err, decoded) => {
      if (err) {
        console.error('JWT verification error:', err);
        return res.status(403).json({ message: 'Refresh token is invalid' });
      }

      const accessToken = jwt.sign(
        { userId: decoded.userId },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      const newExpiryDate = new Date();
      newExpiryDate.setDate(newExpiryDate.getDate() + 7);
      await tokenDoc.update({ expiresAt: newExpiryDate });

      res.json({ accessToken });
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ message: 'Internal server error during token refresh' });
  }
};

exports.setAppToken = async (req, res) => {
  try {
    const userId = req.userId;
    const { appToken } = req.body;
    const
    user = await User.findByPk(userId);
    if (user) {
      user.appToken = appToken;
      await user.save();
      res.json({ message: 'App token set successfully' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  }
  catch (error) {
    res.status(400).json({ message: error.message });
  }
}

exports.getLeaderboard = async (req, res) => {
  try {
    const leaderboard = await User.findAll({
      attributes: ['id', 'username', 'wins', 'totalGames'],
      order: [['wins', 'DESC']],
      limit: 10
    });
    res.json(leaderboard);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};