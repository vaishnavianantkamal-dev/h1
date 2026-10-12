module.exports = (sequelize, DataTypes) => {
  const Testimonial = sequelize.define('Testimonial', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    short_heading: { type: DataTypes.STRING },
    heading: { type: DataTypes.STRING },
    description: { type: DataTypes.TEXT },
    star: { type: DataTypes.INTEGER },
    card_description: { type: DataTypes.TEXT },
    image: { type: DataTypes.STRING },
    name: { type: DataTypes.STRING },
    designation: { type: DataTypes.STRING },
    order: { type: DataTypes.INTEGER },
    is_active: { type: DataTypes.BOOLEAN },
  }, {
    tableName: 'testimonials',
  });
  return Testimonial;
};
