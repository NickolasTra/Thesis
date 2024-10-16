const jwt = require('jsonwebtoken');
const { TokenExpiredError } = jwt;

module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err instanceof TokenExpiredError) {
        return res.status(401).json({ message: 'Token expired', expired: true });
      }
      console.error('JWT verification error:', err);
      return res.status(403).json({ message: 'Failed to authenticate token' });
    }
    req.userId = decoded.userId;
    next();
  });
};