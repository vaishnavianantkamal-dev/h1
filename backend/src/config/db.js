const { Sequelize } = require('sequelize');
const config = require('./index');

const sequelize = new Sequelize(config.db.database, config.db.username, config.db.password, {
  host: config.db.host,
  port: config.db.port,
  dialect: 'mysql',
  timezone: '+05:30', // Laravel app timezone Asia/Kolkata - DB stores local IST times
  dialectOptions: {
    dateStrings: false, decimalNumbers: true,
    // Hosted MySQL (Aiven, etc.) requires SSL: set DB_SSL=true
    ...(process.env.DB_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
  },
  logging: config.db.log ? console.log : false,
  pool: { max: 20, min: 0, acquire: 30000, idle: 10000 },
  define: {
    underscored: true,
    freezeTableName: true, // tables are named exactly as Laravel created them
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
});

module.exports = sequelize;
