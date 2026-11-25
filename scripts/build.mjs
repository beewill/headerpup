// Builds one browser target into <target>/dist/.
//   node scripts/build.mjs gecko    (Firefox)
//   node scripts/build.mjs webkit   (Chrome / Chromium)
//
// Each entry is built as a self-contained IIFE bundle (no shared chunks, no
// module loading in the background context), then static assets are copied.
import { build } from 'vite';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const targets = {
  gecko: { viteTarget: 'firefox128', prelude: null },
  // Chromium needs `browser` aliased to `chrome`; the shim is prepended to every entry.
  webkit: { viteTarget: 'chrome120', prelude: 'webkit/browser-shim.ts' },
};

const targetName = process.argv[2];
const target = targets[targetName];
if (!target) {
  console.error(`Usage: build.mjs <${Object.keys(targets).join('|')}>`);
  process.exit(1);
}

const dist = resolve(root, targetName, 'dist');
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

const entries = {
  background: 'src/background/index.ts',
  popup: 'src/popup/popup.ts',
  options: 'src/options/options.ts',
};

for (const [name, entry] of Object.entries(entries)) {
  await build({
    root,
    configFile: false,
    logLevel: 'warn',
    plugins: target.prelude ? [prelude(resolve(root, target.prelude), resolve(root, entry))] : [],
    build: {
      outDir: dist,
      emptyOutDir: false,
      minify: false,
      sourcemap: false,
      target: target.viteTarget,
      lib: {
        entry: resolve(root, entry),
        name: `HeaderPup_${name}`,
        formats: ['iife'],
        fileName: () => `${name}.js`,
      },
    },
  });
}

cpSync(resolve(root, targetName, 'manifest.json'), resolve(dist, 'manifest.json'));
cpSync(resolve(root, 'src/popup/popup.html'), resolve(dist, 'popup.html'));
cpSync(resolve(root, 'src/popup/popup.css'), resolve(dist, 'popup.css'));
cpSync(resolve(root, 'src/options/options.html'), resolve(dist, 'options.html'));
cpSync(resolve(root, 'src/options/options.css'), resolve(dist, 'options.css'));
cpSync(resolve(root, 'assets/pup-p.png'), resolve(dist, 'pup-p.png'));

// Rasterize the SVG icon sources to PNGs. The 16px size uses a simplified
// drawing so the face stays readable. Requires `inkscape` or ImageMagick.
mkdirSync(resolve(dist, 'icons'), { recursive: true });
for (const size of [16, 32, 48, 96, 128]) {
  const svg = resolve(root, size <= 16 ? 'assets/icon-small.svg' : 'assets/icon.svg');
  rasterize(svg, size, resolve(dist, 'icons', `icon-${size}.png`));
}

/** Vite plugin: injects `import '<shim>'` at the top of one specific entry module. */
function prelude(shim, entry) {
  return {
    name: 'headerpup-prelude',
    enforce: 'pre',
    transform(code, id) {
      if (id !== entry) return null;
      return { code: `import ${JSON.stringify(shim)};\n${code}`, map: null };
    },
  };
}

function rasterize(svg, size, out) {
  const attempts = [
    ['inkscape', [svg, '--export-type=png', `--export-width=${size}`, `--export-filename=${out}`]],
    ['magick', ['-background', 'none', '-density', '1536', svg, '-resize', `${size}x${size}`, out]],
    ['convert', ['-background', 'none', '-density', '1536', svg, '-resize', `${size}x${size}`, out]],
  ];
  for (const [cmd, args] of attempts) {
    const r = spawnSync(cmd, args, { stdio: 'ignore' });
    if (r.status === 0 && existsSync(out)) return;
  }
  throw new Error('Could not rasterize icons: install inkscape or ImageMagick.');
}
