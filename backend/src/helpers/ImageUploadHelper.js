// Port of app/Helpers/ImageUploadHelper.php
// Files are written under storage/app/public/uploads/cms/<folder> (served at /storage/uploads/cms/<folder>),
// which is where Laravel's public/storage symlink pointed. `file` is a multer memory file.
//   upload(file, folder, oldImage?)             -> string URL (SYNC)
//   uploadCompressed(file, folder, w?, q?)      -> Promise<string URL> (uses optional `sharp`; falls back to plain upload)
//   delete(imageUrl)                            -> boolean (SYNC)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');
const { PUBLIC_DIR, ROOT } = require('../utils/storage');

const rand10 = () => crypto.randomBytes(8).toString('base64').replace(/[^A-Za-z0-9]/g, '').padEnd(10, 'x').slice(0, 10);
const folderDir = (folder) => {
  const dir = path.join(PUBLIC_DIR, 'uploads', 'cms', folder);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};
const urlFor = (folder, filename) => `${config.appUrl}/storage/uploads/cms/${folder}/${filename}`;
const unixTime = () => Math.floor(Date.now() / 1000);

function upload(file, folder, oldImage = null) {
  // Delete old image if exists
  if (oldImage) del(oldImage);

  const dir = folderDir(folder);
  const ext = path.extname(file.originalname || '').replace('.', '');
  const filename = `${unixTime()}_${rand10()}.${ext}`;
  fs.writeFileSync(path.join(dir, filename), file.buffer);

  return urlFor(folder, filename);
}

/** Resize + compress (longest edge maxWidth, JPEG quality) - GD in PHP, `sharp` here. */
async function uploadCompressed(file, folder, maxWidth = 800, quality = 70) {
  const supported = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  let sharp = null;
  try { sharp = require('sharp'); } catch (_) { /* optional dependency */ }

  // Unsupported type (or no image lib) - fall back to the plain (uncompressed) upload.
  if (!sharp || !supported.includes(file.mimetype)) return upload(file, folder);

  try {
    const dir = folderDir(folder);
    const filename = `${unixTime()}_${rand10()}.jpg`;
    // .rotate() with no args corrects orientation from EXIF; only scale down, never up.
    const buf = await sharp(file.buffer)
      .rotate()
      .resize({ width: maxWidth, withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer();
    fs.writeFileSync(path.join(dir, filename), buf);
    return urlFor(folder, filename);
  } catch (e) {
    return upload(file, folder);
  }
}

function del(imageUrl) {
  try {
    let p = '/';
    try { p = new URL(imageUrl).pathname; } catch (_) { p = String(imageUrl); }
    p = decodeURIComponent(p);
    const abs = p.startsWith('/storage/')
      ? path.join(PUBLIC_DIR, p.slice('/storage/'.length))
      : path.join(ROOT, 'public', p);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
      fs.unlinkSync(abs);
      return true;
    }
  } catch (_) { /* ignore */ }
  return false;
}

function validationRules() {
  return ['image', 'mimes:jpeg,jpg,png,gif,webp,svg', 'max:2048']; // 2MB
}

module.exports = { upload, uploadCompressed, delete: del, validationRules };
