// Port of App\Http\Controllers\Admin\CampaignController
// Admin CRUD + send for marketing campaigns. A "library" row (status = draft) is a reusable message template;
// send() CLONES it into a fresh record (status = sending -> sent) and queues DispatchCampaignJob.
const { NotificationCampaign } = require('../../models');
const validate = require('../../utils/validate');
const queue = require('../../jobs/queue');
const { findOrFail } = require('../../utils/binding');
const { ValidationError } = require('../../utils/errors');
const { storePublic, deletePublic, storageUrl } = require('../../utils/storage');

// PHP empty(): null, '', '0', 0, false, [] are all "empty"
const isEmpty = (v) => v === undefined || v === null || v === '' || v === '0' || v === 0 || v === false || (Array.isArray(v) && !v.length);


/** Fields shared by store()/update() - every one of them is optional. */
const CONTENT_RULES = {
  category: ['sometimes', 'nullable', 'string', 'max:100'],
  title: ['sometimes', 'nullable', 'string', 'max:255'],
  body: ['sometimes', 'nullable', 'string'],
  // Two ways to attach an image - pick at most one:
  image_url: ['sometimes', 'nullable', 'url', 'starts_with:https://,http://', 'max:1024'],
  image: ['sometimes', 'nullable', 'image', 'mimes:jpeg,jpg,png,webp', 'max:2048'],
  segment: ['sometimes', 'nullable', 'in:all_customers,all_workers,all,single_user'],
  target_user_id: ['sometimes', 'nullable', 'integer', 'exists:users,id'],
  data: ['sometimes', 'nullable', 'array'],
};

const imageFile = (req) => {
  if (req.file && req.file.fieldname === 'image') return req.file;
  if (Array.isArray(req.files)) return req.files.find((f) => f.fieldname === 'image');
  if (req.files && req.files.image) return [].concat(req.files.image)[0];
  return undefined;
};

// Laravel's validated() keeps keys that were present but null (nullable). The shared validator skips them,
// so add them back to keep array_key_exists() semantics.
const withPresentKeys = (req, validated, keys) => {
  const out = { ...validated };
  for (const k of keys) {
    if (!(k in out) && req.has(k) && k !== 'image') out[k] = req.input(k);
  }
  return out;
};

// Shared validation for store()/update() - every field optional.
async function validateContent(req, requireTitleOrBody) {
  let validated = await validate(req, CONTENT_RULES);
  validated = withPresentKeys(req, validated, Object.keys(CONTENT_RULES));

  if (requireTitleOrBody && isEmpty(validated.title) && isEmpty(validated.body)) {
    throw new ValidationError({ title: ['Provide at least a title or a body.'] });
  }
  return validated;
}

/**
 * Resolve the image value to STORE (raw, not the accessor-resolved URL):
 *   - an uploaded file wins if present -> stored, relative path returned
 *   - else a pasted image_url wins if present -> returned as-is
 *   - else the existing raw value is kept unchanged
 */
function resolveImage(req, validated, existingRaw) {
  const file = imageFile(req);
  if (file) return storePublic(file, 'campaigns');
  if (!isEmpty(validated.image_url)) return validated.image_url;
  return existingRaw ?? null;
}

const raw = (campaign) => campaign.getDataValue('image_url');
// Eloquent 'data' => 'array' cast: the DB column comes back as a JSON string from Sequelize, so parse it
const dataOf = (campaign) => campaign.toJSON().data;

