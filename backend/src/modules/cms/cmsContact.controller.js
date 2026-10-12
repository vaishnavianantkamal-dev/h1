// Port of app/Http/Controllers/CMS/CmsContactController.php
const { Contact } = require('../../models');
const { singleton, wrap, ok, invalid } = require('./cmsHelpers');

const tail = {
  emails: 'nullable|array',
  'emails.*': 'email',
  phone_numbers: 'nullable|array',
  'phone_numbers.*': 'string',
  whatsapp_numbers: 'nullable|array',
  'whatsapp_numbers.*': 'string',
  is_active: 'boolean',
};
const storeRules = {
  short_heading: 'required|string|max:255',
  heading: 'required|string|max:255',
  description: 'required|string',
  btn_name: 'required|string|max:255',
  email_title: 'required|string|max:255',
  email_subtitle: 'required|string|max:255',
  visit_title: 'required|string|max:255',
  visit_location: 'required|string|max:255',
  visit_address: 'required|string',
  call_title: 'required|string|max:255',
  call_timing: 'required|string|max:255',
  whatsapp_title: 'required|string|max:255',
  ...tail,
};
const updateRules = {
  short_heading: 'sometimes|string|max:255',
  heading: 'sometimes|string|max:255',
  description: 'sometimes|string',
  btn_name: 'sometimes|string|max:255',
  email_title: 'sometimes|string|max:255',
  email_subtitle: 'sometimes|string|max:255',
  visit_title: 'sometimes|string|max:255',
  visit_location: 'sometimes|string|max:255',
  visit_address: 'sometimes|string',
  call_title: 'sometimes|string|max:255',
  call_timing: 'sometimes|string|max:255',
  whatsapp_title: 'sometimes|string|max:255',
  ...tail,
};

const ctrl = singleton({
  model: () => Contact,
  notFound: 'Contact section not found. Please create one first.',
  existsMsg: 'Contact section already exists. Please use PUT/PATCH to update.',
  createdMsg: 'Contact section created successfully',
  updatedMsg: 'Contact section updated successfully',
  fresh: true,
  storeRules,
  updateRules,
});

// POST /cms/contact-save - smart save: creates if missing, updates if exists.
ctrl.storeOrUpdate = async (req, res) => {
  const v = await wrap(req).validate(storeRules);
  if (v.errors) return invalid(res, v.errors);

  let contact = await Contact.findOne();
  const isNew = !contact;

  if (isNew) {
    contact = await Contact.create(v.data);
  } else {
    await contact.update(v.data);
    await contact.reload();
  }

  return ok(res, {
    success: true,
    message: isNew ? 'Contact section created successfully' : 'Contact section updated successfully',
    data: contact,
  }, isNew ? 201 : 200);
};

module.exports = ctrl;
