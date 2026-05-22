const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'db.json');

const SEED_MENUS = [
  { id: 1, name: '아메리카노', description: '진한 에스프레소에 물을 더한 클래식 커피', price: 4500, image_url: '/images/americano.svg', stock: 20 },
  { id: 2, name: '카페라떼', description: '부드러운 우유와 에스프레소의 조화', price: 5000, image_url: '/images/latte.svg', stock: 15 },
  { id: 3, name: '카푸치노', description: '풍부한 우유 거품이 올라간 이탈리안 커피', price: 5000, image_url: '/images/cappuccino.svg', stock: 12 },
  { id: 4, name: '카라멜 마키아토', description: '달콤한 카라멜 시럽이 들어간 라떼', price: 5500, image_url: '/images/caramel.svg', stock: 10 },
  { id: 5, name: '바닐라 라떼', description: '바닐라 향이 가득한 부드러운 라떼', price: 5500, image_url: '/images/vanilla.svg', stock: 10 },
  { id: 6, name: '콜드브루', description: '12시간 저온 추출한 깔끔한 커피', price: 5500, image_url: '/images/coldbrew.svg', stock: 8 },
];

function load() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    const data = { menus: SEED_MENUS, orders: [], orderItems: [], nextOrderId: 1, nextItemId: 1 };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return data;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function save(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getMenus() {
  const data = load();
  return [...data.menus].sort((a, b) => a.id - b.id);
}

function updateStock(id, { delta, stock }) {
  const data = load();
  const menu = data.menus.find((m) => m.id === Number(id));
  if (!menu) return null;
  if (typeof stock === 'number') menu.stock = Math.max(0, stock);
  else if (typeof delta === 'number') menu.stock = Math.max(0, menu.stock + delta);
  save(data);
  return { ...menu };
}

function getOrders() {
  const data = load();
  return data.orders
    .slice()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map((o) => ({
      ...o,
      items: data.orderItems.filter((i) => i.order_id === o.id),
    }));
}

function createOrder(items) {
  const data = load();

  for (const item of items) {
    const menu = data.menus.find((m) => m.id === item.menuId);
    if (!menu) throw new Error(`메뉴 ID ${item.menuId} 없음`);
    if (menu.stock < item.quantity) throw new Error(`${menu.name} 재고가 부족합니다.`);
  }

  let totalAmount = 0;
  const normalized = items.map((item) => {
    const lineTotal = item.unitPrice * item.quantity;
    totalAmount += lineTotal;
    return { ...item, lineTotal };
  });

  const order = {
    id: data.nextOrderId++,
    created_at: new Date().toISOString(),
    status: '주문 접수',
    total_amount: totalAmount,
  };
  data.orders.push(order);

  const orderItems = [];
  for (const item of normalized) {
    const row = {
      id: data.nextItemId++,
      order_id: order.id,
      menu_id: item.menuId,
      menu_name: item.menuName,
      quantity: item.quantity,
      options: item.options || {},
      unit_price: item.unitPrice,
      line_total: item.lineTotal,
    };
    data.orderItems.push(row);
    orderItems.push(row);
    const menu = data.menus.find((m) => m.id === item.menuId);
    menu.stock -= item.quantity;
  }

  save(data);
  return { ...order, items: orderItems };
}

function updateOrderStatus(id, status) {
  const data = load();
  const order = data.orders.find((o) => o.id === Number(id));
  if (!order) return null;
  order.status = status;
  save(data);
  return {
    ...order,
    items: data.orderItems.filter((i) => i.order_id === order.id),
  };
}

module.exports = {
  getMenus,
  updateStock,
  getOrders,
  createOrder,
  updateOrderStatus,
};