const ctrl = {
  // List the message library (optionally filtered by ?category=&status=&is_active=).
  async index(req, res) {
    const where = {};
    if (req.filled('category')) where.category = req.input('category');
    if (req.filled('status')) where.status = req.input('status');
    if (req.has('is_active')) where.is_active = req.boolean('is_active');

    const campaigns = await NotificationCampaign.findAll({ where, order: [['category', 'ASC'], ['id', 'ASC']] });
    return res.json({ data: campaigns });
  },

  // Fetch one message (draft or historical send record) - used to pre-fill an edit form.
  async show(req, res) {
    return res.json({ data: await findOrFail(NotificationCampaign, req.params.id) });
  },

  // Create a new library message. At least one of title/body must be present.
  async store(req, res) {
    const validated = await validateContent(req, true);

    const campaign = await NotificationCampaign.create({
      category: validated.category ?? 'general',
      title: validated.title ?? null,
      body: validated.body ?? null,
      image_url: resolveImage(req, validated, null),
      segment: validated.segment ?? 'all_customers',
      target_user_id: (validated.segment ?? null) === 'single_user' ? (validated.target_user_id ?? null) : null,
      data: validated.data ?? null,
      is_active: true,
      status: 'draft',
      created_by: req.user?.id ?? null,
    });

    // Eloquent create() does not refresh DB-default columns that were not assigned
    const created = campaign.toJSON();
    for (const k of ['total_recipients', 'success_count', 'failure_count']) delete created[k];
    return res.status(201).json({ message: 'Message created.', data: created });
  },

  // Edit an existing library message. Only allowed while status = draft.
  async update(req, res) {
    const campaign = await findOrFail(NotificationCampaign, req.params.id);

    if (campaign.status !== 'draft') {
      return res.status(422).json({
        message: 'Only draft messages can be edited — this one has already been sent and is kept as history.',
      });
    }

    const validated = await validateContent(req, false);
    const segment = validated.segment ?? campaign.segment;

    campaign.set({
      category: validated.category ?? campaign.category,
      title: 'title' in validated ? validated.title : campaign.title,
      body: 'body' in validated ? validated.body : campaign.body,
      image_url: resolveImage(req, validated, raw(campaign)),
      segment,
      target_user_id: segment === 'single_user' ? (validated.target_user_id ?? campaign.target_user_id) : null,
      data: 'data' in validated ? validated.data : dataOf(campaign),
    });

    if (isEmpty(campaign.title) && isEmpty(campaign.body)) {
      throw new ValidationError({ title: ['Provide at least a title or a body.'] });
    }

    await campaign.save();

    return res.json({ message: 'Message updated.', data: campaign });
  },

  // Delete a library message. Only allowed while status = draft. Cleans up the uploaded image file.
  async destroy(req, res) {
    const campaign = await findOrFail(NotificationCampaign, req.params.id);

    if (campaign.status !== 'draft') {
      return res.status(422).json({
        message: 'Only draft messages can be deleted — sent campaigns are kept as delivery history.',
      });
    }

    const rawImage = raw(campaign);
    if (rawImage && !String(rawImage).startsWith('http')) {
      deletePublic(rawImage);
    }

    await campaign.destroy();

    return res.json({ message: 'Message deleted.' });
  },

  // Flip is_active. Only meaningful for draft rows.
  async toggle(req, res) {
    const campaign = await findOrFail(NotificationCampaign, req.params.id);

    if (campaign.status !== 'draft') {
      return res.status(422).json({ message: 'Only draft messages can be toggled.' });
    }

    await campaign.update({ is_active: !campaign.is_active });

    return res.json({ id: campaign.id, is_active: campaign.is_active });
  },

  /**
   * Send a campaign now. :id may be a library/draft row or a previous send record (resend).
   * Body (all optional - overrides the source row's own values): segment, target_user_id, image / image_url, data
   */
  async send(req, res) {
    const source = await findOrFail(NotificationCampaign, req.params.id);

    if (!source.is_active) {
      return res.status(422).json({ message: 'This message is disabled. Enable it first before sending.' });
    }

    const validated = await validate(req, {
      segment: ['nullable', 'in:all_customers,all_workers,all,single_user'],
      target_user_id: ['nullable', 'integer', 'exists:users,id', 'required_if:segment,single_user'],
      image_url: ['nullable', 'url', 'starts_with:https://,http://', 'max:1024'],
      image: ['nullable', 'image', 'mimes:jpeg,jpg,png,webp', 'max:2048'],
      data: ['nullable', 'array'],
    });

    const segment = validated.segment ?? (source.segment || 'all_customers');

    const send = await NotificationCampaign.create({
      category: source.category,
      title: source.title,
      body: source.body,
      image_url: resolveImage(req, validated, raw(source)),
      segment,
      target_user_id: segment === 'single_user' ? validated.target_user_id : null,
      data: validated.data ?? dataOf(source),
      is_active: true,
      status: 'sending',
      created_by: req.user?.id ?? null,
      total_recipients: 0,
      success_count: 0,
      failure_count: 0,
    });

    await queue.dispatch('DispatchCampaignJob', { campaignId: send.id });

    return res.status(202).json({
      message: 'Campaign queued for sending.',
      campaign_id: send.id,
      segment: send.segment,
      target_user_id: send.target_user_id,
      image_url: send.image_url, // accessor -> absolute URL
      status: send.status,
    });
  },

  // Upload a campaign image and get back its public URL.
  async uploadImage(req, res) {
    await validate(req, { image: ['required', 'image', 'mimes:jpeg,jpg,png,webp', 'max:2048'] });

    const path = storePublic(imageFile(req), 'campaigns');

    return res.status(201).json({ path, image_url: storageUrl(path) });
  },

  // Delivery report for a send record.
  async status(req, res) {
    const campaign = await findOrFail(NotificationCampaign, req.params.id);

    return res.json({
      id: campaign.id,
      status: campaign.status,
      image_url: campaign.image_url, // accessor -> absolute URL
      total_recipients: campaign.total_recipients,
      success_count: campaign.success_count,
      failure_count: campaign.failure_count,
      sent_at: campaign.sent_at,
    });
  },
};

module.exports = ctrl;
