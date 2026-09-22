import * as T from 'three';

// The imported model already has the Juniper's overhanging brow and recessed
// reflector. Correct their optical roles instead of placing a bar over the car.
export function createRearLights(car) {
  const reflector = car.getObjectByName('Plane041_Mesh025');
  const cover = car.getObjectByName('Plane040_Mesh026');
  if (!reflector || !cover) return {setNight() {}};

  const power = {value: 0};
  const reflected = new T.MeshStandardMaterial({
    name: 'rear-reflected-light', color: '#b6bab9', roughness: .68, metalness: 0,
  });
  // Evaluate the wash per fragment on the actual sloping reflector. The upper
  // edge is brighter; the lower edge and rounded ends fall back into shadow.
  // This is a procedural approximation of reflected light, not a brake signal.
  reflected.onBeforeCompile = shader => {
    shader.uniforms.rearLightPower = power;
    shader.vertexShader = 'varying vec3 rearPosition;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nrearPosition = position;');
    shader.fragmentShader = 'varying vec3 rearPosition;\nuniform float rearLightPower;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `
      #include <emissivemap_fragment>
      float height = clamp((rearPosition.y - 1.022) / .082, 0.0, 1.0);
      float ends = 1.0 - smoothstep(.66, .738, abs(rearPosition.x));
      float wash = smoothstep(0.0, .2, height) * (.13 + .87 * pow(height, 1.6)) * ends;
      float highlight = exp(-pow((height - .74) / .07, 2.0));
      vec3 red = vec3(1.0, .002 + .22 * highlight, .001);
      diffuseColor.rgb *= mix(vec3(1.0), vec3(.08, .001, .001), min(rearLightPower, 1.0) * smoothstep(0.0, .06, wash));
      totalEmissiveRadiance += red * wash * rearLightPower;
    `);
    // Tone-map the unlit panel with the rest of the car, but keep the red
    // emission saturated instead of letting ACES bleach its spectrum pink.
    shader.fragmentShader = shader.fragmentShader.replace('#include <tonemapping_fragment>', `
      vec3 rearUntoned = gl_FragColor.rgb;
      #include <tonemapping_fragment>
      gl_FragColor.rgb = mix(gl_FragColor.rgb, rearUntoned, min(rearLightPower, 1.0));
    `);
  };
  reflected.customProgramCacheKey = () => 'juniper-reflected-rear-light-v1';
  reflector.material = reflected;

  // The original conversion called the entire outer cover an LED. It is smoked
  // glazing over separate optics. Keeping its original geometry also preserves
  // the charging cutout and the exact closed left/right silhouette.
  cover.material = new T.MeshPhysicalMaterial({
    name: 'rear-smoked-lens', color: '#101316', roughness: .16, metalness: .02,
    transparent: true, opacity: .28, depthWrite: false,
    clearcoat: 1, clearcoatRoughness: .12, side: T.FrontSide,
  });
  cover.castShadow = false;
  const housing = car.getObjectByName('Plane034_Mesh021');
  housing.material = new T.MeshPhysicalMaterial({
    name: 'rear-lamp-housing', color: '#0c0e11', roughness: .3, metalness: .05,
    clearcoat: .7, clearcoatRoughness: .22,
  });
  const corner = car.getObjectByName('Plane043_Mesh028');
  corner.material = housing.material;

  const optics = [];
  for (const name of ['Plane036_Mesh022', 'Plane042_Mesh027', 'Plane044_Mesh029']) {
    const mesh = car.getObjectByName(name);
    if (!mesh) continue;
    mesh.material = new T.MeshStandardMaterial({
      name: 'rear-red-optic', color: '#65030a', emissive: '#ff0803',
      emissiveIntensity: 0, roughness: .3, metalness: .05, toneMapped: false,
    });
    optics.push(mesh.material);
  }
  // The lower corner inserts are clear lenses, not more red running lamps.
  const lower = car.getObjectByName('Plane045_Mesh030');
  if (lower) lower.material = new T.MeshStandardMaterial({
    name: 'rear-clear-insert', color: '#a3a8a9', roughness: .35, metalness: .15,
  });
  return {
    setNight(night) {
      power.value = night ? 1.4 : 0;
      for (const material of optics) material.emissiveIntensity = night ? 1 : 0;
    },
  };
}
