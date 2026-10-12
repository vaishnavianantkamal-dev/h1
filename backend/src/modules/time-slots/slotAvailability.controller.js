// Port of App\Http\Controllers\Api\SlotAvailabilityController
const { TimeSlot, Service, Setting } = require('../../models');
const { dayjs } = require('../../utils/time');
const { validateEx } = require('../catalog/support');
const { displayLabel, blockedSlotIds } = require('./slot.helpers');

// Minutes before a slot's start time after which it can no longer be booked.
// e.g. 15 => a 10:00 AM slot stops being bookable at 9:45 AM.
const BOOKING_CUTOFF_MINUTES = 15;

module.exports = {
  /**
   * GET /api/slots?date=2025-07-10&category_id=3&service_id=55
   *
   * Returns ALL active slots for the given date, each with an `is_available` flag.
   * A slot is UNAVAILABLE (with `reason`) when: blocked | passed (within cutoff / past, today only) |
   * too_late (service duration would finish after the business closing time).
   * Frontend sends `display_label` as `time_slot` in the booking request.
   */
  async available(req, res) {
    await validateEx(req, {
      date: ['required', 'date_format:Y-m-d'],
      category_id: ['nullable', 'integer', 'exists:service_categories,id'],
      service_id: ['nullable', 'integer', 'exists:services,id'],
    }, {}, async (d) => {
      // after_or_equal:today
      const errors = {};
      if (d.date !== null && d.date !== undefined && d.date !== '') {
        const parsed = dayjs(String(d.date), 'YYYY-MM-DD', true);
        if (!parsed.isValid() || parsed.isBefore(dayjs().startOf('day'))) {
          errors.date = ['The date field must be a date after or equal to today.'];
        }
      }
      return errors;
    });

    const date = req.input('date');
    const categoryId = req.input('category_id') ?? null;

    const slots = await TimeSlot.findAll({
      where: { is_active: true },
      order: [['sort_order', 'ASC'], ['slot_time', 'ASC']],
    });

    if (!slots.length) {
      return res.json({ success: true, date, data: [] });
    }

    // Global blocks + category-specific blocks (if category_id passed).
    const blockedIds = await blockedSlotIds(date, categoryId);

    // Is the requested date today? (app timezone: Asia/Kolkata)
    const now = dayjs();
    const isToday = now.isSame(dayjs(date), 'day');

    // Duration-fit setup: only when a service is passed. Closing time comes from admin settings (fallback 18:00).
    let durationMin = null;
    let closingDateTime = null;
    if (req.filled('service_id')) {
      const service = await Service.findByPk(req.input('service_id'));
      if (service && service.duration_minutes) {
        durationMin = parseInt(service.duration_minutes, 10);
        const closing = await Setting.get('business_closing_time', '18:00');
        closingDateTime = dayjs(`${date} ${closing}`);
      }
    }

    const data = slots.map((slot) => {
      let reason = null;

      const slotStart = dayjs(`${date} ${slot.slot_time}`);

      // Cutoff: a slot becomes unavailable BOOKING_CUTOFF_MINUTES before its start time.
      const cutoff = slotStart.subtract(BOOKING_CUTOFF_MINUTES, 'minute');

      if (blockedIds.includes(Number(slot.id))) {
        reason = 'blocked';
      } else if (isToday && !cutoff.isAfter(now)) {
        reason = 'passed';
      } else if (durationMin !== null && slotStart.add(durationMin, 'minute').isAfter(closingDateTime)) {
        reason = 'too_late';
      }

      return {
        id: slot.id,
        display_label: displayLabel(slot),
        price: slot.price,
        is_available: reason === null,
        reason,
      };
    });

    res.json({
      success: true,
      date,
      category_id: categoryId,
      service_id: req.input('service_id') ?? null,
      data,
    });
  },
};
