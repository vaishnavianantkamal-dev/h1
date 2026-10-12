const { Op } = require('sequelize');
const { dayjs } = require('../utils/time');

module.exports = (sequelize, DataTypes) => {
  const InstantHelpCard = sequelize.define('InstantHelpCard', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING },
    subtitle: { type: DataTypes.STRING },
    image: { type: DataTypes.STRING },
    action_type: { type: DataTypes.STRING, allowNull: false, defaultValue: 'none' },
    action_value: { type: DataTypes.STRING },
    trigger_type: { type: DataTypes.STRING, allowNull: false, defaultValue: 'promo' },
    start_hour: { type: DataTypes.TINYINT.UNSIGNED },
    end_hour: { type: DataTypes.TINYINT.UNSIGNED },
    priority: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 100 },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    start_date: { type: DataTypes.DATE },
    end_date: { type: DataTypes.DATE },
  }, {
    tableName: 'instant_help_cards',
    paranoid: true,
    deletedAt: 'deleted_at',
    scopes: {
      // The card the app should actually show right now: active + inside its scheduled window (if any).
      visible: () => {
        const now = new Date();
        return {
          where: {
            [Op.and]: [
              { is_active: true },
              { [Op.or]: [{ start_date: null }, { start_date: { [Op.lte]: now } }] },
              { [Op.or]: [{ end_date: null }, { end_date: { [Op.gte]: now } }] },
            ],
          },
        };
      },
    },
  });

  /**
   * Does this banner's clock-hour window cover the current time?
   * No window set (either hour is null) = always matches. end_hour < start_hour wraps past midnight.
   */
  InstantHelpCard.prototype.matchesCurrentHour = function matchesCurrentHour(hour = null) {
    if (this.start_hour === null || this.start_hour === undefined || this.end_hour === null || this.end_hour === undefined) {
      return true;
    }
    if (hour === null || hour === undefined) hour = dayjs().hour();
    if (this.start_hour <= this.end_hour) {
      return hour >= this.start_hour && hour < this.end_hour;
    }
    return hour >= this.start_hour || hour < this.end_hour;
  };

  return InstantHelpCard;
};
