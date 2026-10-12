// Port of App\Http\Controllers\Booking\BookingRatingController
const { QueryTypes } = require('sequelize');
const { Booking, BookingRating, User, sequelize } = require('../../models');
const { validate } = require('../../utils/validate');
const paginate = require('../../utils/paginate');
const { firstOrFail } = require('../../utils/binding');

const LATEST = [['created_at', 'DESC']];
const workerInc = () => ({ model: User, as: 'worker', attributes: ['id', 'name'] });
const bookingInc = () => ({ model: Booking, as: 'booking', attributes: ['id'] });
const customerInc = () => ({ model: User, as: 'customer', attributes: ['id', 'name'] });

// validated() keeps a nullable field whenever it is present in the request (even null)
const hasInput = (req, k) => Object.prototype.hasOwnProperty.call({ ...(req.query || {}), ...(req.body || {}) }, k);

const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;

module.exports = {
  async store(req, res) {
    const data = await validate(req, {
      booking_id: 'required|exists:bookings,id',
      rating: 'required|integer|min:1|max:5',
      description: 'nullable|string',
    });

    const booking = await Booking.findOne({
      where: { id: data.booking_id, customer_id: req.user.id, status: 'completed' },
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found or not eligible for rating' });
    }


    // BookingRating::updateOrCreate(['booking_id' => ..], [...])
    const values = {
      worker_id: booking.worker_id,
      customer_id: req.user.id,
      rating: data.rating,
      description: data.description ?? null,
    };
    let rating = await BookingRating.findOne({ where: { booking_id: booking.id } });
    if (rating) await rating.update(values);
    else rating = await BookingRating.create({ booking_id: booking.id, ...values });

    // Eloquent keeps the raw request value on the (unrefreshed) model, e.g. rating "5" stays a string
    const out = rating.toJSON();
    out.rating = data.rating;
    return res.json({ message: 'Rating submitted successfully', rating: out });
  },

  async show(req, res) {
    const rating = await firstOrFail(BookingRating, {
      where: { booking_id: req.params.bookingId, customer_id: req.user.id },
      include: [workerInc(), bookingInc()],
    });

    return res.json({ data: rating });
  },

  async myRatings(req, res) {
    const ratings = await paginate(BookingRating, req, {
      where: { customer_id: req.user.id },
      include: [workerInc(), bookingInc()],
      order: LATEST,
      perPage: 10,
    });

    return res.json(ratings);
  },

  async allRatings(req, res) {
    const ratings = await paginate(BookingRating, req, {
      include: [workerInc(), bookingInc(), customerInc()],
      order: LATEST,
      perPage: 10,
    });

    return res.json(ratings);
  },

  async avgRatings(req, res) {
    const page = paginate.laravelPage(req.query.page);
    const perPage = 10;

    const [countRow] = await sequelize.query(
      'SELECT COUNT(*) AS total FROM (SELECT worker_id FROM booking_ratings GROUP BY worker_id) t',
      { type: QueryTypes.SELECT }
    );
    const rows = await sequelize.query(
      `SELECT worker_id, CAST(ROUND(AVG(rating), 1) AS CHAR) AS average_rating, COUNT(*) AS total_ratings
         FROM booking_ratings GROUP BY worker_id ORDER BY ROUND(AVG(rating), 1) DESC LIMIT :limit OFFSET :offset`,
      { replacements: { limit: perPage, offset: (page - 1) * perPage }, type: QueryTypes.SELECT }
    );

    // with('worker:id,name')
    const ids = [...new Set(rows.map((r) => r.worker_id).filter((v) => v != null))];
    const workers = ids.length ? await User.findAll({ where: { id: ids }, attributes: ['id', 'name'] }) : [];
    const byId = new Map(workers.map((w) => [Number(w.id), w]));
    rows.forEach((r) => { r.worker = byId.get(Number(r.worker_id)) || null; });

    const workersPage = paginate.build(rows, Number(countRow ? countRow.total : 0), page, perPage, req);

    // Overall ratings (all workers combined)
    const [overall] = await sequelize.query(
      'SELECT CAST(ROUND(AVG(rating), 1) AS CHAR) AS overall_average_rating, COUNT(*) AS overall_total_ratings FROM booking_ratings',
      { type: QueryTypes.SELECT }
    );

    return res.json({
      overall: {
        average_rating: (overall && overall.overall_average_rating) ?? 0,
        total_ratings: (overall && overall.overall_total_ratings) ?? 0,
      },
      workers: workersPage,
    });
  },

  async workerRatings(req, res) {
    const workerId = req.params.workerId;

    const ratings = await paginate(BookingRating, req, {
      where: { worker_id: workerId },
      include: [customerInc()],
      order: LATEST,
      perPage: 10,
    });

    // Average + Count
    const [summary] = await sequelize.query(
      'SELECT AVG(rating) AS average_rating, COUNT(id) AS total_ratings FROM booking_ratings WHERE worker_id = :workerId',
      { replacements: { workerId }, type: QueryTypes.SELECT }
    );

    return res.json({
      summary: {
        average_rating: round1(summary && summary.average_rating),
        total_ratings: (summary && summary.total_ratings) ?? 0,
      },
      ratings,
    });
  },

  // All workers this customer has rated, with their ratings and worker details.
  async myWorkerRatingsForCustomer(req, res) {
    const ratings = await BookingRating.findAll({
      where: { customer_id: req.user.id },
      include: [{ model: User, as: 'worker', attributes: ['id', 'name', 'phone'] }],
      order: LATEST,
    });

    const groups = new Map();
    for (const r of ratings) {
      if (!groups.has(r.worker_id)) groups.set(r.worker_id, []);
      groups.get(r.worker_id).push(r);
    }

    const grouped = [...groups.values()].map((items) => {
      const worker = items[0].worker;
      const avg = items.reduce((s, i) => s + Number(i.rating), 0) / items.length;
      return {
        worker: {
          id: worker ? worker.id : null,
          name: worker ? worker.name : null,
          phone: worker ? worker.phone : null,
        },
        summary: { average_rating: round1(avg), total_ratings: items.length },
        ratings: items.map((rating) => ({
          id: rating.id,
          booking_id: rating.booking_id,
          rating: rating.rating,
          description: rating.description,
          created_at: rating.created_at,
        })),
      };
    });

    return res.json({ success: true, count: grouped.length, data: grouped });
  },

  async update(req, res) {
    const data = await validate(req, {
      rating: 'required|integer|min:1|max:5',
      description: 'nullable|string',
    });

    const rating = await firstOrFail(BookingRating, { where: { id: req.params.id, customer_id: req.user.id } });

    const upd = { rating: data.rating };
    if (hasInput(req, 'description')) upd.description = data.description ?? null;
    await rating.update(upd);

    return res.json({ message: 'Rating updated successfully', data: rating });
  },

  async destroy(req, res) {
    const rating = await firstOrFail(BookingRating, { where: { id: req.params.id, customer_id: req.user.id } });

    await rating.destroy();

    return res.json({ message: 'Rating deleted successfully' });
  },
};
