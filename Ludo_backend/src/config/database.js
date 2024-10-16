const { Sequelize } = require('sequelize');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function createDatabaseIfNotExists() {
  try {
    // Connect to MySQL without specifying a database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    // Create the database if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME};`);
    
    console.log(`Database ${process.env.DB_NAME} created or already exists.`);
    
    // Close the connection
    await connection.end();
  } catch (error) {
    console.error('Unable to create database:', error);
    throw error;
  }
}

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: 'mysql',
  logging: false, // Set to console.log to see the SQL queries
});

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    return true;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    return false;
  }
}

module.exports = { sequelize, testConnection, createDatabaseIfNotExists };