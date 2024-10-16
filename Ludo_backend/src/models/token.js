const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./user');

const Token = sequelize.define('Token', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  token: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  id_u: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    },
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('refresh', 'reset'),
    allowNull: false,
    defaultValue: 'refresh',
  }
}, {
  timestamps: true,
  tableName: 'tokens',
  indexes: [
    {
      unique: true,
      fields: ['token']
    },
    {
      fields: ['id_u']
    },
    {
      fields: ['expiresAt']
    }
  ]
});

Token.belongsTo(User, { foreignKey: 'id_u' });

module.exports = Token;