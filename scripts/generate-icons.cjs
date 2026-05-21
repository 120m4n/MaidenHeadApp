#!/usr/bin/env node

const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

const root = process.cwd();
const source = path.join(root, 'icon-master.png');

const webSizes = [72, 96, 128, 144, 152, 192, 384, 512];
const androidDensitySizes = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
};

const jobs = [];

async function ensureFile(filePath) {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`Missing source icon: ${filePath}`);
  }
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

function pushResizeJob(input, size, output) {
  jobs.push(
    sharp(input)
      .resize(size, size, {
        fit: 'cover',
        position: 'center',
      })
      .png({ compressionLevel: 9 })
      .toFile(output)
  );
}

async function generateWebIcons(input) {
  const webDir = path.join(root, 'public', 'icons');
  await ensureDir(webDir);

  for (const size of webSizes) {
    const out = path.join(webDir, `icon-${size}x${size}.png`);
    pushResizeJob(input, size, out);
  }
}

async function generateAndroidIcons(input) {
  for (const [density, size] of Object.entries(androidDensitySizes)) {
    const mipmapDir = path.join(root, 'android', 'app', 'src', 'main', 'res', `mipmap-${density}`);
    await ensureDir(mipmapDir);

    // Keep existing Capacitor adaptive icon wiring by updating all referenced PNGs.
    pushResizeJob(input, size, path.join(mipmapDir, 'ic_launcher.png'));
    pushResizeJob(input, size, path.join(mipmapDir, 'ic_launcher_round.png'));
    pushResizeJob(input, size, path.join(mipmapDir, 'ic_launcher_foreground.png'));
  }
}

async function generateIosIcon(input) {
  const appIconDir = path.join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');
  await ensureDir(appIconDir);

  // Current iOS asset catalog uses a single 1024x1024 universal icon.
  pushResizeJob(input, 1024, path.join(appIconDir, 'AppIcon-512@2x.png'));
}

async function main() {
  await ensureFile(source);

  await generateWebIcons(source);
  await generateAndroidIcons(source);
  await generateIosIcon(source);

  await Promise.all(jobs);

  console.log('Icon sets generated from icon-master.png');
  console.log('- Web: public/icons');
  console.log('- Android: android/app/src/main/res/mipmap-*');
  console.log('- iOS: ios/App/App/Assets.xcassets/AppIcon.appiconset');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
