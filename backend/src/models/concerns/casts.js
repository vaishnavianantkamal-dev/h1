// Helpers that emulate Eloquent $casts / $fillable. Not a model file (models loader only reads top-level .js files).

// 'array' / 'json' cast. Works whether the DB column is JSON (mysql2 already parses it) or LONGTEXT (string).
// PHP json_encode default flags: "/" is escaped as "\/" and non-ASCII as \uXXXX
function phpJsonEncode(v) {
  return JSON.stringify(v)
    .replace(/\//g, '\\/')
    .replace(/[\u0080-￿]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
}

function jsonField(DataTypes, name, getRaw) {
  return {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    get() {
      const v = this.getDataValue(name);
      if (v === null || v === undefined) return null;
      if (typeof v !== 'string') return v;
      try { return JSON.parse(v); } catch (e) { return null; }
    },
    set(v) {
      this.setDataValue(name, v === null || v === undefined ? null : (typeof v === 'string' ? v : phpJsonEncode(v)));
    },
  };
}

// 'boolean' cast (returns true/false, null stays null).
function boolField(DataTypes, name, defaultValue) {
  const def = {
    type: DataTypes.BOOLEAN,
    get() {
      const v = this.getDataValue(name);
      return v === null || v === undefined ? v : !!v;
    },
  };
  if (defaultValue !== undefined) { def.defaultValue = defaultValue; def.allowNull = false; }
  return def;
}

// uncast tinyint(1) flag: Eloquent returns 0/1 ints.
function flagField(DataTypes, name, defaultValue = 0) {
  return {
    type: DataTypes.TINYINT(1),
    defaultValue,
    get() {
      const v = this.getDataValue(name);
      return v === null || v === undefined ? v : Number(v);
    },
  };
}

// $fillable: Model.fillable (array) + Model.pickFillable(obj) -> object with only fillable keys.
function addFillable(Model, keys) {
  Model.fillable = keys;
  Model.pickFillable = (obj = {}) => {
    const out = {};
    keys.forEach((k) => { if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k]; });
    return out;
  };
}

module.exports = { jsonField, boolField, flagField, addFillable };
