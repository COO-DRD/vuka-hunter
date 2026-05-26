#!/usr/bin/env node
/**
 * Hunter Brand Asset Generator
 * Produces all icon and wordmark PNGs from SVG sources.
 * Run: node scripts/generate-brand.js
 */

const fs   = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const RED   = "#DC2626";
const DARK  = "#09090b";
const WHITE = "#ffffff";
const LIGHT = "#f4f4f5";
const MONTSERRAT = "/usr/share/fonts/julietaula-montserrat-fonts/Montserrat-Bold.otf";

const OUT_ICONS = path.join(__dirname, "../public/icons");
const OUT_BRAND = path.join(__dirname, "../public/brand");
fs.mkdirSync(OUT_ICONS, { recursive: true });
fs.mkdirSync(OUT_BRAND, { recursive: true });

// Lucide Zap path on a 24×24 grid
const ZAP = "M13 2L3 14h9l-1 8 10-12h-9l1-8z";

function zapTransform(canvasSize, fill, pct = 0.72) {
  const scale = (canvasSize * pct) / 20; // bolt is ~20 units tall on 24-grid
  const tx    = canvasSize / 2 - 12 * scale;
  const ty    = canvasSize / 2 - 12 * scale;
  return `<g transform="translate(${tx.toFixed(2)},${ty.toFixed(2)}) scale(${scale.toFixed(4)})">
    <path d="${ZAP}" fill="${fill}" stroke="${fill}" stroke-width="0.4" stroke-linejoin="round"/>
  </g>`;
}

// ─── SVG builders ────────────────────────────────────────────────────────────

/** Full app icon: dark rounded sq → red badge → white bolt */
function appIconSVG(size) {
  const bgRx    = (size * 96) / 512;
  const pad     = (size * 86) / 512;
  const badge   = size - pad * 2;
  const badgeRx = (size * 56) / 512;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${bgRx.toFixed(1)}" fill="${DARK}"/>
  <rect x="${pad.toFixed(1)}" y="${pad.toFixed(1)}" width="${badge.toFixed(1)}" height="${badge.toFixed(1)}" rx="${badgeRx.toFixed(1)}" fill="${RED}"/>
  ${zapTransform(size, WHITE, 0.60)}
</svg>`;
}

/** Favicon: pure red rounded sq → white bolt (no dark border, crisp at 16-32px) */
function faviconSVG(size) {
  const rx   = Math.max(2, Math.round(size * 0.18));
  const pct  = size <= 16 ? 0.78 : 0.74;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${rx}" fill="${RED}"/>
  ${zapTransform(size, WHITE, pct)}
</svg>`;
}

