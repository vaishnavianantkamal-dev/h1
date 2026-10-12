// Port of App\Console\Commands\SendCampaign  (php artisan campaign:send {id} --segment= --user= --image=)
// CLI trigger: clones the given library/draft row into a fresh send record and queues DispatchCampaignJob.
//   run({ id, segment, user, image })  -> resolves 0 on success, 1 on failure (like Command::SUCCESS / FAILURE)
const queue = require('../jobs/queue');

const ALLOWED = ['all_customers', 'all_workers', 'all', 'single_user'];

async function run(options = {}) {
  const { NotificationCampaign } = require('../models');
  const { id } = options;

  const source = await NotificationCampaign.findByPk(id);

  if (!source) {
    console.error(`Campaign #${id} not found.`);
    return 1;
  }

  const segment = options.segment || source.segment || 'all_customers';

  if (!ALLOWED.includes(segment)) {
    console.error(`Invalid segment '${segment}'. Allowed: ${ALLOWED.join(', ')}`);
    return 1;
  }

  let targetUserId = null;
  if (segment === 'single_user') {
    targetUserId = parseInt(options.user, 10) || 0;
    if (!targetUserId) {
      console.error('--user=<id> is required when --segment=single_user');
      return 1;
    }
  }

  const imageUrl = options.image || source.image_url;
  if (imageUrl && !String(imageUrl).startsWith('https://')) {
    console.error('--image must be a public https:// URL (FCM requirement).');
    return 1;
  }

  const send = await NotificationCampaign.create({
    category: source.category,
    title: source.title,
    body: source.body,
    image_url: imageUrl || null,
    segment,
    target_user_id: targetUserId,
    data: source.data,
    status: 'sending',
  });

  await queue.dispatch('DispatchCampaignJob', { campaignId: send.id });

  const target = targetUserId ? ` (user #${targetUserId})` : '';
  console.log(`Queued campaign #${send.id} ("${send.title}") for segment '${segment}'${target}.`);
  console.log('Make sure the queue worker is running (it starts with the server).');

  return 0;
}

module.exports = { run };

// node src/commands/sendCampaign.js <id> [--segment=x] [--user=n] [--image=url]
if (require.main === module) {
  const args = process.argv.slice(2);
  const opts = { id: args.find((a) => !a.startsWith('--')) };
  args.filter((a) => a.startsWith('--')).forEach((a) => {
    const [k, ...v] = a.slice(2).split('=');
    opts[k] = v.join('=');
  });
  run(opts).then((code) => process.exit(code)).catch((e) => { console.error(e); process.exit(1); });
}
