import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

/**
 * Generates the site's icons and default social card from one piece of geometry.
 *
 * A six-blade aperture, drawn rather than hand-placed: the blade seams are computed from
 * the hexagon they surround, so the swirl is actually correct instead of approximately
 * correct. Committing a script alongside the assets means the mark can be re-rendered at
 * any size without redrawing it.
 *
 *   yarn icons
 *
 * Colours come from the site palette: warm print-paper white on the brown-black ground.
 */

const INK = "#100d0a";
const PAPER = "#ede8e0";
const DIM = "#948a7e";

interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * The aperture mark as an SVG path pair: a filled disc with a hexagonal opening cut out,
 * plus the blade seams.
 *
 * Solid rather than stroked. A stroked outline is prettier at 512px and vanishes at 16px,
 * which is the size that actually matters for a favicon.
 */
function apertureSvg(size: number, opacity = 1): string {
  const c = size / 2;
  const outer = size * 0.46;
  // The opening. Large enough to read as a hole at 16px rather than filling in.
  const inner = size * 0.2;

  const vertex = (i: number): Point => {
    const angle = (Math.PI / 180) * (30 + 60 * i);
    return { x: c + inner * Math.cos(angle), y: c + inner * Math.sin(angle) };
  };

  // Hexagonal opening.
  const hex = Array.from({ length: 6 }, (_, i) => vertex(i))
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(" ");

  /**
   * Each seam continues the line of one hexagon edge outward to the rim. That extension
   * is what produces an aperture's characteristic swirl -- six radial spokes would just
   * look like a wheel.
   */
  const seams = Array.from({ length: 6 }, (_, i) => {
    const from = vertex(i);
    const previous = vertex((i + 5) % 6);

    const dx = from.x - previous.x;
    const dy = from.y - previous.y;
    const length = Math.hypot(dx, dy);
    const ux = dx / length;
    const uy = dy / length;

    // Distance from this vertex along the edge direction until it meets the outer circle.
    const px = from.x - c;
    const py = from.y - c;
    const b = px * ux + py * uy;
    const t = -b + Math.sqrt(b * b - (px * px + py * py - outer * outer));

    const to = { x: from.x + ux * t, y: from.y + uy * t };
    return `M${from.x.toFixed(2)},${from.y.toFixed(2)} L${to.x.toFixed(2)},${to.y.toFixed(2)}`;
  }).join(" ");

  return `
    <g opacity="${String(opacity)}">
      <path
        d="M${String(c)},${(c - outer).toFixed(2)} a${outer.toFixed(2)},${outer.toFixed(2)} 0 1,0 0.01,0 z ${hex}"
        fill="${PAPER}" fill-rule="evenodd" />
      <path d="${seams}" stroke="${INK}" stroke-width="${(size * 0.035).toFixed(2)}" fill="none" stroke-linecap="butt" />
    </g>`;
}

/** Square icon: the mark on the site's ground, edge to edge. */
function iconSvg(size: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${String(size)}" height="${String(size)}" viewBox="0 0 ${String(size)} ${String(size)}">
  <rect width="${String(size)}" height="${String(size)}" fill="${INK}"/>
  ${apertureSvg(size)}
</svg>`;
}

/**
 * The default social card, used by pages that have no photograph of their own -- About,
 * Gear, the 404. Without it those links preview as a blank rectangle.
 *
 * Text is set in a generic serif stack rather than the site's webfont, because this is
 * rasterised by librsvg using system fonts and a missing family would silently render
 * nothing at all.
 */
function ogSvg(): string {
  const width = 1200;
  const height = 630;
  const mark = 200;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${String(width)}" height="${String(height)}" viewBox="0 0 ${String(width)} ${String(height)}">
  <rect width="${String(width)}" height="${String(height)}" fill="${INK}"/>
  <g transform="translate(96, ${String((height - mark) / 2)})">
    ${apertureSvg(mark)}
  </g>
  <g transform="translate(360, ${String(height / 2)})">
    <text x="0" y="-18" fill="${PAPER}" font-family="Georgia, 'Times New Roman', serif" font-size="76" font-weight="400">Dhruv Chheda</text>
    <text x="0" y="34" fill="${DIM}" font-family="Georgia, 'Times New Roman', serif" font-size="30" letter-spacing="6">PHOTOGRAPHY</text>
    <rect x="0" y="66" width="180" height="2" fill="${DIM}" opacity="0.5"/>
    <text x="0" y="118" fill="${DIM}" font-family="Georgia, 'Times New Roman', serif" font-size="26">Travel, street, landscape and portrait work</text>
  </g>
</svg>`;
}

async function main(): Promise<void> {
  const appDir = path.join(process.cwd(), "src", "app");

  // SVG favicon: scales to any tab size from one file.
  await fs.writeFile(path.join(appDir, "icon.svg"), `${iconSvg(64)}\n`, "utf8");
  console.log("  wrote src/app/icon.svg");

  // PNG fallback for anything that ignores SVG favicons.
  await sharp(Buffer.from(iconSvg(180)))
    .resize(48, 48)
    .png()
    .toFile(path.join(appDir, "icon.png"));
  console.log("  wrote src/app/icon.png        48x48");

  // iOS home-screen icon. 180x180 is the size Apple asks for.
  await sharp(Buffer.from(iconSvg(180)))
    .png()
    .toFile(path.join(appDir, "apple-icon.png"));
  console.log("  wrote src/app/apple-icon.png  180x180");

  await sharp(Buffer.from(ogSvg()))
    .png()
    .toFile(path.join(appDir, "opengraph-image.png"));
  console.log("  wrote src/app/opengraph-image.png  1200x630");
}

main().catch((error: unknown) => {
  console.error(
    `\nIcon generation failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
