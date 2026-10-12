// Port of app/Http/Controllers/CMS/CmsHeaderController.php
const { Header } = require('../../models');
const { singleton, ok, fail } = require('./cmsHelpers');

const rules = { marquee_text: 'nullable|string', marquee_status: 'boolean', is_active: 'boolean' };

const ctrl = singleton({
  model: () => Header,
  notFound: 'Header not found. Please create one first.',
  existsMsg: 'Header already exists. Please use update instead.',
  createdMsg: 'Header created successfully',
  updatedMsg: 'Header updated successfully',
  storeRules: rules,
  updateRules: rules,
});

// POST /cms/header/toggle-marquee
ctrl.toggleMarquee = async (req, res) => {
  const header = await Header.findOne();
  if (!header) return fail(res, 'Header not found.', 404);

  header.marquee_status = !header.marquee_status;
  await header.save();

  return ok(res, {
    success: true,
    message: 'Marquee status toggled successfully',
    data: { marquee_status: header.marquee_status },
  });
};

module.exports = ctrl;
