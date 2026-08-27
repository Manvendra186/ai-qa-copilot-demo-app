import { Router } from 'express';
import { getCart, getProduct, removeCartItem, upsertCartItem } from '../db.js';
import { requireAuth } from './auth.js';

export function cartRouter(db) {
  const router = Router();

  router.get('/cart', requireAuth(db), (req, res) => {
    res.json(getCart(db, req.session.token));
  });

  router.post('/cart/items', requireAuth(db), (req, res) => {
    const { product_id: productId, qty = 1 } = req.body ?? {};
    if (!Number.isInteger(productId) || !Number.isInteger(qty) || qty < 1) {
      return res.status(400).json({ error: 'product_id (int) and qty (int >= 1) are required' });
    }
    if (!getProduct(db, productId)) {
      return res.status(404).json({ error: 'Product not found' });
    }
    upsertCartItem(db, req.session.token, productId, qty);
    res.json(getCart(db, req.session.token));
  });

  router.delete('/cart/items/:productId', requireAuth(db), (req, res) => {
    const productId = Number(req.params.productId);
    if (!Number.isInteger(productId)) {
      return res.status(400).json({ error: 'productId must be an integer' });
    }
    removeCartItem(db, req.session.token, productId);
    res.json(getCart(db, req.session.token));
  });

  return router;
}
