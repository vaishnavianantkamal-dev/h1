const { storageUrl } = require('../utils/storage');

/**
 * A marketing / engagement campaign. Library rows start as `draft`; sending drives them to `sending` then `sent`.
 */
module.exports = (sequelize, DataTypes) => {
  const NotificationCampaign = sequelize.define('NotificationCampaign', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    category: { type: DataTypes.STRING, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    body: { type: DataTypes.TEXT },
    // Stored value is an external URL or a relative public-disk path; getter always yields an absolute URL.
    image_url: {
      type: DataTypes.STRING(1024),
      get() {
        const v = this.getDataValue('image_url');
        if (!v) return null;
        if (v.startsWith('http://') || v.startsWith('https://')) return v;
        return storageUrl(v);
      },
    },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    segment: { type: DataTypes.STRING, allowNull: false, defaultValue: 'all_customers' },
    target_user_id: { type: DataTypes.BIGINT.UNSIGNED },
    data: { type: DataTypes.JSON },
    status: { type: DataTypes.ENUM('draft', 'scheduled', 'sending', 'sent', 'failed'), allowNull: false, defaultValue: 'draft' },
    scheduled_at: { type: DataTypes.DATE },
    sent_at: { type: DataTypes.DATE },
    created_by: { type: DataTypes.BIGINT.UNSIGNED },
    total_recipients: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    success_count: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    failure_count: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  }, { tableName: 'notification_campaigns' });

  NotificationCampaign.associate = (models) => {
    NotificationCampaign.hasMany(models.NotificationCampaignLog, { foreignKey: 'campaign_id', as: 'logs' });
  };

  return NotificationCampaign;
};
