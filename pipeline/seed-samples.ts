import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

/**
 * Regenerates the placeholder originals that back the committed sample content.
 *
 * `originals/` and `public/images/` are both gitignored -- raw files and derivatives have
 * no business in git -- but `content/photos.json` *is* committed. Without this, a fresh
 * clone would render the sample entries as broken frames. Generating the files from a
 * script keeps the repository free of binaries while still letting anyone run:
 *
 *   yarn seed:samples && yarn ingest --local && yarn dev
 *
 * and get a working site with no credentials and no photographs of their own.
 *
 * The EXIF written here is what makes the samples useful: it exercises the extraction
 * path, the rebate strips and the shooting-notes panel with real values rather than nulls.
 */

interface SampleFrame {
  readonly file: string;
  readonly width: number;
  readonly height: number;
  readonly from: string;
  readonly to: string;
  readonly exif: Record<string, string>;
}

// Deliberately mixed orientations, so the grid, the aspect-ratio handling and the
// portrait path all get exercised rather than three identical landscapes.
const FRAMES: readonly SampleFrame[] = [
  {
    file: "harbour-at-dawn.jpg",
    width: 3000,
    height: 2000,
    from: "#2a3340",
    to: "#c89a6a",
    exif: {
      DateTimeOriginal: "2025:01:15 06:12:00",
      FNumber: "2.8",
      ExposureTime: "0.004",
      ISOSpeedRatings: "200",
      FocalLength: "23",
      LensModel: "XF23mmF2 R WR",
    },
  },
  {
    file: "night-crossing.jpg",
    width: 2400,
    height: 3000,
    from: "#12161c",
    to: "#5a4632",
    exif: {
      DateTimeOriginal: "2025:02:03 20:41:00",
      FNumber: "1.4",
      ExposureTime: "0.02",
      ISOSpeedRatings: "3200",
      FocalLength: "35",
      LensModel: "XF35mmF1.4 R",
    },
  },
  {
    file: "ridge-line.jpg",
    width: 3000,
    height: 1700,
    from: "#1b2420",
    to: "#8fa08a",
    exif: {
      DateTimeOriginal: "2024:11:22 16:58:00",
      FNumber: "8",
      ExposureTime: "0.008",
      ISOSpeedRatings: "160",
      FocalLength: "55",
      LensModel: "XF55-200mmF3.5-4.8 R LM OIS",
    },
  },
];

function gradientSvg(frame: SampleFrame): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${String(frame.width)}" height="${String(frame.height)}">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stop-color="${frame.from}"/>
          <stop offset="100%" stop-color="${frame.to}"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
    </svg>`,
  );
}

async function main(): Promise<void> {
  const originalsDir = path.join(process.cwd(), "originals");
  await fs.mkdir(originalsDir, { recursive: true });

  for (const frame of FRAMES) {
    await sharp(gradientSvg(frame))
      .withExif({
        IFD0: { Make: "FUJIFILM", Model: "X-T30" },
        IFD2: frame.exif,
      })
      .jpeg({ quality: 92 })
      .toFile(path.join(originalsDir, frame.file));

    console.log(`  wrote originals/${frame.file}`);
  }

  console.log(
    `\nNow run \`yarn ingest --local\` to generate derivatives from them.`,
  );
}

main().catch((error: unknown) => {
  console.error(
    `\nSeeding failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
