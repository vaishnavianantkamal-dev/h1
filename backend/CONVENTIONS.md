# Laravel -> Node/Express/Sequelize conversion conventions

PHP source (read-only reference): `C:\Users\temp\Desktop\h1\hobit` (Laravel). Node target: `C:\Users\temp\Desktop\h1\hobit\hobit-node`.
Goal: **behaviour-for-behaviour port**. Same URLs, same HTTP methods, same request params, same JSON response shapes,
same status codes, same validation messages, same DB tables/columns (the existing MySQL DB is reused - never rename/alter tables).
Do NOT "improve" logic. If PHP has a quirk, keep it. Port comments that explain business rules (briefly).

CommonJS only (`require`). Node >= 18. Do not add dependencies beyond package.json unless essential (if you do, append to package.json).

## Layout
```
src/config/index.js        config (env). Add new keys here, never read process.env elsewhere.
src/config/db.js           Sequelize instance (underscored, freezeTableName, created_at/updated_at)
src/models/<Model>.js      one Sequelize model per file, auto-loaded by src/models/index.js
src/modules/<domain>/<name>.controller.js   controller (object of async methods OR class instance)
src/modules/<domain>/<name>.routes.js       express.Router for /api  (mounted at /api automatically)
src/modules/<domain>/<name>.web.routes.js   express.Router for routes/web.php (mounted at / automatically)
src/services/<Name>.js     ports of app/Services/*   (same file name, same method names)
src/helpers/<Name>.js      ports of app/Helpers/*
src/jobs/<Name>.js         ports of app/Jobs/*  (register with queue.register('<Name>', fn); dispatch with queue.dispatch)
src/commands/<name>.js     ports of app/Console/Commands/*  (export async function run())
src/utils/*                validate, paginate, storage, time, hash, errors, asyncHandler, response  (already written - USE THEM)
src/middleware/*           auth (auth, optionalAuth, role, createToken), throttle, upload, request
```
Read these foundation files first: `src/utils/validate.js`, `paginate.js`, `storage.js`, `time.js`, `middleware/auth.js`, `throttle.js`, `upload.js`, `request.js`, `models/index.js`, `jobs/queue.js`, `utils/errors.js`.

## Models
```js
module.exports = (sequelize, DataTypes) => {
  const Booking = sequelize.define('Booking', { id:{type:DataTypes.BIGINT.UNSIGNED,primaryKey:true,autoIncrement:true}, ...columns }, { tableName:'bookings', paranoid:true /* if SoftDeletes */, deletedAt:'deleted_at' });
  Booking.associate = (models) => { Booking.belongsTo(models.User, { foreignKey:'customer_id', as:'customer' }); };
  return Booking;
};
```
- Model name = Eloquent class name (`App\Models\Cms\Hero` -> `Hero`; if a name collides use `CmsHero`...). `tableName` = the real table (check `$table` or Laravel pluralisation, and verify against `database/migrations`).
- Define EVERY column (read all migrations that touch the table, including later `add_*`/`change_*` ones). Use the real column types.
- **Association alias = the Eloquent relation method name exactly** (`$booking->customer` -> `as:'customer'`). Only the model that owns the foreign key / is the "primary" side declares both directions if the PHP model declares them. NEVER declare an association that the PHP model doesn't have. If you need a relation another model file didn't declare, do a separate query instead of editing that file.
- `$casts` -> getters/setters (`json`/`array` => `DataTypes.JSON` or a TEXT column with get/set that JSON.parse/stringify; booleans -> custom getter returning true/false; `decimal`/`float` -> number; dates stay Date).
- `$hidden` -> override `toJSON()` to delete those keys. `$appends` + accessors (`getXAttribute`) -> `DataTypes.VIRTUAL` fields with `get()` so they appear in JSON output.
- Eloquent query scopes (`scopeFoo`) -> **Sequelize named scopes** `scopes:{ foo: ... }` (use function scopes when they take args) - use the same name (`Booking.scope('foo')`). Document constants as `Model.CONSTANT`.
- Eloquent static/instance helper methods -> static / prototype methods with the same name.
- Observers/`booted()` hooks -> Sequelize hooks (`afterCreate`, `afterUpdate`...) in the model file; preserve `wasChanged` semantics with `instance.changed()` (in `afterUpdate` use `instance.previous()`).
- Timestamps: if the PHP model has `$timestamps = false` pass `timestamps:false`.
- Dates: the DB stores IST wall-clock; config/db.js sets `timezone:'+05:30'`. Use `dayjs()` from `utils/time` (== Carbon::now()).
- Primary keys in this DB are `BIGINT UNSIGNED` auto-increment unless the migration says otherwise.

