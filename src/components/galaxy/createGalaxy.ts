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
};

// Color mapping: gold for mastered, cold-blue for fragile, others muted
const COLORS: Record<string, number> = {
  gold: 0xf59e0b,        // mastered → warm gold
  "cold-blue": 0x60a5fa, // fragile → cold blue
  fragile: 0x60a5fa,     // alias from mastery engine state
};
const DEFAULT_COLOR = 0xfb923c; // developing → orange

// Each subject becomes its own orbital ring around the sun
const SUBJECT_ORBITS: Record<string, { radius: number; tilt: number; color: number }> = {
  পদার্থবিজ্ঞান: { radius: 18, tilt: 0.05, color: 0x3b82f6 },
  রসায়ন: { radius: 28, tilt: 0.18, color: 0x8b5cf6 },
  জীববিজ্ঞান: { radius: 38, tilt: -0.12, color: 0x10b981 },
  গণিত: { radius: 48, tilt: 0.22, color: 0xf59e0b },
};
const FALLBACK_ORBITS = Object.values(SUBJECT_ORBITS);

function orbitFor(subject: string | null) {
  if (!subject) return { radius: 24, tilt: 0, color: 0x64748b };
  if (SUBJECT_ORBITS[subject]) return SUBJECT_ORBITS[subject];
  let h = 0;
  for (let i = 0; i < subject.length; i++) h = (h * 31 + subject.charCodeAt(i)) | 0;
  return FALLBACK_ORBITS[Math.abs(h) % FALLBACK_ORBITS.length];
}

