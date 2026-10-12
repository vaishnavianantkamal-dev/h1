module.exports = (sequelize, DataTypes) => {
  const Contact = sequelize.define('Contact', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    short_heading: { type: DataTypes.STRING },
    heading: { type: DataTypes.STRING },
    description: { type: DataTypes.TEXT },
    btn_name: { type: DataTypes.STRING },
    email_title: { type: DataTypes.STRING },
    email_subtitle: { type: DataTypes.STRING },
    emails: { type: DataTypes.JSON },
    visit_title: { type: DataTypes.STRING },
    visit_location: { type: DataTypes.STRING },
    visit_address: { type: DataTypes.TEXT },
    call_title: { type: DataTypes.STRING },
    call_timing: { type: DataTypes.STRING },
    phone_numbers: { type: DataTypes.JSON },
    whatsapp_title: { type: DataTypes.STRING },
    whatsapp_numbers: { type: DataTypes.JSON },
    is_active: { type: DataTypes.BOOLEAN },
  }, {
    tableName: 'contacts',
  });
  return Contact;
};
