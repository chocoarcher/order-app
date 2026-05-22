const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const USE_JSON = process.env.USE_JSON_DB === 'true';

let store;
let pool;

async function initStore() {
  if (USE_JSON) {
    store = require('./json-store');
    console.log('JSON 파일 저장소 모드로 실행합니다. (PostgreSQL 불필요)');
    return;
  }

  pool = require('./db');
  try {
    await pool.query('SELECT 1');
    store = {
      getMenus: async () => {
        const r = await pool.query(
          'SELECT id, name, description, price, image_url, stock FROM menus ORDER BY id'
        );
        return r.rows;
      },
      updateStock: async (id, body) => {
        const { delta, stock } = body;
        let r;
        if (typeof stock === 'number') {
          r = await pool.query('UPDATE menus SET stock = $1 WHERE id = $2 RETURNING *', [
            Math.max(0, stock),
            id,
          ]);
        } else if (typeof delta === 'number') {
          r = await pool.query(
            'UPDATE menus SET stock = GREATEST(0, stock + $1) WHERE id = $2 RETURNING *',
            [delta, id]
          );
        } else throw new Error('stock 또는 delta가 필요합니다.');
        return r.rowCount ? r.rows[0] : null;
      },
      getOrders: async () => {
        const orders = await pool.query(
          'SELECT id, created_at, status, total_amount FROM orders ORDER BY created_at DESC'
        );
        const items = await pool.query('SELECT * FROM order_items ORDER BY id');
        const byOrder = {};
        for (const row of items.rows) {
          if (!byOrder[row.order_id]) byOrder[row.order_id] = [];
          byOrder[row.order_id].push(row);
        }
        return orders.rows.map((o) => ({ ...o, items: byOrder[o.id] || [] }));
      },
      createOrder: async (items) => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          for (const item of items) {
            const menu = await client.query('SELECT stock, name FROM menus WHERE id = $1', [
              item.menuId,
            ]);
            if (menu.rowCount === 0) throw new Error(`메뉴 ID ${item.menuId} 없음`);
            if (menu.rows[0].stock < item.quantity) {
              throw new Error(`${menu.rows[0].name} 재고가 부족합니다.`);
            }
          }
          let totalAmount = 0;
          const normalized = items.map((item) => {
            const lineTotal = item.unitPrice * item.quantity;
            totalAmount += lineTotal;
            return { ...item, lineTotal };
          });
          const orderResult = await client.query(
            `INSERT INTO orders (status, total_amount) VALUES ('주문 접수', $1) RETURNING *`,
            [totalAmount]
          );
          const order = orderResult.rows[0];
          for (const item of normalized) {
            await client.query(
              `INSERT INTO order_items (order_id, menu_id, menu_name, quantity, options, unit_price, line_total)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [
                order.id,
                item.menuId,
                item.menuName,
                item.quantity,
                JSON.stringify(item.options || {}),
                item.unitPrice,
                item.lineTotal,
              ]
            );
            await client.query('UPDATE menus SET stock = stock - $1 WHERE id = $2', [
              item.quantity,
              item.menuId,
            ]);
          }
          await client.query('COMMIT');
          const itemsResult = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [
            order.id,
          ]);
          return { ...order, items: itemsResult.rows };
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      },
      updateOrderStatus: async (id, status) => {
        const r = await pool.query('UPDATE orders SET status = $1 WHERE id = $2 RETURNING *', [
          status,
          id,
        ]);
        if (!r.rowCount) return null;
        const items = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [id]);
        return { ...r.rows[0], items: items.rows };
      },
    };
    console.log('PostgreSQL 연결 성공');
  } catch (err) {
    console.warn('PostgreSQL 연결 실패, JSON 저장소로 전환:', err.message);
    store = require('./json-store');
  }
}

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        origin.includes('localhost') ||
        origin.includes('onrender.com')
      ) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
  })
);
app.use(express.json());

const STATUS_FLOW = ['주문 접수', '제조 중', '제조 완료'];

app.get('/', (_req, res) => {
  res.json({ message: '커피 주문 앱 API 서버가 실행 중입니다.' });
});

app.get('/api/menus', async (_req, res) => {
  try {
    res.json(await store.getMenus());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '메뉴를 불러오지 못했습니다.' });
  }
});

app.patch('/api/menus/:id/stock', async (req, res) => {
  try {
    const updated = await store.updateStock(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: '메뉴를 찾을 수 없습니다.' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || '재고를 수정하지 못했습니다.' });
  }
});

app.get('/api/orders', async (_req, res) => {
  try {
    res.json(await store.getOrders());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '주문 목록을 불러오지 못했습니다.' });
  }
});

app.post('/api/orders', async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: '주문 항목이 필요합니다.' });
  }
  try {
    const order = await store.createOrder(items);
    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || '주문을 처리하지 못했습니다.' });
  }
});

app.patch('/api/orders/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!STATUS_FLOW.includes(status)) {
    return res.status(400).json({ error: '유효하지 않은 상태입니다.' });
  }
  try {
    const updated = await store.updateOrderStatus(req.params.id, status);
    if (!updated) return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '주문 상태를 변경하지 못했습니다.' });
  }
});

initStore().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
});
