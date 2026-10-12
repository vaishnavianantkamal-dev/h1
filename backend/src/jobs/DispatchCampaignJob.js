// Port of App\Jobs\DispatchCampaignJob: resolve the audience for a campaign and fan the work out into per-chunk jobs.
//   queue.dispatch('DispatchCampaignJob', { campaignId })
// PHP $tries = 1: never retry (would duplicate pushes) -> errors are logged and swallowed here.
const queue = require('./queue');

/** How many USERS each chunk job handles. */
const CHUNK_SIZE = 500;

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

/**
 * Map a segment to the list of user IDs that have at least one FCM token.
 *   all_customers - every customer-role user | all_workers - every worker-role user | all - customers + workers
 *   single_user - one specific user (target_user_id), only if customer or worker.
 */
async function resolveAudience(segment, targetUserId = null) {
  const { Role, User } = require('../models');
  const { Op, literal } = require('sequelize');

  const customerRole = await Role.findOne({ where: { slug: 'customers' }, attributes: ['id'] });
  const workerRole = await Role.findOne({ where: { slug: 'workers' }, attributes: ['id'] });
  const customerRoleId = customerRole ? customerRole.id : null;
  const workerRoleId = workerRole ? workerRole.id : null;

  // Roles that actually have an app to receive a push.
  const appRoleIds = [customerRoleId, workerRoleId].filter(Boolean);

  if (!appRoleIds.length) {
    console.warn('Campaign audience skipped - customer/worker roles not found');
    return [];
  }

  // users whose id is in (select user_id from user_fcm_tokens)
  const where = { id: { [Op.in]: literal('(SELECT `user_id` FROM `user_fcm_tokens`)') } };

  switch (segment) {
    case 'all_workers':
      where.role_id = workerRoleId;
      break;
    case 'all':
      where.role_id = { [Op.in]: appRoleIds };
      break;
    case 'single_user':
      if (!targetUserId) {
        console.warn('single_user campaign has no target_user_id');
        return [];
      }
      // Only send if the target is a customer or worker (routable).
      where[Op.and] = [{ id: targetUserId }, { role_id: { [Op.in]: appRoleIds } }];
      break;
    case 'all_customers':
    default:
      where.role_id = customerRoleId;
      break;
  }

  const rows = await User.findAll({ where, attributes: ['id'], raw: true });
  return rows.map((r) => r.id);
}

async function handle({ campaignId } = {}) {
  const { NotificationCampaign, UserFcmToken } = require('../models');
  const { Op } = require('sequelize');
  const { dayjs } = require('../utils/time');

  const campaign = await NotificationCampaign.findByPk(campaignId);

  // Only dispatch a campaign that has been explicitly flagged for sending.
  if (!campaign || campaign.status !== 'sending') {
    console.log('Campaign dispatch skipped', { campaign_id: campaignId, status: campaign ? campaign.status : undefined });
    return;
  }

  const userIds = await resolveAudience(campaign.segment, campaign.target_user_id);

  if (!userIds.length) {
    await campaign.update({ status: 'sent', sent_at: dayjs().toDate(), total_recipients: 0 });
    console.log('Campaign had no recipients', { campaign_id: campaign.id });
    return;
  }

  // total_recipients is counted in TOKENS (a user may have several devices)
  const totalTokens = await UserFcmToken.count({ where: { user_id: { [Op.in]: userIds } } });
  await campaign.update({ total_recipients: totalTokens });

  for (const ids of chunk(userIds, CHUNK_SIZE)) {
    await queue.dispatch('SendCampaignChunkJob', { campaignId: campaign.id, userIds: ids });
  }

  console.log('Campaign fanned out', {
    campaign_id: campaign.id,
    user_count: userIds.length,
    token_count: totalTokens,
    chunk_count: Math.ceil(userIds.length / CHUNK_SIZE),
  });
}

queue.register('DispatchCampaignJob', async (payload) => {
  try {
    await handle(payload);
  } catch (e) {
    console.error('DispatchCampaignJob failed (not retried):', e.stack || e.message);
  }
});

module.exports = { handle, resolveAudience, CHUNK_SIZE };
