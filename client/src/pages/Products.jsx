import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatCents } from '../api.js';
import { useTestIds } from '../App.jsx';
import { withTestId } from '../testids.js';

export default function Products() {
  const t = useTestIds();
  const navigate = useNavigate();
  const [products, setProducts] = useState(null);
  const [error, setError] = useState(null);
  const [added, setAdded] = useState(null);

  useEffect(() => {
    api('/api/products')
      .then(setProducts)
      .catch((err) => setError(err.message));
  }, []);

  async function addToCart(product) {
    setAdded(null);
    setError(null);
    try {
      await api('/api/cart/items', { method: 'POST', body: { product_id: product.id, qty: 1 } });
      setAdded(product.name);
    } catch (err) {
      if (err.status === 401) {
        navigate('/login');
        return;
      }
      setError(err.message);
    }
  }

  return (
    <main className="page">
      <h1>Products</h1>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {added && <p className="ok">{added} added to cart.</p>}
      {!products && !error && <p className="hint">Loading…</p>}
      {products && (
        <div className="grid">
          {products.map((p) => (
            <article key={p.id} className="card" aria-label={p.name}>
              <h3>{p.name}</h3>
              <p className="desc">{p.description}</p>
              <div className="price">{formatCents(p.price_cents)}</div>
              <div className="stock">{p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}</div>
              <button
                type="button"
                {...withTestId(t, 'addCart', [p.id])}
                disabled={p.stock === 0}
                onClick={() => addToCart(p)}
              >
                Add to cart
              </button>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
