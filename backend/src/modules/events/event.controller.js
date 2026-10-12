// Port of App\Http\Controllers\EventController (the older commented-out store() is not ported)
const { Event, Role, User, UserFcmToken } = require('../../models');
const validate = require('../../utils/validate');
const { storePublic, deleteUpload, storageUrl } = require('../../utils/storage');
const { dayjs } = require('../../utils/time');

const customerFirebase = () => require('../../services/CustomerFirebaseService');

const imageFile = (req) => {
  if (req.file && req.file.fieldname === 'image') return req.file;
  if (Array.isArray(req.files)) return req.files.find((f) => f.fieldname === 'image');
  if (req.files && req.files.image) return [].concat(req.files.image)[0];
  return undefined;
};

// $image->move(public_path('storage/events'), time() . '_' . $name)  ==> served at /storage/events/<name>
const saveImage = (req) => {
  const image = imageFile(req);
  if (!image) return null;
  const imageName = Math.floor(Date.now() / 1000) + '_' + image.originalname;
  storePublic(image, 'events', imageName);
  return 'events/' + imageName;
};

const eventPayload = (event, imagePath) => ({
  id: event.id,
  event_name: event.event_name,
  date: event.date,
  time: event.time,
  description: event.description,
  image: imagePath ? storageUrl(imagePath) : null,
});

const ctrl = {
  async index(req, res) {
    const rows = await Event.findAll({ order: [['created_at', 'DESC']] });
    const events = rows.map((event) => ({
      id: event.id,
      event_name: event.event_name,
      date: event.date,
      time: event.time,
      description: event.description,
      image: event.image ? storageUrl(event.image) : null,
      created_at: event.created_at,
    }));

    return res.json({ success: true, events });
  },

  async store(req, res) {
    await validate(req, {
      event_name: 'required|string|max:255',
      date: 'required|date',
      time: 'required|date_format:H:i',
      description: 'required|string',
      image: 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
    });

    // Save image directly to public/storage/events
    const imagePath = saveImage(req);

    const event = await Event.create({
      event_name: req.input('event_name'),
      date: req.input('date'),
      time: req.input('time'),
      description: req.input('description'),
      image: imagePath,
    });

    // Get only customer IDs
    const customerRole = await Role.findOne({ where: { slug: 'customers' }, attributes: ['id'] });
    const customerRoleId = customerRole ? customerRole.id : null;

    const customers = await User.findAll({ where: { role_id: customerRoleId, is_active: 1 }, attributes: ['id'] });
    const customerIds = customers.map((u) => u.id);

    // Get FCM tokens only for customers
    const tokenRows = customerIds.length
      ? await UserFcmToken.findAll({ where: { user_id: customerIds }, attributes: ['fcm_token'] })
      : [];
    const fcmTokens = tokenRows.map((r) => r.fcm_token);

    console.log('Sending event notification to customers', {
      event_id: event.id,
      customer_count: customerIds.length,
      token_count: fcmTokens.length,
    });

    // Send notification
    if (fcmTokens.length) {
      await customerFirebase().sendToMultiple(fcmTokens, event.event_name, event.description, {
        type: 'new_event',
        event_id: String(event.id),
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Event created and notification sent to all customers.',
      event: eventPayload(event, imagePath),
    });
  },

  async storeForCustomer(req, res) {
    await validate(req, {
      event_name: 'nullable|string|max:255',
      date: 'nullable|date',
      time: 'nullable|date_format:H:i',
      description: 'nullable|string',
      image: 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
      customer_id: 'nullable|exists:users,id', // specific customer
    });

    // Save image
    const imagePath = saveImage(req);

    // Create event (fallback defaults so missing fields don't hit NOT NULL columns)
    const event = await Event.create({
      event_name: req.input('event_name') ?? 'Untitled Event',
      date: req.input('date') ?? dayjs().format('YYYY-MM-DD'),
      time: req.input('time') ?? dayjs().format('HH:mm'),
      description: req.input('description') ?? '',
      image: imagePath,
    });

    // Verify the given customer_id actually belongs to a customer role
    const customerRole = await Role.findOne({ where: { slug: 'customers' }, attributes: ['id'] });
    const customerRoleId = customerRole ? customerRole.id : null;

    const customerId = req.input('customer_id');
    const customer = customerId === null || customerId === undefined
      ? null
      : await User.findOne({ where: { id: customerId, role_id: customerRoleId, is_active: 1 } });

    if (!customer) {
      return res.status(422).json({
        success: false,
        message: 'The provided ID does not belong to an active customer.',
      });
    }

    // Get FCM tokens for this specific customer only
    const tokenRows = await UserFcmToken.findAll({ where: { user_id: customer.id }, attributes: ['fcm_token'] });
    const fcmTokens = tokenRows.map((r) => r.fcm_token);

    console.log('Sending event notification to specific customer', {
      event_id: event.id,
      customer_id: customer.id,
      token_count: fcmTokens.length,
    });

    // Send notification
    if (fcmTokens.length) {
      await customerFirebase().sendToMultiple(fcmTokens, event.event_name, event.description, {
        type: 'new_event',
        event_id: String(event.id),
        customer_id: String(customer.id),
      });
    } else {
      console.warn('No FCM tokens found for customer', { customer_id: customer.id });
    }

    return res.status(201).json({
      success: true,
      message: 'Event created and notification sent to the specific customer.',
      event: eventPayload(event, imagePath),
      notified_customer: { id: customer.id, name: customer.name, email: customer.email },
    });
  },

  async destroy(req, res) {
    const event = await Event.findByPk(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    // Delete image file if exists (PHP: unlink(public_path($event->image)))
    if (event.image) {
      deleteUpload(event.image);
    }

    await event.destroy();

    return res.json({ success: true, message: 'Event deleted successfully.' });
  },
};

module.exports = ctrl;
