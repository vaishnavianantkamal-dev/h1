// Port of App\Http\Controllers\Admin\SubscriptionTypeController
const { SubscriptionType } = require('../../models');
const CacheService = require('../../services/CacheService');
const { findOrFail } = require('../../utils/binding');
const { validateEx, pick, inMemory } = require('./support');

const rules = { name: 'required|string|max:255' };

module.exports = {
  async index(req, res) {
    res.json(await SubscriptionType.findAll());
  },

  async store(req, res) {
    const assigned = pick(await validateEx(req, rules), ['name']);
    const type = await SubscriptionType.create(assigned);
    CacheService.forgetSubscriptionTypes();
    res.status(201).json(inMemory('SubscriptionType', {}, assigned, type));
  },

  async update(req, res) {
    const subscriptionType = await findOrFail(SubscriptionType, req.params.subscription_type);
    await subscriptionType.update(pick(await validateEx(req, rules), ['name']));
    CacheService.forgetSubscriptionTypes();
    res.json({ message: 'Subscription updated' });
  },

  async destroy(req, res) {
    const subscriptionType = await findOrFail(SubscriptionType, req.params.subscription_type);
    await subscriptionType.destroy();
    CacheService.forgetSubscriptionTypes();
    res.json({ message: 'Subscription deleted' });
  },
};
