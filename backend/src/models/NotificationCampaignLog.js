/** Delivery receipt for a single (campaign, device token). Write-once: no updated_at. */
module.exports = (sequelize, DataTypes) => {
  const NotificationCampaignLog = sequelize.define('NotificationCampaignLog', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    campaign_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    fcm_token: { type: DataTypes.STRING(512), allowNull: false },
    status: { type: DataTypes.ENUM('sent', 'failed'), allowNull: false },
    error: { type: DataTypes.TEXT },
  }, { tableName: 'notification_campaign_logs', updatedAt: false });

  NotificationCampaignLog.associate = (models) => {
    NotificationCampaignLog.belongsTo(models.NotificationCampaign, { foreignKey: 'campaign_id', as: 'campaign' });
  };

  return NotificationCampaignLog;
};
