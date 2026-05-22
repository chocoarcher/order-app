const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const isRemote =
  process.env.DB_HOST &&
  !['localhost', '127.0.0.1'].includes(process.env.DB_HOST);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: isRemote ? { rejectUnauthorized: false } : false,
});

async function init() {
  const client = await pool.connect();
  try {
    console.log(`Connecting to ${process.env.DB_HOST} / ${process.env.DB_NAME} ...`);

    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schema);
    console.log('Tables created: menus, orders, order_items');

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
      console.log('Sample menus inserted (6 items).');
    } else {
      console.log(`Menus already exist (${count.rows[0].c} rows), skip seed.`);
    }

    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    console.log('Tables in database:', tables.rows.map((r) => r.table_name).join(', '));
    console.log('Render database schema ready.');
  } finally {
    client.release();
    await pool.end();
  }
}

init().catch((err) => {
  console.error('Init failed:', err.message);
  process.exit(1);
});
