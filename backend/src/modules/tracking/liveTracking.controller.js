// Port of App\Http\Controllers\LiveTrackingController (HTML pages + polling-based live tracking API)
const axios = require('axios');
const { Booking, User, WorkerLiveTrack } = require('../../models');
const config = require('../../config');
const { dayjs } = require('../../utils/time');
const { validate } = require('../../utils/validate');
const FirebaseNotificationService = require('../../services/FirebaseNotificationService');
const FirebaseService = require('../../services/FirebaseService');

const e = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
const floatOrNull = (v) => (v !== null && v !== undefined ? parseFloat(v) : null);

async function sendWhatsappText(phone, message) {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${config.whatsapp.phoneNumberId}/messages`,
      { messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: message } },
      { headers: { Authorization: `Bearer ${config.whatsapp.accessToken}` }, validateStatus: () => true }
    );
    console.log('WhatsApp text sent', { phone, response: response.data });
    return response.status >= 200 && response.status < 300;
  } catch (err) {
    console.error('WhatsApp text failed', { phone, error: err.message });
    return false;
  }
}

async function sendWhatsappToCustomerAndWorker(bookingId) {
  const booking = await Booking.findByPk(bookingId);
  if (!booking) throw Object.assign(new Error(`No query results for model [App\\Models\\Booking] ${bookingId}`), { status: 404 });
  const worker = booking.worker_id ? await User.findByPk(booking.worker_id) : null;

  // Links
  const customerTrackLink = `${config.appUrl}/track/${bookingId}`;
  const workerTrackLink = `${config.appUrl}/worker/track/${bookingId}`;

  // CUSTOMER - tracking link
  if (booking.customer_phone) {
    await sendWhatsappText(
      booking.customer_phone,
      `🚗 Your worker is on the way!\n\nTrack live location here 👇\n${customerTrackLink}`
    );
  }

  // WORKER - worker tracking page
  if (worker && worker.phone) {
    await sendWhatsappText(
      worker.phone,
      `📍 Please open this link to start live tracking and share your location 👇\n\n${workerTrackLink}`
    );
  }
}

const workerPageHtml = (bookingId) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Live Tracking</title>

    <style>
        body {
            margin: 0;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
            background: #f5f7fb;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
        }

        .card {
            background: #fff;
            width: 100%;
            max-width: 420px;
            padding: 24px;
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0,0,0,.08);
            text-align: center;
        }

        .icon {
            font-size: 48px;
            margin-bottom: 12px;
        }

        h2 {
            margin: 0 0 8px;
            font-size: 22px;
        }

        p {
            color: #666;
            font-size: 14px;
            margin-bottom: 24px;
        }

        .status {
            font-weight: 600;
            margin-bottom: 16px;
            color: #ff9800;
        }

        .status.live {
            color: #2ecc71;
        }

        .btn {
            width: 100%;
            padding: 14px;
            font-size: 16px;
            font-weight: 600;
            border-radius: 12px;
            border: none;
            cursor: pointer;
            background: #2ecc71;
            color: #fff;
            transition: 0.3s;
        }

        .btn:disabled {
            background: #cfd8dc;
            cursor: not-allowed;
        }

        .pulse {
            width: 12px;
            height: 12px;
            background: #2ecc71;
            border-radius: 50%;
            display: inline-block;
            margin-right: 8px;
            animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            100% { transform: scale(2.2); opacity: 0; }
        }
    </style>
</head>
<body>

<div class="card">
    <div class="icon">📍</div>
    <h2>Live Location Sharing</h2>
    <p>Please start live tracking so the customer can see your location.</p>

    <div id="status" class="status">
        Waiting to start tracking
    </div>

    <button id="startBtn" class="btn" onclick="startTracking()">
        Start Live Tracking
    </button>
</div>

<script>
let watchId = null;

function startTracking() {
    if (!navigator.geolocation) {
        alert("GPS not supported on this device");
        return;
    }

    document.getElementById("startBtn").disabled = true;
    document.getElementById("status").innerHTML =
        '<span class="pulse"></span>Live tracking started';
    document.getElementById("status").classList.add("live");

    watchId = navigator.geolocation.watchPosition(
        position => {
            fetch("/api/worker/location", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": ""
                },
                body: JSON.stringify({
                    booking_id: ${e(bookingId)},
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                })
            });
        },
        error => {
            alert("Please allow GPS permission");
            document.getElementById("startBtn").disabled = false;
        },
        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 10000
        }
    );
}
</script>

</body>
</html>
`;

const clientPageHtml = (bookingId) => `<div id="map" style="height:100vh"></div>

<script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyAKycpWAllnNwoMkwNncDOPS_y6KV0kLZY"></script>
<!--<script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyDaHfh25r8B7njmTrzc5mgPLYJFkET8cTY"></script>-->

<script>
let map, marker;

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), { zoom: 15 });
  marker = new google.maps.Marker({ map });

  load();
  setInterval(load, 5000);
}

function load() {
  fetch("/api/track/${e(bookingId)}/latest")
    .then(res => res.json())
    .then(d => {
      if (!d) return;
      let pos = { lat: +d.latitude, lng: +d.longitude };
      marker.setPosition(pos);
      map.setCenter(pos);
    });
}

initMap();
</script>`;

const handlers = {
  // web: GET /worker/track/{booking_id}
  async workerPage(req, res) {
    res.type('html').send(workerPageHtml(req.params.booking_id));
  },

  // web: GET /track/{booking_id}
  async clientPage(req, res) {
    res.type('html').send(clientPageHtml(req.params.booking_id));
  },

  // POST /worker/location, POST /admin/tracking/update
  async updateLocation(req, res) {
    await validate(req, {
      booking_id: 'required|exists:bookings,id',
      latitude: 'required|numeric',
      longitude: 'required|numeric',
    });

    const booking = await Booking.findByPk(req.input('booking_id'));

    // WorkerLiveTrack::updateOrCreate(['booking_id' => ..], [...])
    const values = {
      latitude: req.input('latitude'),
      longitude: req.input('longitude'),
      last_ping_at: new Date(),
    };
    let track = await WorkerLiveTrack.findOne({ where: { booking_id: req.input('booking_id') } });
    if (track) await track.update(values);
    else track = await WorkerLiveTrack.create({ booking_id: req.input('booking_id'), ...values });

    if (!track.whatsapp_sent) {
      await sendWhatsappToCustomerAndWorker(req.input('booking_id'));

      // Send Firebase notification to customer about worker location update
      if (booking && booking.customer_id) {
        await FirebaseNotificationService.sendWorkerLocationUpdate(booking.id, booking.customer_id);
      }

      await track.update({ whatsapp_sent: true });
    }

    return res.json({ status: true, message: 'Location updated successfully' });
  },

  // GET /track/{booking_id}/latest  (returns the model, or an empty 200 body when none)
  async latestLocation(req, res) {
    const row = await WorkerLiveTrack.findOne({ where: { booking_id: req.params.booking_id } });
    if (!row) return res.status(200).send('');
    return res.json(row);
  },

  // Mark worker as reached location (no route registered in Laravel)
  async workerReached(req, res) {
    await validate(req, { booking_id: 'required|exists:bookings,id' });

    const booking = await Booking.findByPk(req.input('booking_id'));

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    await booking.update({ worker_reached_at: new Date() });

    if (booking.customer_id) {
      await FirebaseNotificationService.sendWorkerReached(booking.id, booking.customer_id);
    }

    return res.json({ success: true, message: 'Worker reached location marked successfully' });
  },

  // Mark service as started (no route registered in Laravel)
  async serviceStarted(req, res) {
    await validate(req, { booking_id: 'required|exists:bookings,id' });

    const booking = await Booking.findByPk(req.input('booking_id'));

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    await booking.update({ service_started_at: new Date(), status: 'in_progress' });

    if (booking.customer_id) {
      await FirebaseNotificationService.sendServiceStarted(booking.id, booking.customer_id);
    }

    return res.json({ success: true, message: 'Service started successfully' });
  },

  // Mark service as completed (no route registered in Laravel)
  async serviceCompleted(req, res) {
    await validate(req, { booking_id: 'required|exists:bookings,id' });

    const booking = await Booking.findByPk(req.input('booking_id'));

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    await booking.update({ service_ended_at: new Date(), status: 'completed' });

    if (booking.customer_id) {
      await FirebaseNotificationService.sendBookingCompleted(booking.id, booking.customer_id);
    }

    // Send rating request notification
    if (booking.customer_id) {
      await FirebaseNotificationService.sendRatingRequest(booking.id, booking.customer_id);
    }

    return res.json({ success: true, message: 'Service completed successfully' });
  },

  // GET /track/map_data/{booking_id}
  async mapData(req, res) {
    const booking = await Booking.findByPk(req.params.booking_id);

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    // Latest worker ping for this booking (write side: updateLocation()).
    const workerTrack = await WorkerLiveTrack.findOne({ where: { booking_id: req.params.booking_id } });

    // Worker is "live" if the last ping was within the last 2 minutes (absolute diff).
    let isLive = false;
    if (workerTrack && workerTrack.last_ping_at) {
      isLive = Math.abs(dayjs().diff(dayjs(workerTrack.last_ping_at), 'second')) <= 120;
    }

    return res.json({
      booking_id: booking.id,

      // Fixed destination saved on the booking. May be null if created without coordinates.
      customer: {
        latitude: floatOrNull(booking.latitude),
        longitude: floatOrNull(booking.longitude),
        address: booking.address,
        city: booking.city,
        pincode: booking.pincode,
      },

      // null until the worker app sends its first location ping.
      worker: workerTrack
        ? {
            latitude: parseFloat(workerTrack.latitude),
            longitude: parseFloat(workerTrack.longitude),
            last_ping_at: workerTrack.last_ping_at,
            is_live: isLive,
          }
        : null,
    });
  },
};

// Laravel's LiveTrackingController::__construct(FirebaseNotificationService) runs for EVERY action of this controller and throws when Firebase credentials are missing.
module.exports = Object.fromEntries(
  Object.entries(handlers).map(([name, fn]) => [name, async (req, res, next) => {
    FirebaseService.requireNotificationService();
    return fn(req, res, next);
  }])
);
