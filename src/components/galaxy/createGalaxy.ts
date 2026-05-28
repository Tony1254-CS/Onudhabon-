import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";

export type GalaxyStar = {
  id: string;
  concept: string;
  subject: string | null;
  mastery: number;
  emotional: "gold" | "cold-blue" | "fragile" | string | null;
  lastReviewed: string | null;
  prerequisites?: string[];
  fragilePath?: string[];
};

const COLORS: Record<string, number> = {
  gold: 0xf59e0b,
  "cold-blue": 0x60a5fa,
  fragile: 0x60a5fa,
};
const DEFAULT_COLOR = 0xfb923c;

// Each subject becomes its own orbital ring. Distinct tilts so the rings
// visibly cross in 3D rather than stacking as concentric flat circles.
const SUBJECT_ORBITS: Record<string, { radius: number; tilt: number; yaw: number; color: number }> = {
  পদার্থবিজ্ঞান: { radius: 20, tilt: 0.12, yaw: 0.0, color: 0x60a5fa },
  রসায়ন:        { radius: 30, tilt: -0.22, yaw: 0.4, color: 0xa78bfa },
  জীববিজ্ঞান:   { radius: 40, tilt: 0.28, yaw: -0.3, color: 0x34d399 },
  গণিত:         { radius: 52, tilt: -0.16, yaw: 0.7, color: 0xf59e0b },
};
const SUBJECT_KEYS = Object.keys(SUBJECT_ORBITS);

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function orbitFor(subject: string | null, fallbackKey?: string) {
  if (subject && SUBJECT_ORBITS[subject]) return { key: subject, ...SUBJECT_ORBITS[subject] };
  // Distribute unknown-subject stars across known orbits by hash so every
  // ring stays populated until the data backfill catches up.
  const k = SUBJECT_KEYS[hashStr(fallbackKey ?? subject ?? "x") % SUBJECT_KEYS.length];
  return { key: k, ...SUBJECT_ORBITS[k] };
}

function colorFor(emotional: string | null): number {
  if (!emotional) return DEFAULT_COLOR;
  return COLORS[emotional] ?? DEFAULT_COLOR;
}

