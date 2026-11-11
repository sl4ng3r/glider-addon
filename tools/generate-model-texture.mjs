import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const width = 64;
const height = 64;
const pixels = Buffer.alloc(width * height * 4);

function pixel(x, y, [r, g, b, a = 255]) {
  const index = (y * width + x) * 4;
  pixels[index] = r;
  pixels[index + 1] = g;
  pixels[index + 2] = b;
  pixels[index + 3] = a;
}

function fill(x0, y0, x1, y1, color) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) pixel(x, y, color);
}

// The first 48 pixels of each row are the sail UVs. The rest are wood and straps.
const cloth = [226, 210, 164];
const clothShade = [190, 177, 136];
const green = [43, 86, 66];
const greenLight = [71, 112, 80];
const wood = [106, 65, 38];
fill(0, 0, 48, 20, cloth);
fill(0, 20, 48, 40, clothShade);
fill(48, 0, 64, 32, wood);
fill(48, 32, 64, 64, [55, 45, 34]);

for (let x = 0; x < 48; x++) {
  for (let y = 0; y < 16; y++) {
    const center = Math.abs(x - 23.5);
    const wave = Math.abs(y - 8);
    if (center + wave * 1.5 < 8) pixel(x, y, green);
    else if (center + wave * 1.5 < 10) pixel(x, y, greenLight);
    if (center + wave * 1.5 < 8) pixel(x, y + 20, green);
    else if (center + wave * 1.5 < 10) pixel(x, y + 20, greenLight);
    if (x === 1 || x === 46 || y === 0 || y === 15) pixel(x, y, green);
    if (x === 1 || x === 46 || y === 0 || y === 15) pixel(x, y + 20, green);
  }
}
for (let y = 2; y < 14; y++) {
  const x = 23 + Math.round(Math.sin(y / 2) * 2);
  pixel(x, y, cloth);
  pixel(x + 1, y, cloth);
}
for (let y = 0; y < 32; y++) {
  if (y % 5 === 0) fill(48, y, 64, y + 1, [126, 82, 48]);
  pixel(50, y, [140, 91, 54]);
  pixel(51, y, [78, 48, 30]);
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let value = n;
  for (let i = 0; i < 8; i++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  let crc = 0xffffffff;
  for (const byte of Buffer.concat([name, data])) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, name, data, checksum]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(width, 0);
ihdr.writeUInt32BE(height, 4);
ihdr[8] = 8;
ihdr[9] = 6;
const scanlines = Buffer.alloc(height * (1 + width * 4));
for (let y = 0; y < height; y++) pixels.copy(scanlines, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
writeFileSync(`${root}/resource_packs/windglider_rp/textures/entity/wind_glider.png`, Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(scanlines)),
  chunk("IEND", Buffer.alloc(0)),
]));

const face = (uv, uv_size) => ({ uv, uv_size });
const allFaces = (uv) => Object.fromEntries(["north", "south", "east", "west", "up", "down"].map((name) => [name, face(uv, [1, 1])]));
const woodFaces = allFaces([50, 2]);
const darkWoodFaces = allFaces([51, 2]);
const clothFaces = {
  north: face([0, 20], [10, 2]), south: face([0, 20], [10, 2]),
  east: face([2, 20], [2, 2]), west: face([2, 20], [2, 2]),
  up: face([0, 0], [10, 2]), down: face([0, 20], [10, 2]),
};
const cube = (origin, size, uv) => ({ origin, size, uv });
const sailPanels = [
  { x: -24, width: 7, y: 7.5, z: -7, depth: 12, u: 0 },
  { x: -17, width: 11, y: 9, z: -8, depth: 15, u: 7 },
  { x: -6, width: 12, y: 10, z: -10, depth: 18, u: 18 },
  { x: 6, width: 11, y: 9, z: -8, depth: 15, u: 30 },
  { x: 17, width: 7, y: 7.5, z: -7, depth: 12, u: 41 },
];
const sailSide = face([1, 39], [1, 1]);
const geometry = {
  format_version: "1.16.0",
  "minecraft:geometry": [
    {
      description: {
        identifier: "geometry.wind_glider.folded", texture_width: width, texture_height: height,
        visible_bounds_width: 2, visible_bounds_height: 2, visible_bounds_offset: [0, 1, 0],
      },
      bones: [{
        name: "root", pivot: [0, 19, -6], binding: "q.item_slot_to_bone_name(context.item_slot)",
        cubes: [
          cube([0, 14, -8], [6, 2, 2], clothFaces),
          cube([-0.5, 13.5, -8.2], [7, 0.8, 0.8], woodFaces),
          cube([2, 10.5, -8], [2, 3, 2], darkWoodFaces),
        ],
      }],
    },
    {
      description: {
        identifier: "geometry.wind_glider.open", texture_width: width, texture_height: height,
        visible_bounds_width: 4, visible_bounds_height: 3, visible_bounds_offset: [0, 0.5, 0],
      },
      bones: [
        { name: "root", pivot: [0, 0, 0] },
        {
          name: "canopy", parent: "root", pivot: [0, 8, 0],
          cubes: sailPanels.map(({ x, width: panelWidth, y, z, depth, u }) => cube([x, y, z], [panelWidth, 1.2, depth], {
            up: face([u, 0], [panelWidth, 16]), down: face([u, 20], [panelWidth, 16]),
            north: sailSide, south: sailSide, east: sailSide, west: sailSide,
          })),
        },
        {
          name: "frame", parent: "root", pivot: [0, 0, 0],
          cubes: [
            ...sailPanels.flatMap(({ x, width: panelWidth, y, z, depth }) => [
              cube([x, y - 0.3, z - 0.7], [panelWidth, 0.9, 0.9], woodFaces),
              cube([x, y - 0.3, z + depth - 0.2], [panelWidth, 0.9, 0.9], woodFaces),
            ]),
            cube([-6, 5, -8], [1, 5, 1], woodFaces),
            cube([5, 5, -8], [1, 5, 1], woodFaces),
            cube([-17, 6, -7], [0.6, 3, 0.6], darkWoodFaces),
            cube([16.4, 6, -7], [0.6, 3, 0.6], darkWoodFaces),
          ],
        },
        {
          name: "handles", parent: "root", pivot: [0, 0, 0],
          cubes: [cube([-7, 4.5, -8], [3, 1, 1.5], darkWoodFaces), cube([4, 4.5, -8], [3, 1, 1.5], darkWoodFaces)],
        },
      ],
    },
  ],
};
writeFileSync(`${root}/resource_packs/windglider_rp/models/entity/wind_glider.geo.json`, `${JSON.stringify(geometry, null, 2)}\n`);