/** On-light variant: white rounded sq → red badge → white bolt */
function lightIconSVG(size) {
  const bgRx    = (size * 96) / 512;
  const pad     = (size * 60) / 512;
  const badge   = size - pad * 2;
  const badgeRx = (size * 56) / 512;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${bgRx.toFixed(1)}" fill="${LIGHT}"/>
  <rect x="${pad.toFixed(1)}" y="${pad.toFixed(1)}" width="${badge.toFixed(1)}" height="${badge.toFixed(1)}" rx="${badgeRx.toFixed(1)}" fill="${RED}"/>
  ${zapTransform(size, WHITE, 0.62)}
</svg>`;
}

/** Transparent bg: just the red badge + bolt, no outer square */
function iconTransparentSVG(size) {
  const pad     = (size * 0) / 512;
  const badge   = size - pad * 2;
  const badgeRx = (size * 80) / 512;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect x="${pad.toFixed(1)}" y="${pad.toFixed(1)}" width="${badge.toFixed(1)}" height="${badge.toFixed(1)}" rx="${badgeRx.toFixed(1)}" fill="${RED}"/>
  ${zapTransform(size, WHITE, 0.62)}
</svg>`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function writeSVG(name, svg) {
  const p = path.join(OUT_BRAND, name);
  fs.writeFileSync(p, svg);
  return p;
}

function svgToPng(svgPath, outPng, size) {
  execSync(
    `magick -background none -density 144 "${svgPath}" -resize ${size}x${size} "${outPng}"`,
    { stdio: "pipe" }
  );
  console.log(`  ✓ ${path.relative(process.cwd(), outPng)}`);
}

function renderTo(name, svg, outPng, size) {
  const svgPath = path.join(OUT_BRAND, `_tmp_${name}.svg`);
  fs.writeFileSync(svgPath, svg);
  svgToPng(svgPath, outPng, size);
  fs.unlinkSync(svgPath);
}

// ─── Wordmark builder via ImageMagick text compositing ───────────────────────

function makeWordmark(outPath, bgColor, textColor) {
  // 1600×440 canvas — icon left, wordmark right with generous tracking
  const iconSize = 340;
  const canvasW  = 1600;
  const canvasH  = 440;
  const iconPad  = Math.round((canvasH - iconSize) / 2);
  const fontSize = 172;
  const textX    = iconSize + 48;
  const textY    = Math.round(canvasH * 0.685);

  const iconSvg = bgColor === WHITE || bgColor === LIGHT ? lightIconSVG(iconSize) : appIconSVG(iconSize);
  const iconTmp = path.join(OUT_BRAND, "_wm_icon.svg");
  fs.writeFileSync(iconTmp, iconSvg);

  execSync(
    `magick ` +
    `-size ${canvasW}x${canvasH} xc:"${bgColor}" ` +
    `\\( -background none -density 144 "${iconTmp}" -resize ${iconSize}x${iconSize} \\) ` +
    `-gravity NorthWest -geometry +${iconPad}+${iconPad} -composite ` +
    `-font "${MONTSERRAT}" -pointsize ${fontSize} ` +
    `-fill "${textColor}" -kerning 8 ` +
    `-draw "text ${textX},${textY} 'HUNTER'" ` +
    `"${outPath}"`,
    { stdio: "pipe" }
  );
  fs.unlinkSync(iconTmp);
  console.log(`  ✓ ${path.relative(process.cwd(), outPath)}`);
}

// ─── Generate ────────────────────────────────────────────────────────────────

console.log("\n🎨  Generating Hunter brand assets…\n");

// PWA / app icons
console.log("App icons:");
renderTo("icon512",  appIconSVG(512), path.join(OUT_ICONS, "icon-512.png"),         512);
renderTo("icon512",  appIconSVG(512), path.join(OUT_ICONS, "icon-192.png"),         192);
renderTo("icon512",  appIconSVG(512), path.join(OUT_ICONS, "apple-touch-icon.png"), 180);

// Favicons
console.log("\nFavicons:");
renderTo("fav32",  faviconSVG(32), path.join(OUT_ICONS, "favicon-32.png"), 32);
renderTo("fav16",  faviconSVG(16), path.join(OUT_ICONS, "favicon-16.png"), 16);

// Brand package — full-res originals
console.log("\nBrand package:");
const svgDark = appIconSVG(512);
const svgLight = lightIconSVG(512);
const svgTransp = iconTransparentSVG(512);

renderTo("dark512",  svgDark,   path.join(OUT_BRAND, "icon-dark-512.png"),        512);
renderTo("light512", svgLight,  path.join(OUT_BRAND, "icon-light-512.png"),       512);
renderTo("transp512",svgTransp, path.join(OUT_BRAND, "icon-transparent-512.png"), 512);
renderTo("dark256",  svgDark,   path.join(OUT_BRAND, "icon-dark-256.png"),        256);
renderTo("dark128",  svgDark,   path.join(OUT_BRAND, "icon-dark-128.png"),        128);

// Save clean SVG sources
fs.writeFileSync(path.join(OUT_BRAND, "icon-dark.svg"),        appIconSVG(512));
fs.writeFileSync(path.join(OUT_BRAND, "icon-light.svg"),       lightIconSVG(512));
fs.writeFileSync(path.join(OUT_BRAND, "icon-transparent.svg"), iconTransparentSVG(512));
console.log(`  ✓ public/brand/icon-dark.svg`);
console.log(`  ✓ public/brand/icon-light.svg`);
console.log(`  ✓ public/brand/icon-transparent.svg`);

// Wordmarks
console.log("\nWordmarks:");
makeWordmark(path.join(OUT_BRAND, "wordmark-dark.png"),  DARK,  WHITE);
makeWordmark(path.join(OUT_BRAND, "wordmark-light.png"), LIGHT, DARK);

// favicon.ico (multi-size, browsers pick best)
console.log("\nfavicon.ico:");
const ico16 = path.join(OUT_BRAND, "_tmp_ico16.svg");
const ico32 = path.join(OUT_BRAND, "_tmp_ico32.svg");
const ico48 = path.join(OUT_BRAND, "_tmp_ico48.svg");
fs.writeFileSync(ico16, faviconSVG(16));
fs.writeFileSync(ico32, faviconSVG(32));
fs.writeFileSync(ico48, faviconSVG(48));
execSync(
  `magick "${ico16}" "${ico32}" "${ico48}" "${path.join(process.cwd(), "public/favicon.ico")}"`,
  { stdio: "pipe" }
);
[ico16, ico32, ico48].forEach(f => fs.unlinkSync(f));
console.log(`  ✓ public/favicon.ico`);

console.log("\n✅  Brand package complete → public/brand/\n");
