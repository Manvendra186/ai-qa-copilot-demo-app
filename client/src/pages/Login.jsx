import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../api.js';
import { useTestIds } from '../App.jsx';
import { withTestId } from '../testids.js';

export default function Login() {
  const t = useTestIds();
  const navigate = useNavigate();
  const [username, setUsername] = useState('qa');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api('/api/login', { method: 'POST', body: { username, password } });
      setToken(res.token);
      navigate('/products');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page narrow">
      <h1>Sign in</h1>
      <p className="hint">
        Demo user: <code>qa</code> / <code>qa1234</code>
      </p>
      <form onSubmit={onSubmit}>
        <label>
          Username
          <input
            {...withTestId(t, 'loginUsername')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
        </label>
        <label>
          Password
          <input
            {...withTestId(t, 'loginPassword')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        <button type="submit" {...withTestId(t, 'loginSubmit')} disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
