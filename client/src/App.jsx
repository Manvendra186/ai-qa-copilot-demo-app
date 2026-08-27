import { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { api, getToken, setToken } from './api.js';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import Login from './pages/Login.jsx';
import Products from './pages/Products.jsx';
import { makeTestIds } from './testids.js';

const TestIdContext = createContext(makeTestIds(false));

export function useTestIds() {
  return useContext(TestIdContext);
}

function Header() {
  const authed = Boolean(getToken());
  return (
    <header className="site-header">
      <div className="brand">Demo Shop</div>
      <nav>
        <NavLink to="/products">Products</NavLink>
        <NavLink to="/cart">Cart</NavLink>
        {authed ? (
          <button
            type="button"
            className="linklike"
            onClick={() => {
              setToken(null);
              window.location.href = '/login';
            }}
          >
            Sign out
          </button>
        ) : (
          <NavLink to="/login">Sign in</NavLink>
        )}
      </nav>
    </header>
  );
}

export default function App() {
  const [testIds, setTestIds] = useState(null);

  // DEFECT_LOCATOR_DRIFT is applied at runtime from the server config, so a
  // single env flag on the server changes the rendered test-ids.
  useEffect(() => {
    api('/api/config')
      .then((cfg) => setTestIds(makeTestIds(Boolean(cfg && cfg.defects && cfg.defects.locator_drift))))
      .catch(() => setTestIds(makeTestIds(false)));
  }, []);

  if (!testIds) {
    return <div className="boot">Loading…</div>;
  }

  return (
    <TestIdContext.Provider value={testIds}>
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/products" element={<Products />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="*" element={<Navigate to="/products" replace />} />
        </Routes>
      </BrowserRouter>
    </TestIdContext.Provider>
  );
}
