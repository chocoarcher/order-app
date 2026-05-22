// 우선순위: 1) VITE_API_URL (Render 빌드 시)  2) /api-config.json (배포 후 수정 가능)
let API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export async function initApi() {
  if (API_BASE) return API_BASE;

  try {
    const res = await fetch('/api-config.json', { cache: 'no-store' });
    if (res.ok) {
      const cfg = await res.json();
      const url = (cfg.apiUrl || '').trim().replace(/\/$/, '');
      if (url && !url.includes('YOUR-BACKEND')) {
        API_BASE = url;
      }
    }
  } catch {
    /* ignore */
  }
  return API_BASE;
}

export function getApiBase() {
  return API_BASE;
}

export function getApiSetupHint() {
  if (API_BASE) return '';
  return (
    'API 서버 주소가 설정되지 않았습니다. Render Static Site → Environment에 ' +
    'VITE_API_URL을 백엔드 URL로 설정한 뒤 Redeploy 하거나, ' +
    'ui/public/api-config.json 의 apiUrl을 수정해 다시 배포하세요.'
  );
}

async function request(path, options = {}) {
  await initApi();

  if (!API_BASE) {
    throw new Error(getApiSetupHint());
  }

  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `요청에 실패했습니다. (${res.status})`);
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
