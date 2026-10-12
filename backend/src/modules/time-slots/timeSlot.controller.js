// Port of App\Http\Controllers\Admin\TimeSlotController
const { Op } = require('sequelize');
const sequelize = require('../../config/db');
const { TimeSlot, BlockedSlot, ServiceCategory, User } = require('../../models');
const { findOrFail } = require('../../utils/binding');
const { abort } = require('../../utils/errors');
const { dayjs } = require('../../utils/time');
const { validateEx, afterOrEqual } = require('../catalog/support');

const ORDERED = [['sort_order', 'ASC'], ['slot_time', 'ASC']];
const ymd = (v) => (v ? dayjs(v).format('YYYY-MM-DD') : null);
const { g_i_A, displayLabel, blockedSlotIds } = require('./slot.helpers');

const formatSlot = (slot) => ({
  id: slot.id,
  slot_time: slot.slot_time,
  display_label: displayLabel(slot),
  label: slot.label,
  price: slot.price,
  sort_order: slot.sort_order,
  is_active: slot.is_active,
  deleted_at: slot.deleted_at ?? null,
});

// `dates` / `time_slot_ids` validations shared by block & unblock
const blockRules = (withReason) => ({
  // Pass `all_days: true` for a PERMANENT block. Otherwise `dates` is required.
  all_days: ['nullable', 'boolean'],
  dates: ['required_without:all_days', 'array', 'min:1'],
  'dates.*': ['required', 'date_format:Y-m-d'],
  time_slot_ids: ['required', 'array', 'min:1'],
  'time_slot_ids.*': ['required', 'integer', 'exists:time_slots,id'],
  category_id: ['nullable', 'integer', 'exists:service_categories,id'],
  ...(withReason ? { reason: ['nullable', 'string', 'max:255'] } : {}),
});
const blockMessages = { 'dates.required': 'The dates field is required when all days is not present.' };

// boolean as stored by Eloquent (raw '0'/'1'/true/false reach the DB; MySQL coerces them)
const bool = (v) => v === true || v === 1 || v === '1';
const truthy = (v) => v !== undefined && v !== null && v !== false && v !== 0 && v !== '0' && v !== '' && v !== 'false';

