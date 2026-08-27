import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatCents } from '../api.js';
import { useTestIds } from '../App.jsx';
import { withTestId } from '../testids.js';

export default function Cart() {
  const t = useTestIds();
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [error, setError] = useState(null);

  const refresh = useCallback(() => {
    api('/api/cart')
      .then(setCart)
      .catch((err) => {
        if (err.status === 401) navigate('/login');
        else setError(err.message);
      });
  }, [navigate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function setQty(item, qty) {
    setError(null);
    try {
      setCart(await api('/api/cart/items', { method: 'POST', body: { product_id: item.product_id, qty } }));
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(item) {
    setError(null);
    try {
      setCart(await api(`/api/cart/items/${item.product_id}`, { method: 'DELETE' }));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="page">
      <h1>Cart</h1>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!cart && !error && <p className="hint">Loading…</p>}
      {cart && cart.items.length === 0 && <p className="hint">Your cart is empty.</p>}
      {cart && cart.items.length > 0 && (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Qty</th>
                <th>Line total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {cart.items.map((item) => (
                <tr key={item.product_id} {...withTestId(t, 'cartLine', [item.product_id])}>
                  <td>{item.name}</td>
                  <td>{formatCents(item.price_cents)}</td>
                  <td>
                    <input
                      className="qty"
                      type="number"
                      min="1"
                      value={item.qty}
                      aria-label={`Quantity for ${item.name}`}
                      onChange={(e) => {
                        const qty = Number(e.target.value);
                        if (Number.isInteger(qty) && qty >= 1) setQty(item, qty);
                      }}
                    />
                  </td>
                  <td>{formatCents(item.line_total_cents)}</td>
                  <td>
                    <button type="button" className="secondary" onClick={() => remove(item)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="total-row" {...withTestId(t, 'cartTotal')}>
                <td colSpan={3}>Total</td>
                <td colSpan={2}>{formatCents(cart.total_cents)}</td>
              </tr>
            </tbody>
          </table>
          <div className="actions">
            <button type="button" {...withTestId(t, 'proceedToCheckout')} onClick={() => navigate('/checkout')}>
              Proceed to checkout
            </button>
          </div>
        </>
      )}
    </main>
  );
}
