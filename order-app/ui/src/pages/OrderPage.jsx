import { useEffect, useState } from 'react';
import { fetchMenus, createOrder } from '../api';
import './OrderPage.css';

const OPTION_PRICES = { shot: 500, syrup: 0 };

function calcUnitPrice(menu, options) {
  let price = menu.price;
  if (options.shot) price += OPTION_PRICES.shot;
  if (options.syrup) price += OPTION_PRICES.syrup;
  return price;
}

function optionsLabel(options) {
  const parts = [options.temperature || 'HOT'];
  if (options.shot) parts.push('샷 추가');
  if (options.syrup) parts.push('시럽 추가');
  return parts.join(', ');
}

function cartKey(menuId, options) {
  return `${menuId}-${options.temperature}-${options.shot}-${options.syrup}`;
}

export default function OrderPage() {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cart, setCart] = useState([]);
  const [optionsMap, setOptionsMap] = useState({});

  useEffect(() => {
    loadMenus();
  }, []);

  async function loadMenus() {
    try {
      setLoading(true);
      setError('');
      const data = await fetchMenus();
      setMenus(data);
      const defaults = {};
      data.forEach((m) => {
        defaults[m.id] = { temperature: 'HOT', shot: false, syrup: false };
      });
      setOptionsMap(defaults);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function updateOption(menuId, key, value) {
    setOptionsMap((prev) => ({
      ...prev,
      [menuId]: { ...prev[menuId], [key]: value },
    }));
  }

  function addToCart(menu) {
    const opts = optionsMap[menu.id] || { temperature: 'HOT', shot: false, syrup: false };
    if (menu.stock <= 0) {
      setError(`${menu.name}은(는) 품절입니다.`);
      return;
    }
    const key = cartKey(menu.id, opts);
    const unitPrice = calcUnitPrice(menu, opts);
    setCart((prev) => {
      const existing = prev.find((c) => c.key === key);
      if (existing) {
        if (existing.quantity >= menu.stock) {
          setError(`재고는 ${menu.stock}개까지 주문 가능합니다.`);
          return prev;
        }
        return prev.map((c) =>
          c.key === key ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prev,
        {
          key,
          menuId: menu.id,
          menuName: menu.name,
          options: { ...opts },
          unitPrice,
          quantity: 1,
          maxStock: menu.stock,
        },
      ];
    });
    setError('');
    setSuccess('');
  }

  function changeQty(key, delta) {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.key !== key) return c;
          const next = c.quantity + delta;
          if (next <= 0) return null;
          if (next > c.maxStock) {
            setError(`재고는 ${c.maxStock}개까지 주문 가능합니다.`);
            return c;
          }
          return { ...c, quantity: next };
        })
        .filter(Boolean)
    );
  }

  function removeItem(key) {
    setCart((prev) => prev.filter((c) => c.key !== key));
  }

  const total = cart.reduce((sum, c) => sum + c.unitPrice * c.quantity, 0);

  async function handleOrder() {
    if (cart.length === 0) return;
    try {
      setError('');
      await createOrder(
        cart.map((c) => ({
          menuId: c.menuId,
          menuName: c.menuName,
          quantity: c.quantity,
          options: c.options,
          unitPrice: c.unitPrice,
        }))
      );
      setSuccess('주문이 완료되었습니다! 잠시 후 관리자 화면에서 확인할 수 있습니다.');
      setCart([]);
      await loadMenus();
    } catch (e) {
      setError(e.message);
    }
  }

  if (loading) return <p className="loading">메뉴를 불러오는 중...</p>;

  return (
    <div className="order-page">
      <h2 className="page-title">주문하기</h2>
      <p className="page-desc">원하는 메뉴를 선택하고 장바구니에 담아 주문해 보세요.</p>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="order-layout">
        <section className="menu-section">
          <div className="menu-grid">
            {menus.map((menu) => {
              const opts = optionsMap[menu.id] || {
                temperature: 'HOT',
                shot: false,
                syrup: false,
              };
              const previewPrice = calcUnitPrice(menu, opts);
              const soldOut = menu.stock <= 0;

              return (
                <article key={menu.id} className={`menu-card ${soldOut ? 'sold-out' : ''}`}>
                  <div className="menu-image-wrap">
                    <img
                      src={menu.image_url}
                      alt={menu.name}
                      onError={(e) => {
                        e.target.src = '/images/americano.svg';
                      }}
                    />
                    {soldOut && <span className="sold-badge">품절</span>}
                  </div>
                  <div className="menu-body">
                    <h3>{menu.name}</h3>
                    <p className="menu-desc">{menu.description}</p>
                    <p className="menu-price">{previewPrice.toLocaleString()}원</p>
                    <p className="menu-stock">재고 {menu.stock}개</p>

                    <div className="option-group">
                      <label>온도</label>
                      <div className="option-btns">
                        {['HOT', 'ICE'].map((t) => (
                          <button
                            key={t}
                            type="button"
                            className={`opt-btn ${opts.temperature === t ? 'active' : ''}`}
                            onClick={() => updateOption(menu.id, 'temperature', t)}
                            disabled={soldOut}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="option-checks">
                      <label>
                        <input
                          type="checkbox"
                          checked={opts.shot}
                          onChange={(e) => updateOption(menu.id, 'shot', e.target.checked)}
                          disabled={soldOut}
                        />
                        샷 추가 (+500원)
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={opts.syrup}
                          onChange={(e) => updateOption(menu.id, 'syrup', e.target.checked)}
                          disabled={soldOut}
                        />
                        시럽 추가
                      </label>
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary btn-add"
                      onClick={() => addToCart(menu)}
                      disabled={soldOut}
                    >
                      장바구니에 담기
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="cart-panel">
          <h3>장바구니</h3>
          {cart.length === 0 ? (
            <p className="cart-empty">담은 메뉴가 없습니다.</p>
          ) : (
            <ul className="cart-list">
              {cart.map((item) => (
                <li key={item.key} className="cart-item">
                  <div className="cart-item-info">
                    <strong>{item.menuName}</strong>
                    <span className="cart-options">{optionsLabel(item.options)}</span>
                    <span className="cart-line-price">
                      {(item.unitPrice * item.quantity).toLocaleString()}원
                    </span>
                  </div>
                  <div className="cart-item-actions">
                    <button type="button" className="qty-btn" onClick={() => changeQty(item.key, -1)}>
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button type="button" className="qty-btn" onClick={() => changeQty(item.key, 1)}>
                      +
                    </button>
                    <button type="button" className="remove-btn" onClick={() => removeItem(item.key)}>
                      삭제
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="cart-footer">
            <div className="cart-total">
              <span>총 금액</span>
              <strong>{total.toLocaleString()}원</strong>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-order"
              onClick={handleOrder}
              disabled={cart.length === 0}
            >
              주문하기
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
