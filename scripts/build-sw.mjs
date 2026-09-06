import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root = path.resolve('dist/client');
if (!fs.existsSync(path.join(root, 'index.html')))
  throw new Error('Static export index.html was not generated');
function walk(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((f) =>
      f.isDirectory() ? walk(path.join(dir, f.name)) : [path.join(dir, f.name)],
    );
}
const files = walk(root).filter(
  (f) => !f.endsWith('sw.js') && !f.endsWith('.map'),
);
const urls = files.map(
  (f) => '/' + path.relative(root, f).split(path.sep).join('/'),
);
const hash = crypto.createHash('sha256');
for (const f of files) hash.update(fs.readFileSync(f));
const version = 'animal-garage-' + hash.digest('hex').slice(0, 16);
const worker = `const CACHE=${JSON.stringify(version)};
const ASSETS=${JSON.stringify(urls)};
async function cachedPage(pathname){
 const clean=pathname.replace(/\\/$/,'');
 for(const key of [pathname,clean+'/index.html',clean+'.html','/index.html']){
  const hit=await caches.match(key);if(hit)return hit;
 }
 return new Response('Offline files are not available',{status:503});
}
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('animal-garage-')&&key!==CACHE).map(key=>caches.delete(key)))),self.clients.claim()])));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 if(event.request.mode==='navigate'){
  event.respondWith(fetch(event.request).then(response=>response.ok?response:cachedPage(url.pathname)).catch(()=>cachedPage(url.pathname)));return;
 }
 if(ASSETS.includes(url.pathname))event.respondWith(caches.match(url.pathname).then(hit=>hit||fetch(event.request)));
});
`;
fs.writeFileSync(path.join(root, 'sw.js'), worker);
console.log(
  `Offline shell: ${urls.length} assets, ${(files.reduce((sum, f) => sum + fs.statSync(f).size, 0) / 1024 / 1024).toFixed(2)} MB; ${version}`,
);
