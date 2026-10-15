import fs from 'node:fs';
import zlib from 'node:zlib';

const src = fs.readFileSync('../PITWISE Dashboard.html', 'utf8');
const grab = (type) => {
  const re = new RegExp(`<script type="__bundler/${type}">\\s*([\\s\\S]*?)\\s*</script>`);
  return JSON.parse(src.match(re)[1]);
};

fs.writeFileSync('design-reference.html', grab('template'));
const manifest = grab('manifest');
const ext = grab('ext_resources');
const byId = Object.fromEntries(ext.map(e => [e.id, e.uuid]));
fs.mkdirSync('public/brand', { recursive: true });
fs.mkdirSync('public/tyres', { recursive: true });
fs.mkdirSync('design-assets', { recursive: true });

const write = (uuid, out) => {
  const a = manifest[uuid];
  let buf = Buffer.from(a.data, 'base64');
  if (a.compressed) buf = zlib.gunzipSync(buf);
  fs.writeFileSync(out, buf);
  console.log('wrote', out, a.mime, (buf.length / 1024 | 0) + 'KB');
};
console.log('ext ids:', Object.keys(byId).join(', '));
for (const [id, uuid] of Object.entries(byId)) {
  if (id.startsWith('tyre')) write(uuid, `public/tyres/${id.replace('tyre', '').toLowerCase()}.png`);
}
for (const [uuid, a] of Object.entries(manifest)) {
  if (Object.values(byId).includes(uuid)) continue;
  if (a.mime === 'image/png') write(uuid, `public/brand/${uuid.slice(0, 8)}.png`);
  else console.log('other asset', uuid.slice(0, 8), a.mime, (a.data.length / 1024 | 0) + 'KB b64');
}