function colorFor(emotional: string | null): number {
  if (!emotional) return DEFAULT_COLOR;
  return COLORS[emotional] ?? DEFAULT_COLOR;
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
  // Ensure container has dimensions (fallback to viewport if 0)
  const initW = container.clientWidth || window.innerWidth;
  const initH = container.clientHeight || window.innerHeight;

  // Renderer
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

  // Scene & camera
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000010, 0.006);

  const camera = new THREE.PerspectiveCamera(50, initW / initH, 0.1, 1000);
  camera.position.set(0, 35, 90);
  camera.lookAt(0, 0, 0);

  // Lights — sun acts as the main light
  scene.add(new THREE.AmbientLight(0x223355, 0.35));
  const sunLight = new THREE.PointLight(0xffd28a, 2.2, 300, 1.4);
  sunLight.position.set(0, 0, 0);
  scene.add(sunLight);
  const rimLight = new THREE.DirectionalLight(0x3b82f6, 0.4);
  rimLight.position.set(50, 40, 50);
  scene.add(rimLight);

  // ============ THE SUN (center of the system) ============
  const sunGroup = new THREE.Group();
  const sunGeom = new THREE.SphereGeometry(4.5, 48, 48);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xffb347 });
  const sun = new THREE.Mesh(sunGeom, sunMat);
  sunGroup.add(sun);
  // Sun corona
  const coronaGeom = new THREE.SphereGeometry(6.5, 32, 32);
  const coronaMat = new THREE.MeshBasicMaterial({
    color: 0xffa64d,
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  sunGroup.add(new THREE.Mesh(coronaGeom, coronaMat));
  const flareGeom = new THREE.SphereGeometry(9, 32, 32);
  const flareMat = new THREE.MeshBasicMaterial({
    color: 0xffd47a,
    transparent: true,
    opacity: 0.08,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  sunGroup.add(new THREE.Mesh(flareGeom, flareMat));
  scene.add(sunGroup);

  // ============ Background starfield ============
  const bgGeom = new THREE.BufferGeometry();
  const bgCount = 2000;
  const positions = new Float32Array(bgCount * 3);
  for (let i = 0; i < bgCount; i++) {
    const r = 120 + Math.random() * 180;
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
    opacity: 0.7,
  });
  scene.add(new THREE.Points(bgGeom, bgMat));

  // ============ Orbit/planet groups ============
  const orbitsGroup = new THREE.Group();
  const planetsGroup = new THREE.Group();
  scene.add(orbitsGroup);
  scene.add(planetsGroup);

  // Controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.3;
  controls.minDistance = 15;
  controls.maxDistance = 220;
  controls.target.set(0, 0, 0);

  let lastInteraction = 0;
  controls.addEventListener("start", () => {
    controls.autoRotate = false;
    lastInteraction = performance.now();
  });

  // Raycaster
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2(-10, -10);

  // Star/planet refs
  type StarRef = {
    mesh: THREE.Mesh;
    glow: THREE.Mesh;
    pivot: THREE.Group; // rotates around sun
    star: GalaxyStar;
    label: CSS2DObject;
    baseScale: number;
    angularSpeed: number;
    tilt: number;
    radius: number;
  };
  const starRefs: StarRef[] = [];
  let hovered: StarRef | null = null;
  let currentFilter: string | null = null;

  function clearStars() {
    while (planetsGroup.children.length) planetsGroup.remove(planetsGroup.children[0]);
    while (orbitsGroup.children.length) orbitsGroup.remove(orbitsGroup.children[0]);
    starRefs.forEach((s) => {
      s.label.element.remove();
      s.label.removeFromParent();
    });
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

  function setStars(stars: GalaxyStar[]) {
    clearStars();
    if (stars.length === 0) return;

    // Group by subject so same-subject planets share an orbital ring
    const bySubject = new Map<string, GalaxyStar[]>();
    stars.forEach((s) => {
      const key = s.subject ?? "_other";
      if (!bySubject.has(key)) bySubject.set(key, []);
      bySubject.get(key)!.push(s);
    });

    // Draw orbit ring lines
    bySubject.forEach((_group, subject) => {
      const orbit = orbitFor(subject === "_other" ? null : subject);
      const ringGeom = new THREE.RingGeometry(orbit.radius - 0.05, orbit.radius + 0.05, 128);
      const ringMat = new THREE.MeshBasicMaterial({
        color: orbit.color,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.rotation.x = Math.PI / 2 + orbit.tilt;
      orbitsGroup.add(ring);
    });

    // Place planets along their subject's orbit
    bySubject.forEach((group, subject) => {
      const orbit = orbitFor(subject === "_other" ? null : subject);
      const n = group.length;
      group.forEach((star, i) => {
        // Distribute around the ring with a small jitter for variety
        const angle = (i / Math.max(n, 1)) * Math.PI * 2 + (i * 0.13);
        const size = 0.6 + star.mastery * 1.6;
        const color = colorFor(star.emotional);

        // Pivot rotates around the sun → orbital motion
        const pivot = new THREE.Group();
        pivot.rotation.y = angle;
        pivot.rotation.z = orbit.tilt;
        planetsGroup.add(pivot);

        // Planet body
        const geom = new THREE.SphereGeometry(size, 24, 24);
        const mat = new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.6 + star.mastery * 1.2,
          roughness: 0.45,
          metalness: 0.15,
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(orbit.radius, 0, 0);
        mesh.userData.starId = star.id;
        pivot.add(mesh);

        // Glow halo
        const glowGeom = new THREE.SphereGeometry(size * 2.2, 16, 16);
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

        // Label follows planet world position (added to mesh as child so it tracks)
        const label = buildLabel(star);
        label.position.set(0, size + 1.2, 0);
        mesh.add(label);

        // Outer planets orbit slower (Kepler-ish vibe)
        const angularSpeed = 0.0012 * (30 / orbit.radius);

        starRefs.push({
          mesh,
          glow,
          pivot,
          star,
          label,
          baseScale: 1,
          angularSpeed,
          tilt: orbit.tilt,
          radius: orbit.radius,
        });
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
    // Also hide orbit rings when filtering
    orbitsGroup.children.forEach((ring, idx) => {
      void idx;
      ring.visible = true;
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
    const camTarget = worldPos.clone().add(dir.multiplyScalar(12)).add(new THREE.Vector3(0, 4, 0));
    animateCamera(camTarget, worldPos);
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

    // Sparkle burst
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

  function animateCamera(toPos: THREE.Vector3, lookAt: THREE.Vector3) {
    const fromPos = camera.position.clone();
    const fromTarget = controls.target.clone();
    const dur = 900;
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

  // Pointer interaction
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

  // Resize
  const ro = new ResizeObserver(() => {
    const W = container.clientWidth, H = container.clientHeight;
    if (W === 0 || H === 0) return;
    renderer.setSize(W, H);
    labelRenderer.setSize(W, H);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  });
  ro.observe(container);

  // Animation loop
  let raf = 0;
  function loop() {
    if (!controls.autoRotate && performance.now() - lastInteraction > 4000) {
      controls.autoRotate = true;
    }

    // Rotate sun + corona
    sunGroup.rotation.y += 0.002;

    // Orbital motion
    starRefs.forEach((s) => {
      if (s.pivot.visible) s.pivot.rotation.y += s.angularSpeed;
    });

    // Hover detection
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

    // Smooth scale toward base/hover scale
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
      renderer.dispose();
      bgGeom.dispose();
      bgMat.dispose();
      sunGeom.dispose();
      sunMat.dispose();
      coronaGeom.dispose();
      coronaMat.dispose();
      flareGeom.dispose();
      flareMat.dispose();
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
      if (labelRenderer.domElement.parentNode === labelContainer) labelContainer.removeChild(labelRenderer.domElement);
    },
  };
}
