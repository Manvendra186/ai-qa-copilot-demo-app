import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatCents } from '../api.js';
import { useTestIds } from '../App.jsx';
import { withTestId } from '../testids.js';

export default function Checkout() {
  const t = useTestIds();
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

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

  async function placeOrder() {
    setBusy(true);
    setError(null);
    try {
      setOrder(await api('/api/checkout', { method: 'POST' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (order) {
    return (
      <main className="page narrow">
        <h1>Order confirmed</h1>
        <div {...withTestId(t, 'orderConfirmation')}>
          <p>
            Order <strong>#{order.id}</strong> placed.
          </p>
          <p>
            {order.items.length} item(s) · Total {formatCents(order.total_cents)}
          </p>
        </div>
        <div className="actions">
          <button type="button" onClick={() => navigate('/products')}>
            Continue shopping
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <h1>Checkout</h1>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!cart && !error && <p className="hint">Loading…</p>}
      {cart && cart.items.length === 0 && (
        <>
          <p className="hint">Your cart is empty — add something first.</p>
          <div className="actions">
            <button type="button" onClick={() => navigate('/products')}>
              Browse products
            </button>
          </div>
        </>
      )}
      {cart && cart.items.length > 0 && (
        <>
          <table className="table">
            <tbody>
              {cart.items.map((item) => (
                <tr key={item.product_id}>
                  <td>
                    {item.name} × {item.qty}
                  </td>
                  <td>{formatCents(item.line_total_cents)}</td>
                </tr>
              ))}
              <tr className="total-row">
                <td>Total</td>
                <td>{formatCents(cart.total_cents)}</td>
              </tr>
            </tbody>
          </table>
          <div className="actions">
            <button type="button" {...withTestId(t, 'placeOrder')} disabled={busy} onClick={placeOrder}>
              {busy ? 'Placing order…' : 'Place order'}
            </button>
          </div>
        </>
      )}
    </main>
  );
}
