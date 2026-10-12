// Imports the Hobit1 website catalogue (frontend/src/data/hobit1Services.js) into the admin tables:
//   6 categories  -> service_categories     every item -> services (service_group = sub-category)
// Run:  npm run db:seed-services
// Safe to re-run: categories are matched by slug, services by (category, sub-category, name) and updated in place.
require('dotenv').config();
process.env.TZ = 'Asia/Kolkata';
const path = require('path');
const { pathToFileURL } = require('url');
const { sequelize, ServiceCategory, Service, City } = require('../src/models');

const DATA_FILE = path.resolve(__dirname, '../../frontend/src/data/hobit1Services.js');

// "4–10 hrs (by home size)" -> 240, "15–45 min" -> 15, "Inspection 30 min; ..." -> 30, "1–2 days" -> null
function parseDurationMinutes(text) {
  const m = /(\d+)(?:\s*[–-]\s*\d+)?\s*(min|hrs?|hours?)/i.exec(text || '');
  if (!m) return null;
  return /^min/i.test(m[2]) ? Number(m[1]) : Number(m[1]) * 60;
}

// Same "Read more" details the website builds, so the admin sees everything about the service.
function buildDescription(item, sub) {
  const lines = [item.description];
  if (item.unit) lines.push(`Pricing: ${item.unit}`);
  if (item.priceType === 'inspection') lines.push('Inspection + quote: the final price is given after the visit.');
  if (sub.duration) lines.push(`Duration: ${sub.duration}`);
  if (sub.included?.length) lines.push('', 'Included:', ...sub.included.map((x) => `- ${x}`));
  if (sub.excluded?.length) lines.push('', 'Not included:', ...sub.excluded.map((x) => `- ${x}`));
  if (sub.faqs?.length) {
    lines.push('', 'FAQs:');
    sub.faqs.forEach((f) => lines.push(`Q: ${f.q}`, `A: ${f.a}`));
  }
  return lines.join('\n');
}

async function main() {
  const { hobit1Categories } = await import(pathToFileURL(DATA_FILE).href);
  await sequelize.authenticate();

  // Website catalogue is for Nashik: link the services to that city when it exists.
  const cities = await City.findAll();
  const nashik = cities.filter((c) => /nashik/i.test(c.name || c.city_name || ''));
  if (!nashik.length) console.warn('! No "Nashik" city found - services are created without a city link.');

  let created = 0, updated = 0;
  for (const cat of hobit1Categories) {
    const [category] = await ServiceCategory.findOrCreate({
      where: { slug: cat.slug },
      defaults: { name: cat.name, icon: cat.icon, description: `${cat.name} services`, status: 1 },
    });

    for (const sub of cat.subCategories) {
      for (const item of sub.items) {
        const values = {
          category_id: category.id,
          name: item.name,
          service_group: sub.name,
          description: buildDescription(item, sub),
          duration_minutes: parseDurationMinutes(sub.duration),
          price: item.price ?? 0,
          service_type: item.priceType,
          size_type: item.unit ? item.unit.slice(0, 50) : null,
          icons: [sub.icon].filter(Boolean),
          images: cat.image ? [cat.image] : [],
          status: 1,
        };
        let service = await Service.findOne({
          where: { category_id: category.id, service_group: sub.name, name: item.name },
        });
        if (service) {
          await service.update(values);
          updated++;
        } else {
          service = await Service.create(values);
          created++;
        }
        if (nashik.length) await service.addCities(nashik);
      }
    }
    console.log(`✓ ${cat.name}`);
  }

  console.log(`Done: ${created} services created, ${updated} updated.`);
  await sequelize.close();
}

main().catch(async (err) => {
  console.error(err);
  await sequelize.close().catch(() => {});
  process.exit(1);
});
