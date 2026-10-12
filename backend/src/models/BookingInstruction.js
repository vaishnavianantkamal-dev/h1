module.exports = (sequelize, DataTypes) => {
  const BookingInstruction = sequelize.define('BookingInstruction', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    text: { type: DataTypes.TEXT },
    order: { type: DataTypes.INTEGER },
    is_active: { type: DataTypes.BOOLEAN },
  }, {
    tableName: 'booking_instructions',
  });
  BookingInstruction.associate = (models) => {
    // The subscriptions this instruction is shown for (multiselect).
    BookingInstruction.belongsToMany(models.SubscriptionType, {
      through: 'booking_instruction_subscription',
      foreignKey: 'booking_instruction_id',
      otherKey: 'subscription_id',
      as: 'subscriptions',
    });
  };
  return BookingInstruction;
};
