// multer (memory storage) - handlers then persist with utils/storage.
//   router.post('/x', upload.any(), handler)          // array of middleware; Express accepts arrays, spreading also works
//   router.post('/y', upload.single('image'), handler)
// upload.any() accepts any field names and normalises "images[]" -> "images".
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const normaliseFiles = (req, res, next) => {
  if (Array.isArray(req.files)) req.files.forEach((f) => { if (f.rawFieldname === undefined) f.rawFieldname = f.fieldname; f.fieldname = f.fieldname.replace(/\[\d*\]$/, ''); });
  next();
};

const rawAny = upload.any.bind(upload); // keep multer's own any() before we replace it

const { cleanBody } = require('./request');
const wrap = (name) => { const raw = upload[name].bind(upload); upload[name] = (...args) => [raw(...args), cleanBody]; };
['single', 'array', 'fields', 'none'].forEach(wrap);

upload.any = () => [rawAny(), normaliseFiles, cleanBody];
upload.anyFiles = upload.any;
upload.normaliseFiles = normaliseFiles;

module.exports = upload;
