// Auto-loads every model file in this folder.
// Convention: module.exports = (sequelize, DataTypes) => Model ; optional Model.associate = (models) => {}
// Access models anywhere with: const { User, Booking } = require('../models');
const fs = require('fs');
const path = require('path');
const { DataTypes, Op } = require('sequelize');
const sequelize = require('../config/db');
const serializer = require('./serializer');

const NOT_MODELS = new Set(['index.js', 'serializer.js']);
const models = {};
fs.readdirSync(__dirname)
  .filter((f) => f.endsWith('.js') && !NOT_MODELS.has(f))
  .sort()
  .forEach((f) => {
    const model = require(path.join(__dirname, f))(sequelize, DataTypes);
    models[model.name] = model;
  });
Object.values(models).forEach((m) => typeof m.associate === 'function' && m.associate(models));

// Eloquent-identical JSON output (casts, raw DB values, hidden fields) - see serializer.js
serializer.install(models);
// Call once at boot (server.js): reads the real table definitions and adds undeclared columns to the models.
const initSchema = () => serializer.initSchema(models, sequelize);

module.exports = { ...models, models, sequelize, Op, initSchema, serializer };
