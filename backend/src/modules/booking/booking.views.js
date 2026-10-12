// Port of resources/views/instant/extend.blade.php
const config = require('../../config');
const { dayjs } = require('../../utils/time');

const e = (v) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
const numberFormat = (n, d = 2) =>
  Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

function extendForm(booking, extensionService, root) {
  if (!booking.service_end_at) throw new Error('Call to a member function format() on null'); // blade would 500
  const endAt = dayjs(booking.service_end_at).format('DD MMM YYYY, hh:mm A');
  // route('instant.extend.submit', $booking->id)
  const action = `${root || config.appUrl}/instant-bookings/${booking.id}/extend`;

  return `<!DOCTYPE html>
<html>
<head>
    <title>Extend Service</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <style>
        body {
            font-family: Arial, sans-serif;
            background: #f4f6f9;
            padding: 20px;
        }
        .card {
            background: #fff;
            padding: 25px;
            border-radius: 10px;
            max-width: 420px;
            margin: auto;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            text-align: center;
        }
        h3 {
            margin-bottom: 15px;
        }
        .info {
            margin: 10px 0;
            font-size: 15px;
        }
        .highlight {
            font-weight: bold;
            color: #28a745;
        }
        button {
            width: 100%;
            padding: 12px;
            background: #28a745;
            color: #fff;
            border: none;
            border-radius: 6px;
            margin-top: 20px;
            font-size: 16px;
            cursor: pointer;
        }
        button:disabled {
            background: #999;
        }
    </style>
</head>
<body>

<div class="card">
    <h3>Extend Your Service</h3>

    <div class="info">
        Current End Time:<br>
        <span class="highlight">
            ${e(endAt)}
        </span>
    </div>

    <div class="info">
        Extension Duration:<br>
        <span class="highlight">
            ${e(extensionService.duration_minutes)} Minutes
        </span>
    </div>
    
    <div class="info">
        Amount Payable:<br>
        <span class="highlight">
            ₹${e(numberFormat(extensionService.price, 2))}
        </span>
    </div>

    <form method="POST" 
          action="${e(action)}"
          onsubmit="disableBtn()">
        <input type="hidden" name="_token" value="" autocomplete="off">
        <button id="extendBtn" type="submit">
            Extend Service & Pay
        </button>
    </form>
</div>

<script>
    function disableBtn() {
        document.getElementById('extendBtn').disabled = true;
        document.getElementById('extendBtn').innerText = "Processing...";
    }
</script>

</body>
</html>`;
}

module.exports = { extendForm, e, numberFormat };
