import { Router } from 'express';
import {
  addOrderItem,
  clearCart,
  createOrder,
  getCart,
  getOrder,
  getOrderItems,
  listOrders,
} from '../db.js';
import { requireAuth } from './auth.js';

// DEFECT_BAD_DATA (test data defect): orders are stored with their line items,
// but the API returns them without items — "orders missing line items".
function serializeOrder(db, orderId, defects) {
  const order = getOrder(db, orderId);
  if (!order) return null;
  const items = defects.bad_data ? [] : getOrderItems(db, orderId);
  return {
    id: order.id,
    created_at: order.created_at,
    total_cents: order.total_cents,
    items,
  };
}

export function ordersRouter(db, defects) {
  const router = Router();

  router.post('/checkout', requireAuth(db), (req, res) => {
    // DEFECT_API_500 (product defect): checkout API returns 500.
    if (defects.api_500) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    const cart = getCart(db, req.session.token);
    if (cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }
    const orderId = createOrder(db, req.session.token, cart.total_cents);
    for (const item of cart.items) addOrderItem(db, orderId, item);
    clearCart(db, req.session.token);
    res.status(201).json(serializeOrder(db, orderId, defects));
  });

  router.get('/orders', requireAuth(db), (req, res) => {
    res.json(listOrders(db, req.session.token));
  });

  router.get('/orders/:id', requireAuth(db), (req, res) => {
    const order = serializeOrder(db, Number(req.params.id), defects);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  });

  return router;
}
