const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const adminPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

const dbName = process.env.DB_NAME || 'coffee_order_db';

async function init() {
  const admin = await adminPool.connect();
  try {
    const exists = await admin.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );
    if (exists.rowCount === 0) {
      await admin.query(`CREATE DATABASE ${dbName}`);
      console.log(`Database "${dbName}" created.`);
    } else {
      console.log(`Database "${dbName}" already exists.`);
    }
  } finally {
    admin.release();
    await adminPool.end();
  }

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: dbName,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  });

  const client = await pool.connect();
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schema);

    const count = await client.query('SELECT COUNT(*)::int AS c FROM menus');
    if (count.rows[0].c === 0) {
      await client.query(`
        INSERT INTO menus (name, description, price, image_url, stock) VALUES
        ('아메리카노', '진한 에스프레소에 물을 더한 클래식 커피', 4500, '/images/americano.svg', 20),
        ('카페라떼', '부드러운 우유와 에스프레소의 조화', 5000, '/images/latte.svg', 15),
        ('카푸치노', '풍부한 우유 거품이 올라간 이탈리안 커피', 5000, '/images/cappuccino.svg', 12),
        ('카라멜 마키아토', '달콤한 카라멜 시럽이 들어간 라떼', 5500, '/images/caramel.svg', 10),
        ('바닐라 라떼', '바닐라 향이 가득한 부드러운 라떼', 5500, '/images/vanilla.svg', 10),
        ('콜드브루', '12시간 저온 추출한 깔끔한 커피', 5500, '/images/coldbrew.svg', 8)
      `);
      console.log('Sample menus inserted.');
    }

    console.log('Database schema ready.');
  } finally {
    client.release();
    await pool.end();
  }
}

init().catch((err) => {
  console.error('Init failed:', err.message);
  process.exit(1);
});
