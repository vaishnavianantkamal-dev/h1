module.exports = (sequelize, DataTypes) => {
  const Footer = sequelize.define('Footer', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    newsletter_heading: { type: DataTypes.STRING },
    newsletter_description: { type: DataTypes.TEXT },
    company_name: { type: DataTypes.STRING },
    company_description: { type: DataTypes.TEXT },
    company_registration_number: { type: DataTypes.STRING },
    registered_address_title: { type: DataTypes.STRING },
    registered_address: { type: DataTypes.TEXT },
    support_email: { type: DataTypes.STRING },
    contact_email: { type: DataTypes.STRING },
    contact_location: { type: DataTypes.STRING },
    instagram_url: { type: DataTypes.STRING },
    facebook_url: { type: DataTypes.STRING },
    linkedin_url: { type: DataTypes.STRING },
    twitter_url: { type: DataTypes.STRING },
    copyright_text: { type: DataTypes.STRING },
    copyright_year: { type: DataTypes.INTEGER },
    company_links: { type: DataTypes.JSON },
    service_links: { type: DataTypes.JSON },
    footer_links: { type: DataTypes.JSON },
    is_active: { type: DataTypes.BOOLEAN },
  }, {
    tableName: 'cms_footers',
  });
  return Footer;
};
