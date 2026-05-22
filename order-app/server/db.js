const { Pool } = require('pg');
require('dotenv').config();

const host = process.env.DB_HOST || 'localhost';
const isRemote = host && !['localhost', '127.0.0.1'].includes(host);

const pool = new Pool({
  host,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'coffee_order_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: isRemote ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

module.exports = pool;
