// === parseCubeLUT.ts ===
// Skateraded LUT parser — supports .cube LUTs (17x17x17, 33x33x33, or 65x65x65)
// Converts file into Float32Array ready for WebGL upload.

export type ParsedLUT = {
  title: string;
  size: number;
  data: Float32Array;
};

/**
 * Parses a standard .CUBE LUT file into normalized RGB values.
 * @param file Input File object (.cube)
 */
export async function parseCubeLUT(file: File): Promise<ParsedLUT> {
  const text = await file.text();
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));

  let title = "Untitled LUT";
  let size = 33;
  const values: number[] = [];

  for (const line of lines) {
    if (line.startsWith("TITLE")) {
      const match = line.match(/"(.*)"/);
      if (match) title = match[1];
    } else if (line.startsWith("LUT_3D_SIZE")) {
      const match = line.match(/(\d+)/);
      if (match) size = parseInt(match[1], 10);
    } else if (/^[\d.\s-]+$/.test(line)) {
      const nums = line.split(/\s+/).map(parseFloat);
      if (nums.length === 3) values.push(...nums);
    }
  }

  // Normalize LUT data (just in case values are outside [0,1])
  const normalized = new Float32Array(values.map((v) => Math.min(Math.max(v, 0), 1)));

  if (normalized.length !== size ** 3 * 3) {
    console.warn(
      `⚠️ Unexpected LUT data length (${normalized.length}), expected ${size ** 3 * 3}`
    );
  }

  console.log(`🎨 Parsed LUT "${title}" (${size}³) with ${normalized.length} values`);
  return { title, size, data: normalized };
}
