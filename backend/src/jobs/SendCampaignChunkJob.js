// Port of App\Jobs\SendCampaignChunkJob: push one chunk of users' devices and record a receipt per token.
//   queue.dispatch('SendCampaignChunkJob', { campaignId, userIds })
// Customers and workers live on TWO Firebase projects: customer-role tokens -> CustomerFirebaseService,
// worker-role tokens -> FirebaseService. PHP $tries = 1 -> errors are logged and swallowed (never re-sent).
const { QueryTypes } = require('sequelize');
const queue = require('./queue');

/** FCM multicast hard limit - never send more tokens than this per call. */
const FCM_BATCH = 500;

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

/**
 * Send one bucket of tokens through the given Firebase service in batches of 500 and write a per-token log row.
 * tokenUserMap: { token: user_id }. Returns [sentCount, failedCount].
 * The service report is { successCount, failureCount, responses } (responses aligned with the tokens) or null.
 */
async function pushAndLog(service, tokenUserMap, campaign, data) {
  const { NotificationCampaignLog } = require('../models');
  const tokens = Object.keys(tokenUserMap);
  if (!tokens.length) return [0, 0];

  let sent = 0;
  let failed = 0;

  for (const tokenBatch of chunk(tokens, FCM_BATCH)) {
    const report = await service.sendToMultiple(tokenBatch, campaign.title, String(campaign.body ?? ''), data, true, campaign.image_url);

    const failedTokens = {};
    if (report && report.failureCount > 0 && Array.isArray(report.responses)) {
      report.responses.forEach((r, i) => {
        if (r && !r.success && tokenBatch[i] !== undefined) {
          failedTokens[tokenBatch[i]] = (r.error && r.error.message) || 'unknown';
        }
      });
    }

    const logRows = [];
    for (const token of tokenBatch) {
      const isFail = Object.prototype.hasOwnProperty.call(failedTokens, token);
      if (isFail) failed++; else sent++;

      logRows.push({
        campaign_id: campaign.id,
        user_id: tokenUserMap[token] ?? 0,
        fcm_token: token,
        status: isFail ? 'failed' : 'sent',
        error: isFail ? failedTokens[token] : null,
        created_at: new Date(),
      });
    }
    await NotificationCampaignLog.bulkCreate(logRows);
  }

  return [sent, failed];
}

// When every token's outcome is recorded, flip the campaign to `sent`. Whichever chunk finishes last wins.
async function finalizeIfComplete(campaign) {
  if (campaign.status !== 'sending') return;

  if ((campaign.success_count + campaign.failure_count) >= campaign.total_recipients) {
    await campaign.update({ status: 'sent', sent_at: new Date() });
    console.log('Campaign completed', { campaign_id: campaign.id, success: campaign.success_count, failed: campaign.failure_count });
  }
}

async function handle({ campaignId, userIds = [] } = {}) {
  const { NotificationCampaign, Role, sequelize } = require('../models');
  const workerFirebase = require('../services/FirebaseService');
  const customerFirebase = require('../services/CustomerFirebaseService');

  const campaign = await NotificationCampaign.findByPk(campaignId);
  if (!campaign) return;

  const customerRole = await Role.findOne({ where: { slug: 'customers' }, attributes: ['id'] });
  const workerRole = await Role.findOne({ where: { slug: 'workers' }, attributes: ['id'] });
  const customerRoleId = customerRole ? customerRole.id : null;
  const workerRoleId = workerRole ? workerRole.id : null;

  // Pull tokens + the owning user's role so each token can be routed to the correct Firebase project.
  const rows = userIds.length
    ? await sequelize.query(
      'SELECT user_fcm_tokens.fcm_token AS fcm_token, user_fcm_tokens.user_id AS user_id, users.role_id AS role_id ' +
      'FROM user_fcm_tokens INNER JOIN users ON users.id = user_fcm_tokens.user_id ' +
      'WHERE user_fcm_tokens.user_id IN (:ids)',
      { replacements: { ids: userIds }, type: QueryTypes.SELECT },
    )
    : [];

  if (!rows.length) {
    await finalizeIfComplete(campaign);
    return;
  }

  // token => user_id, split per Firebase project.
  const customerTokens = {};
  const workerTokens = {};
  for (const row of rows) {
    if (row.role_id == customerRoleId) customerTokens[row.fcm_token] = row.user_id; // eslint-disable-line eqeqeq
    else if (row.role_id == workerRoleId) workerTokens[row.fcm_token] = row.user_id; // eslint-disable-line eqeqeq
    // Other roles have no app/project - skipped.
  }

  const data = {
    ...(campaign.toJSON().data || {}),
    type: 'campaign',
    campaign_id: String(campaign.id),
    category: String(campaign.category ?? ''),
    // Also carry the image URL in DATA (empty string = text-only campaign).
    image: String(campaign.image_url ?? ''),
  };

  const [custSent, custFailed] = await pushAndLog(customerFirebase, customerTokens, campaign, data);
  const [workerSent, workerFailed] = await pushAndLog(workerFirebase, workerTokens, campaign, data);

  const sent = custSent + workerSent;
  const failed = custFailed + workerFailed;

  // Atomic increments - many chunk jobs update the same campaign in parallel.
  if (sent) await campaign.increment('success_count', { by: sent });
  if (failed) await campaign.increment('failure_count', { by: failed });

  console.log('Campaign chunk sent', {
    campaign_id: campaign.id,
    customers: { sent: custSent, failed: custFailed },
    workers: { sent: workerSent, failed: workerFailed },
  });

  await finalizeIfComplete(await campaign.reload());
}

queue.register('SendCampaignChunkJob', async (payload) => {
  try {
    await handle(payload);
  } catch (e) {
    console.error('SendCampaignChunkJob failed (not retried):', e.stack || e.message);
  }
});

module.exports = { handle, FCM_BATCH };
