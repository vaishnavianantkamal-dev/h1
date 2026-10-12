// Port of app/Http/Controllers/CMS/CmsFooterController.php
const { Footer } = require('../../models');
const { singleton } = require('./cmsHelpers');

const common = {
  company_registration_number: 'nullable|string|max:255',
  registered_address_title: 'nullable|string|max:255',
  support_email: 'nullable|email',
  contact_email: 'nullable|email',
  contact_location: 'nullable|string|max:255',
  instagram_url: 'nullable|url',
  facebook_url: 'nullable|url',
  linkedin_url: 'nullable|url',
  twitter_url: 'nullable|url',
  copyright_year: 'nullable|integer|min:2000|max:2100',
  company_links: 'nullable|array',
  'company_links.*.label': 'required|string',
  'company_links.*.url': 'required|string',
  service_links: 'nullable|array',
  'service_links.*.label': 'required|string',
  'service_links.*.url': 'required|string',
  footer_links: 'nullable|array',
  'footer_links.*.label': 'required|string',
  'footer_links.*.url': 'required|string',
  is_active: 'boolean',
};

module.exports = singleton({
  model: () => Footer,
  notFound: 'Footer not found. Please create one first.',
  existsMsg: 'Footer already exists. Please use update instead.',
  createdMsg: 'Footer created successfully',
  updatedMsg: 'Footer updated successfully',
  storeRules: {
    newsletter_heading: 'required|string|max:255',
    newsletter_description: 'required|string',
    company_name: 'required|string|max:255',
    company_description: 'required|string',
    registered_address: 'required|string',
    copyright_text: 'required|string|max:255',
    ...common,
  },
  updateRules: {
    newsletter_heading: 'sometimes|string|max:255',
    newsletter_description: 'sometimes|string',
    company_name: 'sometimes|string|max:255',
    company_description: 'sometimes|string',
    registered_address: 'sometimes|string',
    copyright_text: 'sometimes|string|max:255',
    ...common,
  },
});
