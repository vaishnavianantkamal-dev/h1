// Port of App\Http\Controllers\Time\GetTimeController
const { dayjs } = require('../../utils/time');

module.exports = {
  async getAvailableSlots(req, res) {
    const now = dayjs();

    const slots = [
      { label: '9 AM - 12 PM', start: '09:00', end: '12:00' },
      { label: '12 PM - 3 PM', start: '12:00', end: '15:00' },
      { label: '3 PM - 5 PM', start: '15:00', end: '17:00' },
    ];

    const availableSlots = [];

    for (const slot of slots) {
      const [hh, mm] = slot.end.split(':').map(Number);
      const slotEnd = dayjs().startOf('day').hour(hh).minute(mm);

      // Show slot if current time is BEFORE end time
      if (now.isBefore(slotEnd)) availableSlots.push(slot.label);
    }

    res.json(availableSlots);
  },
};
