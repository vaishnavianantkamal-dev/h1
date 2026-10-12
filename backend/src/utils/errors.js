class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

class ValidationError extends HttpError {
  constructor(errors, message) {
    // Laravel: first message + " (and N more error(s))" counted over ALL messages
    const all = Object.values(errors).flat();
    const first = all[0] || 'The given data was invalid.';
    const more = all.length - 1;
    super(422, message || first + (more > 0 ? ` (and ${more} more error${more > 1 ? 's' : ''})` : ''), { errors });
    this.errors = errors;
  }
}

// Laravel abort($status, $message)
const abort = (status, message = '') => {
  throw new HttpError(status, message);
};

module.exports = { HttpError, ValidationError, abort };
