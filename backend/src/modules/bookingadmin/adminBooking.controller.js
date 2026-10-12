// Port of App\Http\Controllers\Admin\AdminBookingController
const { Op } = require('sequelize');
const { Booking, BookingService, User, Service } = require('../../models');
const queue = require('../../jobs/queue');
const paginate = require('../../utils/paginate');
const validate = require('../../utils/validate');
const { findOrFail } = require('../../utils/binding');
const { dayjs } = require('../../utils/time');
const { jsonContains } = require('./_helpers');

const FMT = 'YYYY-MM-DD HH:mm:ss';
const lazy = (name) => require(`../../services/${name}`);

const bookingFindOrFail = (id, opts) => findOrFail(Booking, id, opts);

const AdminBookingController = {
  // PUT/PATCH /admin/bookings/{booking}
  async update(req, res) {
    const booking = await bookingFindOrFail(req.params.booking);

    const validated = await validate(req, {
      booking_date: ['sometimes', 'date', 'date_format:Y-m-d'],
      time_slot: ['sometimes', 'string', 'max:100'],
      status: ['sometimes', 'in:pending,confirmed,completed,cancelled,inprogress,assigned,reassigned'],
      payment_status: ['sometimes', 'in:unpaid,payment_pending,paid,rejected,refunded'],
      start_date: ['sometimes', 'date', 'date_format:Y-m-d'],
      end_date: ['sometimes', 'date', 'date_format:Y-m-d', 'after_or_equal:start_date'],
    });

    if (!Object.keys(validated).length) {
      return res.status(422).json({ success: false, message: 'No fields to update' });
    }

    const bookingFields = {};
    for (const k of ['booking_date', 'time_slot', 'status', 'payment_status']) {
      if (validated[k] !== undefined) bookingFields[k] = validated[k];
    }
    const has = (k) => bookingFields[k] !== undefined && bookingFields[k] !== null;

    // Snapshot pre-update schedule so we can tell after saving whether this
    // update actually rescheduled the booking (and notify the customer if so).
    const oldBookingDate = booking.booking_date;
    const oldTimeSlot = booking.time_slot;
    const oldPrimaryService = await BookingService.findOne({
      where: { booking_id: booking.id, is_addon: false },
      attributes: ['start_date', 'end_date'],
    });
    const oldStartDate = oldPrimaryService ? oldPrimaryService.start_date : null;
    const oldEndDate = oldPrimaryService ? oldPrimaryService.end_date : null;

    // status inprogress only if it assigned
    if (has('status') && bookingFields.status === 'inprogress') {
      if (!['assigned', 'reassigned'].includes(booking.status)) {
        return res.status(422).json({
          success: false,
          message: 'Booking can only be marked as in-progress if it is assigned or reassigned.',
        });
      }

      // Populate service_started_at / service_end_at same as the OTP start flow,
      // so bookings:end-reminder still fires when an admin moves a booking to inprogress manually.
      if (!booking.service_started_at) {
        const service = await booking.getService();
        const serviceDuration = service && service.duration_minutes ? parseInt(service.duration_minutes, 10) : 60;

        bookingFields.service_started_at = dayjs().format(FMT);
        bookingFields.service_end_at = dayjs().add(serviceDuration, 'minute').format(FMT);
      }
    }

    if (has('status') && bookingFields.status === 'completed') {
      if (!['assigned', 'inprogress', 'reassigned'].includes(booking.status)) {
        return res.status(422).json({
          success: false,
          message: 'Booking can only be marked as completed if it is assigned or in-progress.',
        });
      }
    }

    if (has('status') && bookingFields.status === 'completed') {
      bookingFields.service_ended_at = dayjs().format(FMT);
    }

    if (Object.keys(bookingFields).length) {
      // Capture worker IDs BEFORE update while model is clean
      let snapshot = [...(booking.worker_ids || [])];
      if (booking.worker_id) snapshot.push(booking.worker_id);
      snapshot = [...new Set(snapshot)].filter(Boolean);

      // Capture payment state before update to detect an unpaid -> paid change
      const wasPaidBefore = booking.payment_status === 'paid';

      await booking.update(bookingFields);

      // Payment just became paid -> send invoice on WhatsApp instantly
      if (has('payment_status') && bookingFields.payment_status === 'paid' && !wasPaidBefore) {
        try {
          await queue.dispatchNow('SendInvoiceWhatsAppJob', { bookingId: booking.id });
        } catch (e) {
          console.error('WhatsApp invoice send failed (admin update)', { booking_id: booking.id, error: e.message });
        }
      }

      // Sync worker is_active when status changes
      if (has('status') && snapshot.length) {
        const newStatus = bookingFields.status;
        const workers = await User.findAll({ where: { id: snapshot } });

        for (const worker of workers) {
          if (newStatus === 'inprogress') {
            await worker.update({ is_active: 0 });
          } else if (['completed', 'cancelled'].includes(newStatus)) {
            const stillBusyBookings = await Booking.findAll({
              where: {
                [Op.and]: [
                  { [Op.or]: [{ worker_id: worker.id }, jsonContains('Booking.worker_ids', worker.id)] },
                  { status: 'inprogress' },
                  { id: { [Op.ne]: booking.id } },
                ],
              },
              attributes: ['id', 'status', 'worker_id', 'worker_ids'],
            });

            console.log('Worker reactivation check', {
              worker_id: worker.id,
              booking_id: booking.id,
              stillBusy: stillBusyBookings.length > 0,
              busy_booking_ids: stillBusyBookings.map((b) => b.id),
            });

            if (!stillBusyBookings.length) await worker.update({ is_active: 1 });
          }
        }
      }
    }

    const serviceUpdate = {};
    if (req.has('start_date') || req.has('end_date')) {
      if (req.filled('start_date')) serviceUpdate.start_date = req.input('start_date');
      if (req.filled('end_date')) serviceUpdate.end_date = req.input('end_date');

      if (Object.keys(serviceUpdate).length) {
        await BookingService.update(serviceUpdate, { where: { booking_id: booking.id, is_addon: false } });
      }
    }

    // Notify the customer on WhatsApp if date, time slot, or subscription range changed.
    const bookingDateChanged = has('booking_date') && bookingFields.booking_date !== oldBookingDate;
    const timeSlotChanged = has('time_slot') && bookingFields.time_slot !== oldTimeSlot;
    const startDateChanged = serviceUpdate.start_date !== undefined && serviceUpdate.start_date !== oldStartDate;
    const endDateChanged = serviceUpdate.end_date !== undefined && serviceUpdate.end_date !== oldEndDate;

    if (bookingDateChanged || timeSlotChanged || startDateChanged || endDateChanged) {
      try {
        const newTimeSlot = bookingFields.time_slot ?? oldTimeSlot;
        let newSchedule;

        if (startDateChanged || endDateChanged) {
          const newStartDate = serviceUpdate.start_date ?? oldStartDate;
          const newEndDate = serviceUpdate.end_date ?? oldEndDate;
          newSchedule = newStartDate && newEndDate
            ? `${dayjs(newStartDate).format('DD-MM-YYYY')} to ${dayjs(newEndDate).format('DD-MM-YYYY')}`
            : String(newStartDate ?? newEndDate);
        } else {
          const newBookingDate = bookingFields.booking_date ?? oldBookingDate;
          newSchedule = dayjs(newBookingDate).format('DD-MM-YYYY');
        }

        const svc = await booking.getService();
        await lazy('WhatsAppCloudService').sendBookingRescheduledTemplate(
          String(booking.customer_phone ?? ''),
          String(booking.customer_name ?? ''),
          (svc && svc.name) || 'your service',
          newSchedule,
          String(newTimeSlot ?? ''),
        );
      } catch (e) {
        console.error('WhatsApp reschedule notification failed', { booking_id: booking.id, error: e.message });
      }
    }

    const fresh = await Booking.findByPk(booking.id, {
      include: [
        { model: Service, as: 'service', required: false },
        { model: User, as: 'customer', required: false },
        { model: BookingService, as: 'services', required: false },
      ],
    });

    const workerIds = fresh.worker_ids || [];
    const allWorkers = workerIds.length
      ? await User.findAll({ where: { id: workerIds }, attributes: ['id', 'name', 'phone', 'email', 'is_active', 'is_assigned'] })
      : [];
    const worker = fresh.worker_id ? await fresh.getWorker() : null;

    return res.json({
      success: true,
      message: 'Booking updated successfully',
      data: { ...fresh.toJSON(), worker, all_workers: allWorkers },
    });
  },

  // POST /admin/bookings/{booking}/approve-payment
  async approvePayment(req, res) {
    const booking = await bookingFindOrFail(req.params.booking);

    if (booking.payment_status !== 'verification_pending') {
      return res.status(400).json({ success: false, message: 'Invalid booking state' });
    }

    const now = dayjs().format(FMT);
    await booking.update({
      payment_status: 'paid',
      status: 'confirmed',
      approved_by: req.user.id,
      approved_at: now,
      paid_at: now,
    });

    // Send payment-confirmed invoice instantly on WhatsApp
    try {
      await queue.dispatchNow('SendInvoiceWhatsAppJob', { bookingId: booking.id });
    } catch (e) {
      console.error('WhatsApp invoice send failed (admin approve)', { booking_id: booking.id, error: e.message });
    }

    return res.json({ success: true, message: 'Payment approved successfully' });
  },

  // POST /admin/bookings/{booking}/reject-payment
  async rejectPayment(req, res) {
    const booking = await bookingFindOrFail(req.params.booking);

    if (booking.payment_status !== 'verification_pending') {
      return res.status(400).json({ success: false, message: 'Invalid booking state' });
    }

    await booking.update({
      payment_status: 'rejected',
      status: 'cancelled',
      approved_by: req.user.id,
      approved_at: dayjs().format(FMT),
    });

    return res.json({ success: true, message: 'Payment rejected successfully' });
  },

  // GET /admin/bookings/cancellation-requests
  async cancellationRequests(req, res) {
    const admin = req.user;

    const where = { status: 'cancellation_requested' };
    if (admin.role && admin.role.slug !== 'super-admin') where.city_id = admin.city_id;

    // paginate($request->input('per_page', 15)): a non-integer / negative value is a PHP TypeError / SQL error (500)
    const pp = req.input('per_page', 15);
    if (pp !== 15 && (!/^-?\d+$/.test(String(pp)) || parseInt(pp, 10) < 0)) throw new Error('Invalid per_page');

    const requests = await paginate(Booking, req, {
      where,
      include: [
        { model: User, as: 'customer', required: false },
        { model: Service, as: 'service', required: false },
      ],
      order: [['cancellation_requested_at', 'DESC']],
      perPage: req.input('per_page', 15),
    });

    return res.json({ success: true, data: requests });
  },

  // POST /admin/bookings/{booking}/cancellation/approve
  // The refund itself is processed manually in the Razorpay dashboard - this only records what was decided.
  async approveCancellation(req, res) {
    const booking = await bookingFindOrFail(req.params.booking);

    if (booking.status !== 'cancellation_requested') {
      return res.status(422).json({ success: false, message: 'This booking has no pending cancellation request' });
    }

    const validated = await validate(req, {
      cancellation_deduction_percentage: 'nullable|numeric|min:0|max:100',
      refund_amount: 'nullable|numeric|min:0',
      razorpay_refund_id: 'nullable|string|max:255',
      note: 'nullable|string|max:500',
    });

    let newPaymentStatus = booking.payment_status;
    if (booking.payment_status === 'paid') newPaymentStatus = 'refunded'; // PAYMENT_PAID -> PAYMENT_REFUNDED

    let deductedAmount = null;
    const pct = validated.cancellation_deduction_percentage;
    if (pct !== undefined && pct !== null) {
      deductedAmount = Math.round(parseFloat(booking.amount || 0) * (Number(pct) / 100) * 100) / 100;
    }

    const now = dayjs().format(FMT);
    await booking.update({
      status: 'cancelled',
      payment_status: newPaymentStatus,
      cancelled_at: now,
      cancellation_deduction_percentage: validated.cancellation_deduction_percentage ?? booking.cancellation_deduction_percentage,
      cancellation_deducted_amount: deductedAmount ?? booking.cancellation_deducted_amount,
      refund_amount: validated.refund_amount ?? booking.refund_amount,
      razorpay_refund_id: validated.razorpay_refund_id ?? booking.razorpay_refund_id,
      cancellation_reviewed_by: req.user.id,
      cancellation_reviewed_at: now,
    });

    if (booking.customer_id) {
      try {
        await lazy('FirebaseNotificationService').sendBookingStatusChanged(booking.id, 'cancelled', booking.customer_id);
      } catch (e) {
        console.warn('Cancellation-approved push failed', { booking_id: booking.id, error: e.message });
      }
    }

    await booking.reload();
    return res.json({
      success: true,
      message: 'Cancellation approved',
      data: { id: booking.id, status: booking.status, payment_status: booking.payment_status },
    });
  },

  // POST /admin/bookings/{booking}/cancellation/reject
  // The booking resumes exactly the status it had before the request.
  async rejectCancellation(req, res) {
    const booking = await bookingFindOrFail(req.params.booking);

    if (booking.status !== 'cancellation_requested') {
      return res.status(422).json({ success: false, message: 'This booking has no pending cancellation request' });
    }

    await validate(req, { reason: 'nullable|string|max:500' });

    await booking.update({
      status: booking.cancellation_previous_status || 'pending',
      cancellation_reviewed_by: req.user.id,
      cancellation_reviewed_at: dayjs().format(FMT),
      cancellation_rejection_reason: req.input('reason'),
    });

    if (booking.customer_id) {
      try {
        await lazy('FirebaseNotificationService').sendBookingStatusChanged(booking.id, 'cancellation_rejected', booking.customer_id);
      } catch (e) {
        console.warn('Cancellation-rejected push failed', { booking_id: booking.id, error: e.message });
      }
    }

    await booking.reload();
    return res.json({
      success: true,
      message: 'Cancellation request rejected',
      data: { id: booking.id, status: booking.status },
    });
  },

  // PATCH /bookings/{booking}/status
  async updateStatus(req, res) {
    const booking = await bookingFindOrFail(req.params.booking);

    const validated = await validate(req, {
      status: ['required', 'in:pending,confirmed,inprogress,assigned,completed,cancelled'],
    });

    const oldStatus = booking.status;
    const newStatus = validated.status;

    if (oldStatus === newStatus) {
      return res.status(422).json({ success: false, message: `Booking is already in '${newStatus}' status` });
    }

    const updateData = { status: newStatus };

    if (newStatus === 'completed') updateData.service_ended_at = dayjs().format(FMT);

    // Populate service_started_at / service_end_at same as the OTP start flow.
    if (newStatus === 'inprogress' && !booking.service_started_at) {
      const service = await booking.getService();
      const serviceDuration = service && service.duration_minutes ? parseInt(service.duration_minutes, 10) : 60;

      updateData.service_started_at = dayjs().format(FMT);
      updateData.service_end_at = dayjs().add(serviceDuration, 'minute').format(FMT);
    }

    await booking.update(updateData);

    // Sync worker is_active based on booking status
    let worker = null;
    if (booking.worker_id) {
      worker = await User.findByPk(booking.worker_id);

      if (worker) {
        if (newStatus === 'inprogress') {
          await worker.update({ is_active: 0 });
        } else if (['completed', 'cancelled'].includes(newStatus)) {
          // Reactivate only if no other booking is still inprogress
          const stillBusy = !!(await Booking.findOne({
            where: { worker_id: worker.id, status: 'inprogress', id: { [Op.ne]: booking.id } },
            attributes: ['id'],
          }));
          if (!stillBusy) await worker.update({ is_active: 1 });
        }
      }
    }

    const fresh = await Booking.findByPk(booking.id);
    if (worker) await worker.reload();

    return res.json({
      success: true,
      message: `Booking status updated from '${oldStatus}' to '${newStatus}'`,
      data: {
        booking_id: booking.id,
        old_status: oldStatus,
        new_status: newStatus,
        service_ended_at: fresh.toJSON().service_ended_at, // raw (un-cast) column like Eloquent
        worker_is_active: worker ? !!worker.is_active : null,
      },
    });
  },
};

module.exports = AdminBookingController;
