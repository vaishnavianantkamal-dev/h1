// Shared helpers for the time-slot controllers (not a routes file).
const { Op } = require('sequelize');
const { BlockedSlot } = require('../../models');
const { dayjs } = require('../../utils/time');

// Carbon 'g:i A' (no leading zero hour), e.g. "9:00 AM"
const g_i_A = (slotTime) => dayjs(`1970-01-01 ${slotTime}`).format('h:mm A');

// TimeSlot::getDisplayLabelAttribute - label if set, else generated from slot_time
const displayLabel = (slot) => (slot.label ? slot.label : g_i_A(slot.slot_time));

// Blocked slot ids for a date (+ optional category): global blocks + category blocks;
// date match = this specific date OR a permanent (NULL date) block.
async function blockedSlotIds(date, categoryId) {
  const categoryClauses = [{ category_id: null }]; // global blocks always apply
  if (categoryId) categoryClauses.push({ category_id: categoryId }); // + category-specific blocks
  const rows = await BlockedSlot.findAll({
    attributes: ['time_slot_id'],
    where: {
      [Op.and]: [
        { [Op.or]: [{ blocked_date: null }, { blocked_date: date }] },
        { [Op.or]: categoryClauses },
      ],
    },
  });
  return rows.map((r) => Number(r.time_slot_id));
}

module.exports = { g_i_A, displayLabel, blockedSlotIds };
