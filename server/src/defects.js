// Defect-injection flags (build bible §23, v1.1 spec).
// Each flag maps 1:1 to a failure-taxonomy category (§16):
//   DEFECT_LOCATOR_DRIFT -> automation defect  (renamed/removed UI test-ids)
//   DEFECT_API_500       -> product defect     (checkout API returns 500)
//   DEFECT_FLAKY         -> flaky behavior     (random 300ms-3s API delays)
//   DEFECT_BAD_DATA      -> test data defect   (orders missing line items)

const FALSY = new Set(['0', 'false', 'no', 'off', '']);

function flag(env, name) {
  const raw = env[name];
  if (raw === undefined) return false;
  return !FALSY.has(String(raw).trim().toLowerCase());
}

export function loadDefects(env = process.env) {
  return {
    locator_drift: flag(env, 'DEFECT_LOCATOR_DRIFT'),
    api_500: flag(env, 'DEFECT_API_500'),
    flaky: flag(env, 'DEFECT_FLAKY'),
    bad_data: flag(env, 'DEFECT_BAD_DATA'),
  };
}
