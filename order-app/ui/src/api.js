// 로컬: vite proxy 사용 (VITE_API_URL 비움)
// Render: 빌드 시 VITE_API_URL = 백엔드 URL (예: https://xxx.onrender.com)
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || '요청에 실패했습니다.');
  }
  return data;
}

export const fetchMenus = () => request('/api/menus');
export const updateStock = (id, body) =>
  request(`/api/menus/${id}/stock`, { method: 'PATCH', body: JSON.stringify(body) });
export const fetchOrders = () => request('/api/orders');
export const createOrder = (items) =>
  request('/api/orders', { method: 'POST', body: JSON.stringify({ items }) });
export const updateOrderStatus = (id, status) =>
  request(`/api/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
