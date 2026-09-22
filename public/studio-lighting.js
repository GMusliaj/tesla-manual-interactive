import * as T from 'three';

// Broad studio softboxes, generated locally in linear light. A continuous
// environment avoids hard room silhouettes popping across curved glass/paint.
export function studioEnvironment(renderer) {
  const width = 512, height = 256, pixels = new Float32Array(width * height * 4);
  const boxes = [
    {azimuth: -2.25, elevation: .7, width: .7, height: .38, power: 2.8},
    {azimuth: .65, elevation: .5, width: .8, height: .46, power: 1.7},
    {azimuth: 2.35, elevation: 1.0, width: .9, height: .42, power: 2.0},
  ];
  for (let y = 0; y < height; y++) {
    const elevation = (y / (height - 1) - .5) * Math.PI;
    const base = .075 + .22 * Math.max(0, Math.sin(elevation));
    for (let x = 0; x < width; x++) {
      const azimuth = (x / width - .5) * Math.PI * 2;
      let value = base;
      for (const box of boxes) {
        const dx = Math.atan2(Math.sin(azimuth - box.azimuth), Math.cos(azimuth - box.azimuth)) / box.width;
        const dy = (elevation - box.elevation) / box.height;
        value += box.power * Math.exp(-.5 * (dx * dx + dy * dy));
      }
      const i = (y * width + x) * 4;
      pixels[i] = value; pixels[i + 1] = value * .99; pixels[i + 2] = value * .98; pixels[i + 3] = 1;
    }
  }
  const source = new T.DataTexture(pixels, width, height, T.RGBAFormat, T.FloatType);
  source.mapping = T.EquirectangularReflectionMapping; source.needsUpdate = true;
  const generator = new T.PMREMGenerator(renderer), environment = generator.fromEquirectangular(source);
  generator.dispose(); source.dispose();
  return environment;
}
