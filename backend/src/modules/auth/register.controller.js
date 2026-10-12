// Port of App\Http\Controllers\Auth\RegisterController
const fs = require('fs');
const path = require('path');
const { User, Role, Worker, Customer } = require('../../models');
const sequelize = require('../../config/db');
const validate = require('../../utils/validate');
const hash = require('../../utils/hash');
const { findOrFail } = require('../../utils/binding');
const storage = require('../../utils/storage');
const { createToken } = require('../../middleware/auth');

// PHP: rand(1000, 9999)
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
// PHP uniqid(): 8 hex chars of seconds + 5 hex chars of microseconds
const uniqid = () => { const ms = Date.now(); return Math.floor(ms / 1000).toString(16).padStart(8, '0') + ((ms % 1000) * 1000 + Math.floor(Math.random() * 1000)).toString(16).padStart(5, '0'); };
// PHP json_encode() defaults (the `images` array cast): escaped slashes and \uXXXX for non-ASCII
const phpJson = (v) => JSON.stringify(v).replace(/\//g, '\\/').replace(/[\u0080-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
async function saveImages(user, images) {
  const { dayjs } = require('../../utils/time');
  await sequelize.query('UPDATE users SET images = ?, updated_at = ? WHERE id = ?', { replacements: [phpJson(images), dayjs().format('YYYY-MM-DD HH:mm:ss'), user.id] });
  user.setDataValue('images', images);
}
const extOf = (f) => path.extname(f.originalname || '').replace(/^\./, '');

// Multer names uploads "images[0][file]"; the validator looks them up as "images.0.file".
function normaliseImageFiles(req) {
  if (Array.isArray(req.files)) {
    req.files.forEach((f) => {
      const m = /^images\[(\d+)\]\[file\]$/.exec(f.fieldname);
      if (m) f.fieldname = `images.${m[1]}.file`;
    });
  }
}

// $request->file('images') as [index => file] (only rows that have a 'file')
function imageFiles(req) {
  const out = [];
  (req.files || []).forEach((f) => {
    const m = /^images\.(\d+)\.file$/.exec(f.fieldname);
    if (m) out.push([Number(m[1]), f]);
  });
  return out.sort((a, b) => a[0] - b[0]);
}

const hasImages = (req) => req.has('images') || imageFiles(req).length > 0;

module.exports = {
  async register(req, res) {
    normaliseImageFiles(req);

    const role = await findOrFail(Role, req.input('role_id'));

    // Only a super-admin may create super-admin / city-admin accounts (the route itself is limited to those two roles).
    const actorSlug = req.user && req.user.role ? req.user.role.slug : null;
    if (['super-admin', 'city-admin'].includes(role.slug) && actorSlug !== 'super-admin') {
      return res.status(403).json({ message: 'Only a super-admin can create this type of account.' });
    }

    // City-locked roles MUST be tied to a city. Without a city_id the
    // CityScoped trait silently treats them as "all cities" (security hole).
    const cityLockedRoles = ['co-ordinators', 'city-admin'];
    if (cityLockedRoles.includes(role.slug)) {
      await validate(req, {
        city_id: 'required|exists:cities,id',
        zone_id: 'nullable|exists:zones,id',
        area_id: 'nullable|exists:serviceable_areas,id',
      });
    }

    const referral_code = (`HOBIT-${role.slug.substring(0, 1).toUpperCase()}-${rand(1000, 9999)}`).toUpperCase();

    // added_by logic: PHP used auth()->user() (the web guard - always null on this unauthenticated route
    // since there is no session), so added_by is stored as NULL.
    const addedBy = null;

    const user = await User.create({
      name: req.input('name'),
      phone: req.input('phone'),
      email: req.input('email'),
      added_by: addedBy,
      password: hash.make(req.input('password')),
      role_id: req.input('role_id'),
      city_id: req.input('city_id'), // required for city-locked roles (validated above)
      zone_id: req.input('zone_id'),
      area_id: req.input('area_id'),
      is_active: true,
      referral_code,
      firm: req.input('firm'), // Only filled when role is contractor
    });

    if (hasImages(req)) {
      // foreach ($request->file('images') ...) over null => ErrorException => 500
      if (!imageFiles(req).length) throw new Error('foreach() argument must be of type array|object, null given');
      const images = [];

      for (const [index, file] of imageFiles(req)) {
        const type = req.input(`images.${index}.type`);

        const safeType = (type === null || type === undefined ? '' : String(type)).replace(/ /g, '_').toLowerCase();
        const filename = `${safeType}_${Math.floor(Date.now() / 1000)}_${uniqid()}.${extOf(file)}`;

        const destinationPath = path.join(storage.ROOT, 'public', 'storage', 'uploads', 'users', String(user.id));
        fs.mkdirSync(destinationPath, { recursive: true });
        fs.writeFileSync(path.join(destinationPath, filename), file.buffer);

        images.push({
          type,
          path: `uploads/users/${user.id}/${filename}`,
        });
      }

      await saveImages(user, images);
    }

    if (role.slug === 'worker') {
      await Worker.create({ user_id: user.id });
    }

    if (role.slug === 'customer') {
      await Customer.create({ user_id: user.id });
    }

    // Eloquent create(): the model only holds the assigned attributes (+ id, timestamps, hook-set public_id);
    // hasRole() above loaded the `role` relation.
    const j = user.toJSON();
    const created = {
      name: req.input('name'), phone: req.input('phone'), email: req.input('email'), added_by: addedBy,
      role_id: req.input('role_id'), city_id: req.input('city_id'), zone_id: req.input('zone_id'), area_id: req.input('area_id'),
      is_active: true, referral_code, firm: req.input('firm'),
      public_id: j.public_id, updated_at: j.updated_at, created_at: j.created_at, id: j.id,
    };
    if (j.images !== undefined && hasImages(req)) created.images = j.images;
    created.role = (await Role.findByPk(user.role_id)).toJSON();

    return res.status(201).json({
      message: 'Registration successful',
      public_id: user.public_id,
      token: await createToken(user, 'api-token'),
      user: created,
    });
  },

  async update(req, res) {
    normaliseImageFiles(req);

    const user = await findOrFail(User, req.params.user);

    await validate(req, {
      name: 'nullable|string|max:150',
      phone: `nullable|string|max:15|unique:users,phone,${user.id}`,
      email: `nullable|email|unique:users,email,${user.id}`,
      password: 'nullable|min:6|confirmed',
      role_id: 'nullable|exists:roles,id',
      firm: 'nullable|required_if:role_id,contractor|string|max:255',
      images: 'nullable|array',
      'images.*.type': 'required|string',
      'images.*.file': 'required|image|mimes:jpg,jpeg,png,webp|max:2048',
    });

    const role = await findOrFail(Role, req.input('role_id'));

    /* -----------------------
       Update user data
    ----------------------- */
    const data = req.only('name', 'phone', 'email', 'role_id', 'firm'); // Include firm field

    // Handle password separately
    if (req.filled('password')) {
      data.password = hash.make(req.input('password'));
    }

    await user.update(data);
    const existingImages = Array.isArray(user.toJSON().images) ? user.toJSON().images : [];
    const newImages = [];

    if (hasImages(req)) {
      for (const [index, file] of imageFiles(req)) {
        const type = req.input(`images.${index}.type`);

        const safeType = (type === null || type === undefined ? '' : String(type)).replace(/ /g, '_').toLowerCase();

        const filename = `${safeType}_${Math.floor(Date.now() / 1000)}_${uniqid()}.${extOf(file)}`;

        // delete old image of same type
        existingImages.filter((img) => img.type === type).forEach((img) => storage.deleteUpload(img.path));

        storage.moveToUploads(file, `users/${user.id}`, filename);

        newImages.push({
          type,
          path: `uploads/users/${user.id}/${filename}`,
        });
      }

      const newTypes = newImages.map((i) => i.type);
      const mergedImages = existingImages
        .filter((img) => !newTypes.includes(img.type))
        .concat(newImages);

      await saveImages(user, mergedImages);
    }
    /* -----------------------
       Role based tables
    ----------------------- */
    // $user->hasRole() -> the user's (just updated) role
    if (role.slug === 'worker') {
      await Worker.findOrCreate({ where: { user_id: user.id } });
    }

    if (role.slug === 'customer') {
      await Customer.findOrCreate({ where: { user_id: user.id } });
    }

    const uj = user.toJSON();
    for (const k of Object.keys(data)) if (k !== 'password') uj[k] = data[k]; // raw assigned values
    uj.role = (await Role.findByPk(user.role_id)).toJSON(); // hasRole() loaded the relation
    return res.status(200).json({
      message: 'User updated successfully',
      user: uj,
    });
  },

  async user_profile(req, res) {
    const user = await findOrFail(User, req.params.user);

    let images;
    const storedImages = user.toJSON().images;
    if (Array.isArray(storedImages) && storedImages.length) {
      images = storedImages.map((img) => ({
        type: img.type,
        path: img.path,
        url: storage.assetUrl(`public/storage/${img.path}`),
      }));
    } else {
      images = [];
    }

    return res.json({
      success: true,
      user: { ...user.toJSON(), images },
    });
  },
};
