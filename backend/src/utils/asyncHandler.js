// Wrap async route handlers so rejected promises reach the error middleware.
//   router.get('/x', h(ctrl.method))   -> wraps one function
//   const c = h(controllerObject)      -> wraps every function property of an object
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const h = (target) => {
  if (typeof target === 'function') return wrap(target);
  const out = {};
  for (const k of Object.keys(target)) {
    out[k] = typeof target[k] === 'function' ? wrap(target[k].bind(target)) : target[k];
  }
  return out;
};

module.exports = h;
module.exports.wrap = wrap;
