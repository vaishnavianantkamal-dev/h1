const { Op, where, col } = require('sequelize');
const { dayjs } = require('../utils/time');

module.exports = (sequelize, DataTypes) => {
  const Banner = sequelize.define('Banner', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING },
    subtitle: { type: DataTypes.STRING },
    image: { type: DataTypes.STRING, allowNull: false },
    placement: { type: DataTypes.STRING, allowNull: false, defaultValue: 'home_top' },
    action_type: { type: DataTypes.STRING, allowNull: false, defaultValue: 'none' },
    action_value: { type: DataTypes.STRING },
    sort_order: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    start_date: { type: DataTypes.DATE },
    end_date: { type: DataTypes.DATE },
    start_time: { type: DataTypes.TIME },
    end_time: { type: DataTypes.TIME },
    audience: { type: DataTypes.STRING, allowNull: false, defaultValue: 'all_users' }, // all_users | new_user | member
  }, {
    tableName: 'banners',
    paranoid: true,
    deletedAt: 'deleted_at',
    scopes: {
      // Banners the app should actually show right now: active + inside scheduled window (if any).
      visible: () => {
        const now = new Date();
        const nowTime = dayjs().format('HH:mm:ss');
        return {
          where: {
            [Op.and]: [
              { is_active: true },
              // Calendar-date window (optional)
              { [Op.or]: [{ start_date: null }, { start_date: { [Op.lte]: now } }] },
              { [Op.or]: [{ end_date: null }, { end_date: { [Op.gte]: now } }] },
              // Time-of-day window (optional)
              {
                [Op.or]: [
                  // 1) No time window set -> show all day
                  { start_time: null, end_time: null },
                  // 2) Normal window (start <= end), e.g. 06:00-12:00
                  {
                    [Op.and]: [
                      { start_time: { [Op.ne]: null } },
                      { end_time: { [Op.ne]: null } },
                      where(col('start_time'), Op.lte, col('end_time')),
                      { start_time: { [Op.lte]: nowTime } },
                      { end_time: { [Op.gte]: nowTime } },
                    ],
                  },
                  // 3) Overnight window (start > end), e.g. 21:00-06:00
                  {
                    [Op.and]: [
                      { start_time: { [Op.ne]: null } },
                      { end_time: { [Op.ne]: null } },
                      where(col('start_time'), Op.gt, col('end_time')),
                      { [Op.or]: [{ start_time: { [Op.lte]: nowTime } }, { end_time: { [Op.gte]: nowTime } }] },
                    ],
                  },
                ],
              },
            ],
          },
        };
      },
      placement: (placement) => ({ where: { placement } }),
      // Banner.scope({ method: ['forAudience', user] }). Accepts a user (sync isMember()/isNewUser(),
      // guest = null/undefined) or a precomputed array of allowed audiences (see Banner.audiencesFor).
      forAudience: (userOrAllowed) => {
        let allowed = ['all_users'];
        if (Array.isArray(userOrAllowed)) allowed = userOrAllowed;
        else if (userOrAllowed) {
          if (userOrAllowed.isMember && userOrAllowed.isMember()) allowed.push('member');
          if (userOrAllowed.isNewUser && userOrAllowed.isNewUser()) allowed.push('new_user');
        }
        return { where: { audience: { [Op.in]: allowed } } };
      },
    },
  });

  // Async-safe helper: resolves the allowed audiences even if User.isMember()/isNewUser() return promises.
  Banner.audiencesFor = async (user) => {
    const allowed = ['all_users'];
    if (user) {
      if (await user.isMember()) allowed.push('member');
      if (await user.isNewUser()) allowed.push('new_user');
    }
    return allowed;
  };

  return Banner;
};
