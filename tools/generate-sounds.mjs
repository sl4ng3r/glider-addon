import { mkdirSync, writeFileSync } from "node:fs";

const outputDir = new URL("../resource_packs/windglider_rp/sounds/", import.meta.url);
mkdirSync(outputDir, { recursive: true });

function wave({ duration, frequency, volume }) {
  const sampleRate = 22050;
  const samples = Math.floor(sampleRate * duration);
  const data = Buffer.alloc(samples * 2);
  for (let i = 0; i < samples; i += 1) {
    const t = i / sampleRate;
    const envelope = Math.min(1, t * 35) * Math.min(1, (duration - t) * 18);
    const sample = Math.sin(2 * Math.PI * frequency * t) * envelope * volume;
    data.writeInt16LE(Math.max(-1, Math.min(1, sample)) * 32767, i * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

writeFileSync(new URL("wind_glider_open.wav", outputDir), wave({ duration: 0.24, frequency: 420, volume: 0.25 }));
writeFileSync(new URL("wind_glider_close.wav", outputDir), wave({ duration: 0.18, frequency: 250, volume: 0.2 }));
writeFileSync(new URL("wind_glider_wind.wav", outputDir), wave({ duration: 0.6, frequency: 140, volume: 0.08 }));
