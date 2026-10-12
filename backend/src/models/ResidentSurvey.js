module.exports = (sequelize, DataTypes) => {
  const ResidentSurvey = sequelize.define('ResidentSurvey', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    surveyor_name: { type: DataTypes.STRING },
    building_name: { type: DataTypes.STRING },
    flat_number: { type: DataTypes.STRING },
    resident_name: { type: DataTypes.STRING },
    family_members: { type: DataTypes.INTEGER },
    maids_count: { type: DataTypes.INTEGER },
    work_types: { type: DataTypes.JSON },
    work_duration: { type: DataTypes.STRING },
    reliability_rating: { type: DataTypes.TINYINT },
    problems_faced: { type: DataTypes.JSON },
    preferred_time_slots: { type: DataTypes.JSON },
    monthly_payment_range: { type: DataTypes.STRING },
    maid_source: { type: DataTypes.JSON },
    app_openness: { type: DataTypes.STRING },
    convincing_factors: { type: DataTypes.JSON },
    extra_payment: { type: DataTypes.STRING },
    whatsapp_group_interest: { type: DataTypes.STRING },
  }, {
    tableName: 'resident_surveys',
  });
  return ResidentSurvey;
};
