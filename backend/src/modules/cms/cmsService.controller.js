// Port of app/Http/Controllers/CMS/CmsServiceController.php
const { ServiceSection } = require('../../models');
const { singleton } = require('./cmsHelpers');

module.exports = singleton({
  model: () => ServiceSection,
  notFound: 'Service section not found. Please create one first.',
  existsMsg: 'Service section already exists. Please use update instead.',
  createdMsg: 'Service section created successfully',
  updatedMsg: 'Service section updated successfully',
  storeRules: {
    short_heading: 'required|string|max:255',
    heading: 'required|string|max:255',
    description: 'required|string',
    is_active: 'boolean',
  },
  updateRules: {
    short_heading: 'sometimes|string|max:255',
    heading: 'sometimes|string|max:255',
    description: 'sometimes|string',
    is_active: 'boolean',
  },
});
