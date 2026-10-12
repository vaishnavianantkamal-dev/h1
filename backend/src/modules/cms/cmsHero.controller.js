// Port of app/Http/Controllers/CMS/CmsHeroController.php
const { Hero } = require('../../models');
const { IMG, singleton } = require('./cmsHelpers');

module.exports = singleton({
  model: () => Hero,
  notFound: 'Hero section not found. Please create one first.',
  existsMsg: 'Hero section already exists. Please use update instead.',
  createdMsg: 'Hero section created successfully',
  updatedMsg: 'Hero section updated successfully',
  images: [{ field: 'hero_image', folder: 'hero' }],
  storeRules: {
    short_heading: 'required|string|max:255',
    heading: 'required|string|max:255',
    description: 'required|string',
    hero_image: ['nullable', ...IMG],
    button_primary_text: 'required|string|max:255',
    button_primary_link: 'required|string|max:255',
    button_secondary_text: 'required|string|max:255',
    button_secondary_link: 'required|string|max:255',
    available_in: 'nullable|array',
    'available_in.*': 'string',
    is_active: 'boolean',
  },
  updateRules: {
    short_heading: 'sometimes|string|max:255',
    heading: 'sometimes|string|max:255',
    description: 'sometimes|string',
    hero_image: ['nullable', ...IMG],
    button_primary_text: 'sometimes|string|max:255',
    button_primary_link: 'sometimes|string|max:255',
    button_secondary_text: 'sometimes|string|max:255',
    button_secondary_link: 'sometimes|string|max:255',
    available_in: 'nullable|array',
    'available_in.*': 'string',
    is_active: 'boolean',
  },
});
