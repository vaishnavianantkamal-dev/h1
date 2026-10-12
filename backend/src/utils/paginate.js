// Laravel-compatible paginator output (current_page, data, per_page, total, last_page, from, to, ...)
//   await paginate(Model, req, { where, include, order, perPage })
//   paginateArray(items, page, perPage, req)
const config = require('../config');

const range = (a, b) => { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; };

// Port of Illuminate\Pagination\UrlWindow (onEachSide = 3) + LengthAwarePaginator::linkCollection()
function pageWindow(current, last) {
  const onEachSide = 3;
  if (last < onEachSide * 2 + 8) return [range(1, last)];
  const win = onEachSide + 4;
  if (current <= win) return [range(1, win + onEachSide), '...', [last - 1, last]];
  if (current > last - win) return [[1, 2], '...', range(last - (win + (onEachSide - 1)), last)];
  return [[1, 2], '...', range(current - onEachSide, current + onEachSide), '...', [last - 1, last]];
}

function linkCollection(current, last, url) {
  const links = [{ url: current > 1 ? url(current - 1) : null, label: '&laquo; Previous', page: current > 1 ? current - 1 : null, active: false }];
  for (const el of pageWindow(current, last)) {
    if (Array.isArray(el)) el.forEach((p) => links.push({ url: url(p), label: String(p), page: p, active: current === p }));
    else links.push({ url: null, label: '...', page: null, active: false });
  }
  links.push({ url: current < last ? url(current + 1) : null, label: 'Next &raquo;', page: current < last ? current + 1 : null, active: false });
  return links;
}

function build(rows, total, page, perPage, req, lastPerPage) {
  const last = Math.max(Math.ceil(total / (lastPerPage || perPage)), 1);
  const base = req ? `${config.appUrl}${req.baseUrl || ''}${req.path || ''}` : '';
  const url = (p) => (req ? `${base}?page=${p}` : null);
  return {
    current_page: page,
    data: rows,
    first_page_url: url(1),
    from: rows.length ? (page - 1) * perPage + 1 : null,
    last_page: last,
    last_page_url: url(last),
    links: linkCollection(page, last, url),
    next_page_url: page < last ? url(page + 1) : null,
    path: base || null,
    per_page: perPage,
    prev_page_url: page > 1 ? url(page - 1) : null,
    to: rows.length ? (page - 1) * perPage + rows.length : null,
    total,
  };
}

// Paginator::resolveCurrentPage: filter_var(FILTER_VALIDATE_INT) and >= 1, otherwise page 1
const laravelPage = (v) => {
  if (v === undefined || v === null) return 1;
  const t = String(v).trim();
  if (!/^[+-]?(0|[1-9]\d*)$/.test(t)) return 1;
  const n = parseInt(t, 10);
  return n >= 1 ? n : 1;
};

async function paginate(Model, req, opts = {}) {
  const { perPage: pp, lastPerPage, ...findOpts } = opts;
  const perPage = Math.max(parseInt(pp ?? req.query.per_page ?? 15, 10) || 15, 1);
  const page = laravelPage(req.query.page);
  const total = await Model.count({
    where: findOpts.where,
    include: findOpts.include,
    distinct: !!findOpts.include,
  });
  const rows = await Model.findAll({ ...findOpts, limit: perPage, offset: (page - 1) * perPage });
  return build(rows, total, page, perPage, req, lastPerPage);
}

function paginateArray(items, page = 1, perPage = 15, req) {
  page = laravelPage(page);
  return build(items.slice((page - 1) * perPage, page * perPage), items.length, page, perPage, req);
}

module.exports = paginate;
module.exports.paginateArray = paginateArray;
module.exports.build = build;
module.exports.laravelPage = laravelPage;
