// Replaces Laravel Storage::disk('public'), asset('storage/...') and public_path('uploads/...').
// Files arrive from multer as memory files ({ buffer, originalname, mimetype, size, fieldname }).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');

const ROOT = path.resolve(__dirname, '../../');
const PUBLIC_DIR = path.join(ROOT, 'storage', 'app', 'public'); // served at /storage/*
const UPLOADS_DIR = path.join(ROOT, 'public', 'uploads'); // served at /uploads/*
[PUBLIC_DIR, UPLOADS_DIR].forEach((d) => fs.mkdirSync(d, { recursive: true }));

const ext = (name) => path.extname(name || '').toLowerCase();
// UploadedFile::hashName() uses guessExtension() (content based); fall back to the client extension for unknown content.
function guessExt(file) {
  const b = file && file.buffer;
  if (b && b.length > 4) {
    const h = b.subarray(0, 12);
    const t = (a, z) => h.subarray(a, z).toString('latin1');
    if (h[0] === 0xff && h[1] === 0xd8 && h[2] === 0xff) return '.jpg';
    if (h[0] === 0x89 && t(1, 4) === 'PNG') return '.png';
    if (t(0, 4) === 'GIF8') return '.gif';
    if (t(0, 2) === 'BM') return '.bmp';
    if (t(0, 4) === 'RIFF' && t(8, 12) === 'WEBP') return '.webp';
    if (t(0, 4) === '%PDF') return '.pdf';
    const head = b.subarray(0, 512).toString('utf8').trimStart().toLowerCase();
    if (head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'))) return '.svg';
  }
  return ext(file && file.originalname);
}
// Str::random(40) (alphanumeric) for UploadedFile::hashName()
const ALNUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const randAlnum = (n = 40) => Array.from(crypto.randomBytes(n), (b) => ALNUM[b % 62]).join('');
const rand = () => crypto.randomBytes(20).toString('hex');

// $file->store('dir', 'public')  -> returns relative path, e.g. "banners/abc.jpg"
function storePublic(file, dir = '', filename) {
  const rel = path.posix.join(dir, filename || randAlnum(40) + guessExt(file));
  const abs = path.join(PUBLIC_DIR, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, file.buffer);
  return rel;
}

// $file->move(public_path('uploads/dir'), $name) -> returns "uploads/dir/name"
function moveToUploads(file, dir = '', filename) {
  const name = filename || `${Date.now()}_${rand().slice(0, 8)}${ext(file.originalname)}`;
  const abs = path.join(UPLOADS_DIR, dir, name);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, file.buffer);
  return path.posix.join('uploads', dir, name);
}

const deletePublic = (rel) => {
  try { if (rel) fs.unlinkSync(path.join(PUBLIC_DIR, rel)); } catch (_) { /* ignore */ }
};
const deleteUpload = (rel) => {
  try { if (rel) fs.unlinkSync(path.join(ROOT, 'public', String(rel).replace(/^\/+/, ''))); } catch (_) { /* ignore */ }
};
const existsPublic = (rel) => !!rel && fs.existsSync(path.join(PUBLIC_DIR, rel));

// asset('storage/' . $rel)  and  asset($rel)
const storageUrl = (rel) =>
  rel ? (/^https?:\/\//.test(rel) ? rel : `${config.appUrl}/storage/${String(rel).replace(/^\/+/, '')}`) : null;
const assetUrl = (rel) =>
  rel ? (/^https?:\/\//.test(rel) ? rel : `${config.appUrl}/${String(rel).replace(/^\/+/, '')}`) : null;

module.exports = {
  ROOT, PUBLIC_DIR, UPLOADS_DIR,
  storePublic, moveToUploads, deletePublic, deleteUpload, existsPublic, storageUrl, assetUrl,
};