module.exports = {
  /*  MASTER CRUD  */

  /** GET /admin/time-slots */
  async index(req, res) {
    const opts = { order: ORDERED, where: {} };
    if (req.boolean('with_trashed')) opts.paranoid = false;
    if (req.filled('is_active')) opts.where.is_active = req.boolean('is_active');

    const slots = await TimeSlot.findAll(opts);
    res.json({ success: true, data: slots.map(formatSlot) });
  },

  /** POST /admin/time-slots */
  async store(req, res) {
    const v = await validateEx(req, {
      slot_time: ['required', 'date_format:H:i', 'unique:time_slots,slot_time'],
      label: ['nullable', 'string', 'max:100'],
      price: ['nullable', 'numeric', 'min:0'],
      sort_order: ['nullable', 'integer', 'min:0'],
      is_active: ['nullable', 'boolean'],
    });

    const slot = await TimeSlot.create({
      slot_time: v.slot_time + ':00',
      label: v.label ?? null,
      price: v.price ?? null,
      sort_order: v.sort_order ?? 0,
      is_active: v.is_active == null ? true : bool(v.is_active),
    });

    res.status(201).json({ success: true, message: 'Time slot created.', data: formatSlot(slot) });
  },

  /** POST /admin/time-slots/bulk */
  async bulkStore(req, res) {
    const v = await validateEx(req, {
      slots: ['required', 'array', 'min:1'],
      'slots.*.slot_time': ['required', 'date_format:H:i'],
      'slots.*.label': ['nullable', 'string', 'max:100'],
      'slots.*.price': ['nullable', 'numeric', 'min:0'],
      'slots.*.sort_order': ['nullable', 'integer', 'min:0'],
      'slots.*.is_active': ['nullable', 'boolean'],
    });

    let inserted = 0;
    let skipped = 0;
    const created = [];

    await sequelize.transaction(async (t) => {
      for (const [index, row] of v.slots.entries()) {
        const slotTime = row.slot_time + ':00';

        const exists = await TimeSlot.count({ where: { slot_time: slotTime }, transaction: t });
        if (exists) {
          skipped += 1;
          continue;
        }

        const slot = await TimeSlot.create({
          slot_time: slotTime,
          label: row.label ?? null,
          price: row.price ?? null,
          sort_order: row.sort_order ?? index,
          is_active: row.is_active == null ? true : bool(row.is_active),
        }, { transaction: t });

        created.push(formatSlot(slot));
        inserted += 1;
      }
    });

    res.status(201).json({
      success: true,
      message: `${inserted} slot(s) created, ${skipped} duplicate(s) skipped.`,
      inserted,
      skipped,
      data: created,
    });
  },

  /** GET /admin/time-slots/{id} */
  async show(req, res) {
    const slot = await findOrFail(TimeSlot, req.params.id, { paranoid: false });
    res.json({ success: true, data: formatSlot(slot) });
  },

  /** PUT /admin/time-slots/{id} */
  async update(req, res) {
    const id = req.params.id;
    const slot = await findOrFail(TimeSlot, id);

    const v = await validateEx(req, {
      slot_time: ['sometimes', 'date_format:H:i', 'unique:time_slots,slot_time,' + id],
      label: ['sometimes', 'nullable', 'string', 'max:100'],
      price: ['sometimes', 'nullable', 'numeric', 'min:0'],
      sort_order: ['sometimes', 'integer', 'min:0'],
      is_active: ['sometimes', 'boolean'],
    });

    if (v.slot_time !== undefined && v.slot_time !== null) v.slot_time += ':00';

    if (v.is_active !== undefined && v.is_active !== null) v.is_active = bool(v.is_active);
    await slot.update(v);

    res.json({
      success: true,
      message: 'Time slot updated.',
      data: formatSlot(await TimeSlot.findByPk(slot.id)),
    });
  },

  /** DELETE /admin/time-slots/{id} */
  async destroy(req, res) {
    const slot = await findOrFail(TimeSlot, req.params.id);
    await slot.destroy();
    res.json({ success: true, message: 'Time slot deleted.' });
  },

  /** PATCH /admin/time-slots/{id}/restore */
  async restore(req, res) {
    const slot = await TimeSlot.findOne({
      where: { id: req.params.id, deleted_at: { [Op.ne]: null } },
      paranoid: false,
    });
    if (!slot) abort(404, `No query results for model [App\\Models\\TimeSlot] ${req.params.id}`);
    await slot.restore();

    res.json({ success: true, message: 'Time slot restored.', data: formatSlot(slot) });
  },

  /*  BLOCK / UNBLOCK  */

  /** POST /admin/time-slots/block - block slots globally or for a specific category. */
  async blockSlots(req, res) {
    const validated = await validateEx(req, blockRules(true), blockMessages);

    const adminId = req.user ? req.user.id : null;
    const reason = validated.reason ?? null;
    const categoryId = validated.category_id ?? null;
    const allDays = truthy(validated.all_days);
    const slotIds = [...new Set(validated.time_slot_ids.map(Number))];

    // Permanent block = one row per slot with blocked_date = NULL.
    // Single-day block = one row per (date, slot).
    const dates = allDays ? [null] : [...new Set(validated.dates)];

    let inserted = 0;
    let skipped = 0;

    await sequelize.transaction(async (t) => {
      // Fetch existing blocks in bulk to avoid N+1
      const where = { time_slot_id: { [Op.in]: slotIds } };
      if (allDays) where.blocked_date = null;
      else where.blocked_date = { [Op.in]: dates };
      where.category_id = categoryId || null;

      const existing = new Set((await BlockedSlot.findAll({ where, transaction: t }))
        .map((b) => `${b.blocked_date ? ymd(b.blocked_date) : 'all'}_${b.time_slot_id}`));

      const rows = [];
      for (const date of dates) {
        for (const slotId of slotIds) {
          const key = `${date ?? 'all'}_${slotId}`;
          if (existing.has(key)) {
            skipped += 1;
            continue;
          }
          rows.push({
            blocked_date: date,
            time_slot_id: slotId,
            category_id: categoryId,
            reason,
            blocked_by: adminId,
          });
          inserted += 1;
        }
      }

      if (rows.length) await BlockedSlot.bulkCreate(rows, { transaction: t });
    });

    const scope = allDays ? 'permanently' : 'for the given date(s)';

    res.json({
      success: true,
      message: `${inserted} slot(s) blocked ${scope}, ${skipped} already blocked.`,
      inserted,
      skipped,
    });
  },

  /** POST /admin/time-slots/unblock */
  async unblockSlots(req, res) {
    const validated = await validateEx(req, blockRules(false), blockMessages);

    const allDays = truthy(validated.all_days);

    const where = { time_slot_id: { [Op.in]: validated.time_slot_ids } };
    if (allDays) where.blocked_date = null;
    else where.blocked_date = { [Op.in]: validated.dates };

    where.category_id = validated.category_id ? validated.category_id : null;

    const deleted = await BlockedSlot.destroy({ where });

    res.json({ success: true, message: `${deleted} slot(s) unblocked.`, deleted });
  },

  /** GET /admin/time-slots/blocked  (query: date, from_date, to_date, time_slot_id, category_id) */
  async blockedList(req, res) {
    await validateEx(req, {
      date: ['nullable', 'date_format:Y-m-d'],
      from_date: ['nullable', 'date_format:Y-m-d'],
      to_date: ['nullable', 'date_format:Y-m-d'],
      time_slot_id: ['nullable', 'integer', 'exists:time_slots,id'],
      category_id: ['nullable', 'integer', 'exists:service_categories,id'],
    }, {}, async (d) => {
      const errors = {};
      afterOrEqual(d, 'to_date', 'from_date', errors);
      return errors;
    });

    // A permanent (NULL date) block applies to every date, so it is included alongside any date / range filter.
    const and = [];
    if (req.filled('date')) and.push({ [Op.or]: [{ blocked_date: null }, { blocked_date: req.input('date') }] });
    if (req.filled('from_date')) and.push({ [Op.or]: [{ blocked_date: null }, { blocked_date: { [Op.gte]: req.input('from_date') } }] });
    if (req.filled('to_date')) and.push({ [Op.or]: [{ blocked_date: null }, { blocked_date: { [Op.lte]: req.input('to_date') } }] });

    const where = {};
    if (and.length) where[Op.and] = and;
    if (req.filled('time_slot_id')) where.time_slot_id = req.input('time_slot_id');
    if (req.filled('category_id')) where.category_id = req.input('category_id');

    const blocks = await BlockedSlot.findAll({
      where,
      include: [
        { model: TimeSlot, as: 'timeSlot', attributes: ['id', 'slot_time', 'label'], required: false },
        { model: ServiceCategory, as: 'category', attributes: ['id', 'name'], required: false },
        { model: User, as: 'blockedByUser', attributes: ['id', 'name'], required: false },
      ],
      order: [['blocked_date', 'ASC'], ['time_slot_id', 'ASC']],
    });

    const data = blocks.map((b) => ({
      id: b.id,
      blocked_date: ymd(b.blocked_date), // null = permanent
      scope: b.blocked_date ? 'single_day' : 'all_days',
      time_slot_id: b.time_slot_id,
      slot_time: b.timeSlot ? b.timeSlot.slot_time : null,
      slot_label: b.timeSlot ? (b.timeSlot.label ?? g_i_A(b.timeSlot.slot_time)) : null,
      category_id: b.category_id,
      category_name: b.category ? b.category.name : 'All Categories',
      reason: b.reason,
      blocked_by: b.blockedByUser ? b.blockedByUser.name : null,
      created_at: b.created_at,
    }));

    res.json({ success: true, data });
  },

  /**
   * GET /time-slots/status?date=2025-07-10&category_id=3
   * Returns ALL active slots with is_blocked flag for a given date.
   */
  async slotStatus(req, res) {
    await validateEx(req, {
      date: ['required', 'date_format:Y-m-d'],
      category_id: ['nullable', 'integer', 'exists:service_categories,id'],
    });

    const date = req.input('date');
    const categoryId = req.input('category_id') ?? null;

    const slots = await TimeSlot.findAll({ where: { is_active: true }, order: ORDERED });
    const blockedIds = await blockedSlotIds(date, categoryId);

    const data = slots.map((slot) => ({
      id: slot.id,
      slot_time: slot.slot_time,
      display_label: displayLabel(slot),
      price: slot.price,
      is_blocked: blockedIds.includes(Number(slot.id)),
    }));

    res.json({ success: true, date, category_id: categoryId, data });
  },
};