## Controllers
- Controller methods are `async (req, res)`; throw `HttpError`/`abort(404,'..')`/ValidationError instead of returning error responses where PHP uses abort/validate. Return JSON exactly like PHP: `res.status(201).json({...})`.
- Wrap every router handler with `h(...)` from `utils/asyncHandler` so errors reach the global error handler (`router.get('/x', h(ctrl.index))` or `const ctrl = h(new Ctrl())`).
- `$request->validate([...])` / FormRequest -> `await validate(req, rules, messages)`; validation failures automatically return Laravel's 422 `{message, errors}`.
- `$request->input/filled/has/all/only/except` -> same-named methods on `req` (see middleware/request.js). Empty strings arrive as null (like ConvertEmptyStringsToNull) and strings are trimmed.
- Route model binding (`Booking $booking` / `{booking}`) -> `const booking = await Booking.findByPk(req.params.booking); if(!booking) abort(404,'No query results for model [App\\Models\\Booking] '+id)`. (`findOrFail` -> same.) Put a tiny local helper at the top of the controller; or add a shared one to `src/utils/binding.js` (create if missing, export `findOrFail(Model, id, opts)`).
- `$request->user()` / `auth()->user()` -> `req.user` (loaded with `role` and `role.permissions`). `$request->user()->currentAccessToken()` -> `req.accessToken` (a PersonalAccessToken row; `.destroy()` to revoke). `createToken('x')->plainTextToken` -> `await createToken(user,'x')` from `middleware/auth`.
- `Hash::make/check` -> `utils/hash`. `Carbon::now()` -> `dayjs()`. `now()->addMinutes(2)` -> `dayjs().add(2,'minute')`. DB date strings: `.format('YYYY-MM-DD HH:mm:ss')`.
- Pagination -> `paginate(Model, req, {where, include, order, perPage})` (Laravel paginator JSON shape). Collections -> arrays.
- `DB::table(...)`/`DB::select` -> `sequelize.query(sql,{replacements, type: QueryTypes.SELECT})`. `DB::transaction(fn)` -> `sequelize.transaction(async (t)=>{...})` (pass `{transaction:t}`).
  `lockForUpdate()` -> `{ lock: t.LOCK.UPDATE, transaction: t }`.
- Eloquent `with(...)` -> `include`. `whereHas` -> include with `required:true` + where (or subquery). `withCount` -> `attributes:{include:[[literal(...),'x_count']]}`. `->get()` -> `findAll`, `->first()` -> `findOne`, `->pluck` -> map.
  Eloquent model JSON: attributes are snake_case, relations appear under their alias; Sequelize instances serialise the same way - return them directly.
  When PHP builds arrays manually (e.g. `response()->json(['data'=>...])`) keep keys identical.
- Mass assignment: respect `$fillable` (pick only those keys).
- File uploads: use `upload.any()` (from `middleware/upload`; `[upload.any(), upload.normaliseFiles]` or `upload.any()` array spread) on routes that accept files; read from `req.files`/`req.file`; persist via `utils/storage` (`storePublic` = `->store(dir,'public')`, `moveToUploads` = `->move(public_path('uploads/..'))`). URLs via `storageUrl`/`assetUrl`.
- Outbound HTTP (`Http::post`) -> `axios`. Mail (`Mail::to()->send(Mailable)`) -> `src/services/MailService.js` (nodemailer; create the helper if missing: `sendMail({to,subject,html})`). Logging (`Log::info`) -> `console.log/console.error`.
- `Cache::remember` / CacheService -> port `CacheService` to an in-memory TTL map in `src/services/CacheService.js` (same method names).
- `abort_unless(cond, 403)` -> `if(!cond) abort(403)`. `response()->json($x, $code)` -> `res.status(code).json(x)`. `redirect()->away(url)` -> `res.redirect(url)`. Blade views -> render equivalent HTML via a template string in the controller (keep markup).
- Route middleware mapping: `auth:sanctum` -> `auth`; `role:a,b` -> `role('a','b')`; `throttle:otp` -> `throttle.otp` (also booking, pincodeCheck, instantWorker, auth; `throttle:30,1` -> `throttle.throttle(30,1)`).
- Route files: preserve Laravel registration ORDER and path style. `apiResource('x', C)` expands to GET /x (index), POST /x (store), GET /x/:x (show), PUT+PATCH /x/:x (update), DELETE /x/:x (destroy) - use the SAME param name as the Laravel route (it matters for binding; for nested `services.plans` => `/services/:service/plans/:plan`). Paths begin WITHOUT `/api` (it is mounted by the loader). Cross-module route collisions: before registering a path, `grep -r` the other `*.routes.js` files for the same method+path.
- Because routes/api.php is one 1000-line file and our loader mounts files alphabetically, in each routes file put routes that have wildcards (`/:id`) AFTER static siblings, and use the middleware chain exactly as Laravel's route groups do.

## Shared things other agents rely on (keep names/exports stable)
Services keep their PHP file names and method names (camelCase same as PHP). Static PHP methods = exported functions AND methods on the exported object, e.g.
`const WhatsAppCloudService = require('../services/WhatsAppCloudService'); await WhatsAppCloudService.sendText(phone, text);`
For a PHP class with instance methods and DI (`app(OtpService::class)`), export a singleton instance: `module.exports = new OtpService();`.
If you need a service/model/helper that another agent owns and it does not exist yet, just `require` it by the agreed path/name (`src/services/<PhpFileName>.js`, `src/models/<ModelName>.js`) and use the PHP method names - it will exist when the whole project is assembled. Do NOT create it yourself unless it is in YOUR assigned list.

## Hard rules
- Only create/edit files in your assigned scope (listed in your task). Never edit another agent's files; never touch the PHP project.
- Never use string-concatenated SQL with user input; use replacements/bind params.
- Syntax-check every file you write: `node --check <file>`. Also `node -e "require('./src/models')"` should not throw once models exist.
- Append any new env vars to `.env.example` and the matching key to `src/config/index.js` ONLY via small additive edits (re-read the file right before editing; other agents edit it concurrently).
- When finished, reply with: files created, anything you could NOT port (and why), any assumptions, and the list of routes you registered (method + path).
