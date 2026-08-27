import { Router } from 'express';
import { getProduct, listProducts } from '../db.js';

export function productsRouter(db) {
  const router = Router();

  router.get('/products', (req, res) => {
    res.json(listProducts(db));
  });

  router.get('/products/:id', (req, res) => {
    const product = getProduct(db, Number(req.params.id));
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  });

  return router;
}
