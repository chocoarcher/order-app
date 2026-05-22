import { useEffect, useState, useCallback } from 'react';
import { fetchMenus, fetchOrders, updateStock, updateOrderStatus } from '../api';
import './AdminPage.css';

const STATUS_FLOW = ['주문 접수', '제조 중', '제조 완료'];

function nextStatus(current) {
  const idx = STATUS_FLOW.indexOf(current);
  if (idx < 0 || idx >= STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[idx + 1];
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function optionsText(options) {
  if (!options || typeof options !== 'object') return '';
  const parts = [];
  if (options.temperature) parts.push(options.temperature);
  if (options.shot) parts.push('샷');
  if (options.syrup) parts.push('시럽');
  return parts.length ? ` (${parts.join(', ')})` : '';
}

export default function AdminPage() {
  const [menus, setMenus] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAll = useCallback(async () => {
    try {
      setError('');
      const [menuData, orderData] = await Promise.all([fetchMenus(), fetchOrders()]);
      setMenus(menuData);
      setOrders(orderData);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    const timer = setInterval(loadAll, 5000);
    return () => clearInterval(timer);
  }, [loadAll]);

  async function handleStock(id, delta) {
    try {
      const updated = await updateStock(id, { delta });
      setMenus((prev) => prev.map((m) => (m.id === id ? updated : m)));
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleStatus(order) {
    const next = nextStatus(order.status);
    if (!next) return;
    try {
      const updated = await updateOrderStatus(order.id, next);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
    } catch (e) {
      setError(e.message);
    }
  }

  const pendingCount = orders.filter((o) => o.status !== '제조 완료').length;

  if (loading) return <p className="loading">관리자 데이터를 불러오는 중...</p>;

  return (
    <div className="admin-page">
      <h2 className="page-title">관리자</h2>
      <p className="page-desc">
        재고와 주문을 관리합니다. 진행 중 주문 {pendingCount}건
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      <section className="admin-section">
        <h3>재고 현황</h3>
        <div className="stock-grid">
          {menus.map((menu) => {
            const low = menu.stock <= 5;
            const out = menu.stock === 0;
            return (
              <div
                key={menu.id}
                className={`stock-card ${low ? 'low' : ''} ${out ? 'out' : ''}`}
              >
                <img
                  src={menu.image_url}
                  alt=""
                  onError={(e) => {
                    e.target.src = '/images/americano.svg';
                  }}
                />
                <div>
                  <strong>{menu.name}</strong>
                  <p className={`stock-count ${out ? 'out' : low ? 'low' : ''}`}>
                    {menu.stock}개
                    {out && ' · 품절'}
                    {!out && low && ' · 재고 부족'}
                  </p>
                </div>
                <div className="stock-actions">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => handleStock(menu.id, -1)}
                  >
                    −
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => handleStock(menu.id, 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="admin-section">
        <h3>주문 현황</h3>
        {orders.length === 0 ? (
          <p className="empty">아직 주문이 없습니다.</p>
        ) : (
          <ul className="order-list">
            {orders.map((order) => {
              const next = nextStatus(order.status);
              const isDone = order.status === '제조 완료';

              return (
                <li key={order.id} className={`order-card status-${order.status}`}>
                  <div className="order-header">
                    <span className="order-time">{formatDate(order.created_at)}</span>
                    <span className={`status-badge ${isDone ? 'done' : ''}`}>
                      {order.status}
                    </span>
                  </div>
                  <ul className="order-items">
                    {(order.items || []).map((item) => (
                      <li key={item.id}>
                        {item.menu_name}
                        {optionsText(
                          typeof item.options === 'string'
                            ? JSON.parse(item.options)
                            : item.options
                        )}{' '}
                        × {item.quantity} — {item.line_total.toLocaleString()}원
                      </li>
                    ))}
                  </ul>
                  <div className="order-footer">
                    <strong>{order.total_amount.toLocaleString()}원</strong>
                    {isDone ? (
                      <button type="button" className="btn btn-status done" disabled>
                        제조 완료
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-status"
                        onClick={() => handleStatus(order)}
                      >
                        {next === '제조 중' ? '제조 시작' : next}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
