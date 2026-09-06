import fs from 'node:fs';
import path from 'node:path';
export function staticPath(root, pathname) {
  const resolved = path.resolve(root, '.' + pathname);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) return null;
  const candidates = [resolved, path.join(resolved, 'index.html')];
  // Vinext emits parents.html rather than parents/index.html.
  if (!path.extname(resolved))
    candidates.push(resolved.replace(/[\\/]+$/, '') + '.html');
  return (
    candidates.find(
      (file) => fs.existsSync(file) && fs.statSync(file).isFile(),
    ) ?? null
  );
}