// Build a soft radial-gradient texture once for the sun's lens flare.
function makeFlareTexture(): THREE.Texture {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,220,140,1)");
  g.addColorStop(0.25, "rgba(255,170,80,0.55)");
  g.addColorStop(0.55, "rgba(255,120,40,0.18)");
  g.addColorStop(1, "rgba(255,80,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

export type GalaxyHandle = {
  setStars: (stars: GalaxyStar[]) => void;
  focusStar: (id: string) => void;
  celebrateStar: (id: string) => void;
  setSubjectFilter: (subject: string | null) => void;
  destroy: () => void;
};

export function createGalaxy(
  container: HTMLElement,
  labelContainer: HTMLElement,
  handlers: {
    onHover: (s: GalaxyStar | null) => void;
    onClick: (s: GalaxyStar) => void;
  },
): GalaxyHandle {
  const initW = container.clientWidth || window.innerWidth;
  const initH = container.clientHeight || window.innerHeight;

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(initW, initH);
  renderer.setClearColor(0x000000, 1);
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  container.appendChild(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(initW, initH);
  labelRenderer.domElement.style.position = "absolute";
  labelRenderer.domElement.style.inset = "0";
  labelRenderer.domElement.style.pointerEvents = "none";
  labelContainer.appendChild(labelRenderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000010, 0.005);

  const camera = new THREE.PerspectiveCamera(50, initW / initH, 0.1, 1000);
  // Cinematic intro: start far/high and dolly into resting position.
  camera.position.set(0, 60, 160);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0x223355, 0.4));
  const sunLight = new THREE.PointLight(0xffd28a, 2.4, 320, 1.4);
  sunLight.position.set(0, 0, 0);
  scene.add(sunLight);
  const rimLight = new THREE.DirectionalLight(0x3b82f6, 0.35);
  rimLight.position.set(50, 40, 50);
  scene.add(rimLight);

  // ============ THE SUN ============
  const sunGroup = new THREE.Group();
  const sunCoreGeom = new THREE.SphereGeometry(6, 64, 64);
  const sunCoreMat = new THREE.MeshBasicMaterial({ color: 0xfff1c4 });
  const sunCore = new THREE.Mesh(sunCoreGeom, sunCoreMat);
  sunGroup.add(sunCore);

  // Two offset additive shells give a "boiling plasma" feel without shaders.
  const sunShellGeom = new THREE.SphereGeometry(6.4, 48, 48);
  const sunShellMat = new THREE.MeshBasicMaterial({
    color: 0xffa040,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const sunShell = new THREE.Mesh(sunShellGeom, sunShellMat);
  sunGroup.add(sunShell);

  const sunShell2Geom = new THREE.SphereGeometry(6.7, 48, 48);
  const sunShell2Mat = new THREE.MeshBasicMaterial({
    color: 0xff7a1a,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const sunShell2 = new THREE.Mesh(sunShell2Geom, sunShell2Mat);
  sunGroup.add(sunShell2);

  const coronaGeom = new THREE.SphereGeometry(9, 32, 32);
  const coronaMat = new THREE.MeshBasicMaterial({
    color: 0xffa64d,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const corona = new THREE.Mesh(coronaGeom, coronaMat);
  sunGroup.add(corona);

  // Lens-flare sprite — always faces camera
  const flareTex = makeFlareTexture();
  const flareMat = new THREE.SpriteMaterial({
    map: flareTex,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const flare = new THREE.Sprite(flareMat);
  flare.scale.set(34, 34, 1);
  sunGroup.add(flare);

  scene.add(sunGroup);

  // ============ Background starfield ============
  const bgGeom = new THREE.BufferGeometry();
  const bgCount = 2400;
  const positions = new Float32Array(bgCount * 3);
  for (let i = 0; i < bgCount; i++) {
    const r = 140 + Math.random() * 200;
    const t = Math.random() * Math.PI * 2;
    const p = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(p) * Math.cos(t);
    positions[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
    positions[i * 3 + 2] = r * Math.cos(p);
  }
  bgGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const bgMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.5,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.75,
  });
  scene.add(new THREE.Points(bgGeom, bgMat));

  // ============ Orbit groups ============
  // Each subject gets its own tilted "ecliptic" group. The orbit ring AND
  // the planet pivots both live inside it so they stay perfectly aligned.
  const orbitSystems = new Map<string, THREE.Group>();
  const orbitsGroup = new THREE.Group();
  const planetsGroup = new THREE.Group();
  const linksGroup = new THREE.Group();
  scene.add(orbitsGroup);
  scene.add(planetsGroup);
  scene.add(linksGroup);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.15;
  controls.minDistance = 18;
  controls.maxDistance = 240;
  controls.target.set(0, 0, 0);

  let lastInteraction = 0;
  controls.addEventListener("start", () => {
    controls.autoRotate = false;
    lastInteraction = performance.now();
  });

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2(-10, -10);

  type StarRef = {
    mesh: THREE.Mesh;
    glow: THREE.Mesh;
    pivot: THREE.Group;
    system: THREE.Group; // tilted parent
    star: GalaxyStar;
    label: CSS2DObject;
    baseScale: number;
    angularSpeed: number;
    radius: number;
    subjectKey: string;
  };
  const starRefs: StarRef[] = [];
  type LinkRef = {
    line: THREE.Line;
    geom: THREE.BufferGeometry;
    from: StarRef;
    to: StarRef;
    fragile: boolean;
  };
  const linkRefs: LinkRef[] = [];
  const orbitLabels: { label: CSS2DObject; key: string }[] = [];
  let hovered: StarRef | null = null;
  let currentFilter: string | null = null;

  function clearStars() {
    while (planetsGroup.children.length) planetsGroup.remove(planetsGroup.children[0]);
    while (orbitsGroup.children.length) orbitsGroup.remove(orbitsGroup.children[0]);
    while (linksGroup.children.length) {
      const obj = linksGroup.children[0] as THREE.Line;
      linksGroup.remove(obj);
      (obj.geometry as THREE.BufferGeometry)?.dispose?.();
      ((obj.material as THREE.Material) as any)?.dispose?.();
    }
    starRefs.forEach((s) => {
      s.label.element.remove();
      s.label.removeFromParent();
    });
    orbitLabels.forEach((l) => {
      l.label.element.remove();
      l.label.removeFromParent();
    });
    orbitLabels.length = 0;
    orbitSystems.clear();
    starRefs.length = 0;
  }

  function buildLabel(star: GalaxyStar): CSS2DObject {
    const div = document.createElement("div");
    div.style.cssText =
      "padding:4px 10px;border-radius:9999px;background:rgba(8,11,20,0.85);border:1px solid rgba(255,255,255,0.1);" +
      "color:#F1F5F9;font-family:'Hind Siliguri',sans-serif;font-size:11px;white-space:nowrap;backdrop-filter:blur(8px);" +
      "opacity:0;transition:opacity 200ms ease;pointer-events:none;transform:translate(-50%,-160%);";
    div.innerHTML = `<span>${star.concept}</span> <span style="color:#94A3B8">· ${Math.round(
      star.mastery * 100,
    )}%</span>`;
    return new CSS2DObject(div);
  }

  function buildOrbitLabel(text: string, color: number): CSS2DObject {
    const div = document.createElement("div");
    const hex = "#" + color.toString(16).padStart(6, "0");
    div.style.cssText =
      `padding:2px 8px;border-radius:9999px;background:rgba(8,11,20,0.7);border:1px solid ${hex}55;` +
      `color:${hex};font-family:'Hind Siliguri',sans-serif;font-size:10px;letter-spacing:0.05em;` +
      `white-space:nowrap;backdrop-filter:blur(6px);pointer-events:none;transform:translate(-50%,-50%);` +
      `text-shadow:0 0 8px ${hex}88;`;
    div.textContent = text;
    return new CSS2DObject(div);
  }

  function ensureSystem(orbit: { key: string; tilt: number; yaw: number }): THREE.Group {
    let g = orbitSystems.get(orbit.key);
    if (g) return g;
    g = new THREE.Group();
    g.rotation.z = orbit.tilt;
    g.rotation.y = orbit.yaw;
    planetsGroup.add(g);
    orbitSystems.set(orbit.key, g);
    return g;
  }

  function setStars(stars: GalaxyStar[]) {
    clearStars();
    if (stars.length === 0) return;

    // Bucket each star into a known subject orbit. Unknown subjects are
    // distributed across the 4 academic orbits by concept-name hash.
    const buckets = new Map<string, GalaxyStar[]>();
    stars.forEach((s) => {
      const o = orbitFor(s.subject, s.concept || s.id);
      if (!buckets.has(o.key)) buckets.set(o.key, []);
      buckets.get(o.key)!.push(s);
    });

    // Build orbit rings (one per subject bucket)
    buckets.forEach((_group, key) => {
      const orbit = SUBJECT_ORBITS[key];
      const system = ensureSystem({ key, tilt: orbit.tilt, yaw: orbit.yaw });

      // Glowing tube ring — much more readable than a flat RingGeometry.
      const tubeGeom = new THREE.TorusGeometry(orbit.radius, 0.08, 12, 256);
      const tubeMat = new THREE.MeshBasicMaterial({
        color: orbit.color,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const tube = new THREE.Mesh(tubeGeom, tubeMat);
      tube.rotation.x = Math.PI / 2;
      system.add(tube);

      // Soft halo around the ring
      const haloGeom = new THREE.TorusGeometry(orbit.radius, 0.5, 8, 128);
      const haloMat = new THREE.MeshBasicMaterial({
        color: orbit.color,
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const halo = new THREE.Mesh(haloGeom, haloMat);
      halo.rotation.x = Math.PI / 2;
      system.add(halo);

      // Floating subject label at the outer edge of the ring
      const orbitLabel = buildOrbitLabel(key, orbit.color);
      orbitLabel.position.set(orbit.radius + 1.6, 0, 0);
      system.add(orbitLabel);
      orbitLabels.push({ label: orbitLabel, key });
    });

    // Place planets on their orbit
    buckets.forEach((group, key) => {
      const orbit = SUBJECT_ORBITS[key];
      const system = ensureSystem({ key, tilt: orbit.tilt, yaw: orbit.yaw });
      const n = group.length;
      group.forEach((star, i) => {
        const angle = (i / Math.max(n, 1)) * Math.PI * 2 + (i * 0.07);
        const size = 0.55 + star.mastery * 1.5;
        const color = colorFor(star.emotional);

        const pivot = new THREE.Group();
        pivot.rotation.y = angle;
        system.add(pivot);

        const geom = new THREE.SphereGeometry(size, 24, 24);
        const mat = new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.55 + star.mastery * 1.1,
          roughness: 0.45,
          metalness: 0.15,
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(orbit.radius, 0, 0);
        mesh.userData.starId = star.id;
        pivot.add(mesh);

        // Tighter glow halo so dense orbits don't blur together
        const glowGeom = new THREE.SphereGeometry(size * 1.6, 16, 16);
        const glowMat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.22,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const glow = new THREE.Mesh(glowGeom, glowMat);
        glow.position.copy(mesh.position);
        pivot.add(glow);

        // Saturn-style ring for mastered planets
        if (star.emotional === "gold") {
          const ringGeom = new THREE.TorusGeometry(size * 1.9, size * 0.08, 8, 64);
          const ringMat = new THREE.MeshBasicMaterial({
            color: 0xfde68a,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          });
          const planetRing = new THREE.Mesh(ringGeom, ringMat);
          planetRing.rotation.x = Math.PI / 2.4;
          planetRing.rotation.z = 0.3;
          mesh.add(planetRing);
        }

        const label = buildLabel(star);
        label.position.set(0, size + 1.2, 0);
        mesh.add(label);

        // Outer orbits travel slower (Kepler-ish)
        const angularSpeed = 0.0012 * (30 / orbit.radius);

        starRefs.push({
          mesh,
          glow,
          pivot,
          system,
          star,
          label,
          baseScale: 1,
          angularSpeed,
          radius: orbit.radius,
          subjectKey: key,
        });
      });
    });

    // Prerequisite links — dialled way down so they don't drown out orbits.
    linkRefs.length = 0;
    const byConcept = new Map<string, StarRef>();
    starRefs.forEach((s) => byConcept.set(s.star.concept, s));
    starRefs.forEach((dep) => {
      const prereqs = dep.star.prerequisites ?? [];
      const fragileSet = new Set(dep.star.fragilePath ?? []);
      prereqs.forEach((prName) => {
        const src = byConcept.get(prName);
        if (!src || src === dep) return;
        const isFragile =
          fragileSet.has(prName) ||
          src.star.emotional === "fragile" ||
          src.star.emotional === "cold-blue" ||
          src.star.mastery < 0.45;
        const color = isFragile ? 0xef4444 : 0xfbbf24;
        const geom = new THREE.BufferGeometry();
        geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
        const mat = new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity: isFragile ? 0.7 : 0.12,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const line = new THREE.Line(geom, mat);
        line.frustumCulled = false;
        linksGroup.add(line);
        linkRefs.push({ line, geom, from: src, to: dep, fragile: isFragile });
      });
    });

    applyFilter();
  }

  function applyFilter() {
    starRefs.forEach((s) => {
      const visible = !currentFilter || s.star.subject === currentFilter;
      s.pivot.visible = visible;
      s.label.element.style.display = visible ? "" : "none";
    });
    linkRefs.forEach((l) => {
      l.line.visible = l.from.pivot.visible && l.to.pivot.visible;
    });
  }

  function setSubjectFilter(subject: string | null) {
    currentFilter = subject;
    applyFilter();
  }

  function focusStar(id: string) {
    const ref = starRefs.find((s) => s.star.id === id);
    if (!ref) return;
    controls.autoRotate = false;
    lastInteraction = performance.now();
    const worldPos = new THREE.Vector3();
    ref.mesh.getWorldPosition(worldPos);
    const dir = worldPos.clone().normalize();
    const camTarget = worldPos.clone().add(dir.multiplyScalar(14)).add(new THREE.Vector3(0, 5, 0));
    animateCamera(camTarget, worldPos, 900);
    ref.baseScale = 1.8;
    setTimeout(() => { ref.baseScale = 1; }, 1400);
  }

  function celebrateStar(id: string) {
    const ref = starRefs.find((s) => s.star.id === id);
    if (!ref) return;
    focusStar(id);
    ref.baseScale = 2.6;
    setTimeout(() => { ref.baseScale = 1.2; }, 1400);

    const worldPos = new THREE.Vector3();
    ref.mesh.getWorldPosition(worldPos);

    const burstCount = 60;
    const burstGeom = new THREE.BufferGeometry();
    const burstPos = new Float32Array(burstCount * 3);
    const velocities: THREE.Vector3[] = [];
    for (let i = 0; i < burstCount; i++) {
      burstPos[i * 3] = worldPos.x;
      burstPos[i * 3 + 1] = worldPos.y;
      burstPos[i * 3 + 2] = worldPos.z;
      const v = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5,
      ).normalize().multiplyScalar(0.15 + Math.random() * 0.25);
      velocities.push(v);
    }
    burstGeom.setAttribute("position", new THREE.BufferAttribute(burstPos, 3));
    const burstMat = new THREE.PointsMaterial({
      color: 0xfde047,
      size: 0.6,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const burst = new THREE.Points(burstGeom, burstMat);
    scene.add(burst);

    const ringGeom = new THREE.RingGeometry(0.5, 0.6, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.position.copy(worldPos);
    scene.add(ring);

    const startT = performance.now();
    const dur = 1600;
    function animateBurst() {
      const t = (performance.now() - startT) / dur;
      if (t >= 1) {
        scene.remove(burst); burstGeom.dispose(); burstMat.dispose();
        scene.remove(ring); ringGeom.dispose(); ringMat.dispose();
        return;
      }
      const arr = burstGeom.attributes.position.array as Float32Array;
      for (let i = 0; i < burstCount; i++) {
        arr[i * 3] += velocities[i].x;
        arr[i * 3 + 1] += velocities[i].y;
        arr[i * 3 + 2] += velocities[i].z;
        velocities[i].multiplyScalar(0.97);
      }
      burstGeom.attributes.position.needsUpdate = true;
      burstMat.opacity = 1 - t;
      const s = 1 + t * 12;
      ring.scale.setScalar(s);
      ring.lookAt(camera.position);
      ringMat.opacity = (1 - t) * 0.9;
      requestAnimationFrame(animateBurst);
    }
    animateBurst();
  }

  function animateCamera(toPos: THREE.Vector3, lookAt: THREE.Vector3, dur = 900) {
    const fromPos = camera.position.clone();
    const fromTarget = controls.target.clone();
    const start = performance.now();
    function step() {
      const t = Math.min(1, (performance.now() - start) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      camera.position.lerpVectors(fromPos, toPos, e);
      controls.target.lerpVectors(fromTarget, lookAt, e);
      controls.update();
      if (t < 1) requestAnimationFrame(step);
    }
    step();
  }

  // Cinematic intro dolly
  animateCamera(new THREE.Vector3(0, 22, 95), new THREE.Vector3(0, 0, 0), 1400);

  function onPointerMove(e: PointerEvent) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }
  function onClick() {
    if (hovered) handlers.onClick(hovered.star);
  }
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("click", onClick);

  const ro = new ResizeObserver(() => {
    const W = container.clientWidth, H = container.clientHeight;
    if (W === 0 || H === 0) return;
    renderer.setSize(W, H);
    labelRenderer.setSize(W, H);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  });
  ro.observe(container);

  let raf = 0;
  function loop() {
    if (!controls.autoRotate && performance.now() - lastInteraction > 4000) {
      controls.autoRotate = true;
    }

    const now = performance.now();
    const tSec = now * 0.001;

    // Sun: counter-rotating shells + corona pulse
    sunCore.rotation.y += 0.0015;
    sunShell.rotation.y -= 0.0022;
    sunShell.rotation.x += 0.0008;
    sunShell2.rotation.y += 0.0018;
    sunShell2.rotation.z -= 0.0011;
    coronaMat.opacity = 0.22 + 0.04 * Math.sin(tSec * 1.6);
    flareMat.opacity = 0.85 + 0.1 * Math.sin(tSec * 1.2);

    // Orbital motion
    starRefs.forEach((s) => {
      if (s.pivot.visible) s.pivot.rotation.y += s.angularSpeed;
    });

    const tmpA = new THREE.Vector3();
    const tmpB = new THREE.Vector3();
    const tPulse = now * 0.003;
    linkRefs.forEach((l) => {
      if (!l.line.visible) return;
      l.from.mesh.getWorldPosition(tmpA);
      l.to.mesh.getWorldPosition(tmpB);
      const arr = l.geom.attributes.position.array as Float32Array;
      arr[0] = tmpA.x; arr[1] = tmpA.y; arr[2] = tmpA.z;
      arr[3] = tmpB.x; arr[4] = tmpB.y; arr[5] = tmpB.z;
      l.geom.attributes.position.needsUpdate = true;
      if (l.fragile) {
        const mat = l.line.material as THREE.LineBasicMaterial;
        mat.opacity = 0.45 + 0.35 * (0.5 + 0.5 * Math.sin(tPulse));
      }
    });

    raycaster.setFromCamera(mouse, camera);
    const visibleMeshes = starRefs.filter((s) => s.pivot.visible).map((s) => s.mesh);
    const hits = raycaster.intersectObjects(visibleMeshes, false);
    const hit = hits[0];
    if (hit) {
      const ref = starRefs.find((s) => s.mesh === hit.object);
      if (ref && ref !== hovered) {
        if (hovered) hovered.label.element.style.opacity = "0";
        hovered = ref;
        ref.label.element.style.opacity = "1";
        renderer.domElement.style.cursor = "pointer";
        handlers.onHover(ref.star);
      }
    } else if (hovered) {
      hovered.label.element.style.opacity = "0";
      hovered = null;
      renderer.domElement.style.cursor = "grab";
      handlers.onHover(null);
    }

    starRefs.forEach((s) => {
      const target = s === hovered ? 1.5 : s.baseScale;
      const cur = s.mesh.scale.x;
      const next = cur + (target - cur) * 0.15;
      s.mesh.scale.setScalar(next);
      s.glow.scale.setScalar(next);
    });

    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  }
  loop();

  return {
    setStars,
    focusStar,
    celebrateStar,
    setSubjectFilter,
    destroy: () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("click", onClick);
      controls.dispose();
      starRefs.forEach((s) => s.label.element.remove());
      orbitLabels.forEach((l) => l.label.element.remove());
      renderer.dispose();
      bgGeom.dispose();
      bgMat.dispose();
      sunCoreGeom.dispose();
      sunCoreMat.dispose();
      sunShellGeom.dispose();
      sunShellMat.dispose();
      sunShell2Geom.dispose();
      sunShell2Mat.dispose();
      coronaGeom.dispose();
      coronaMat.dispose();
      flareTex.dispose();
      flareMat.dispose();
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
      if (labelRenderer.domElement.parentNode === labelContainer) labelContainer.removeChild(labelRenderer.domElement);
    },
  };
}
