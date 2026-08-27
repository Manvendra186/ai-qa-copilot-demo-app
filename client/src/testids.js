// data-testid vocabulary for the demo app.
//
// BASE ids are the "known" locators. When DEFECT_LOCATOR_DRIFT is active the
// app renders DRIFTED ids instead — some renamed, some removed entirely —
// which breaks automation written against the BASE ids (automation defect,
// build bible §16/§23).
//
// This module is pure (no React) so it can be verified from Node directly.

const BASE = {
  loginUsername: 'login-username',
  loginPassword: 'login-password',
  loginSubmit: 'login-submit',
  addCart: (id) => `add-to-cart-${id}`,
  cartLine: (id) => `cart-line-${id}`,
  cartTotal: 'cart-total',
  proceedToCheckout: 'proceed-to-checkout',
  placeOrder: 'place-order',
  orderConfirmation: 'order-confirmation',
};

const DRIFTED = {
  loginUsername: 'fld-user',
  loginPassword: 'fld-pass',
  loginSubmit: 'btn-signin',
  addCart: () => null, // removed
  cartLine: (id) => `row-item-${id}`,
  cartTotal: 'sum-amount',
  proceedToCheckout: 'link-billing',
  placeOrder: 'btn-confirm-purchase-v2',
  orderConfirmation: null, // removed
};

export function makeTestIds(locatorDrift = false) {
  return locatorDrift ? DRIFTED : BASE;
}

// Spread helper: <button {...withTestId(t, 'addCart', [id])}>Add</button>
// Renders no data-testid attribute when the id was removed by drift.
export function withTestId(testIds, key, args = []) {
  const entry = testIds[key];
  const value = typeof entry === 'function' ? entry(...args) : entry;
  return value ? { 'data-testid': value } : {};
}
