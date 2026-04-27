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

const COLORS: Record<string, number> = {
  gold: 0xf59e0b,
  "cold-blue": 0x60a5fa,
  fragile: 0xfb923c,
};
const DEFAULT_COLOR = 0x475569;

const SUBJECT_QUADRANTS: Record<string, THREE.Vector3> = {
  পদার্থবিজ্ঞান: new THREE.Vector3(1, 1, 1),
  রসায়ন: new THREE.Vector3(-1, 1, -1),
  জীববিজ্ঞান: new THREE.Vector3(-1, -1, 1),
  গণিত: new THREE.Vector3(1, -1, -1),
};

function quadrantFor(subject: string | null): THREE.Vector3 {
  if (!subject) return new THREE.Vector3(0, 0, 0);
  if (SUBJECT_QUADRANTS[subject]) return SUBJECT_QUADRANTS[subject];
  // Hash-based fallback for unknown subjects
  let h = 0;
  for (let i = 0; i < subject.length; i++) h = (h * 31 + subject.charCodeAt(i)) | 0;
  const opts = Object.values(SUBJECT_QUADRANTS);
  return opts[Math.abs(h) % opts.length];
}

function colorFor(emotional: string | null): number {
  if (!emotional) return DEFAULT_COLOR;
  return COLORS[emotional] ?? DEFAULT_COLOR;
}

function seededRand(seed: number) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

export type GalaxyHandle = {
  setStars: (stars: GalaxyStar[]) => void;
  focusStar: (id: string) => void;
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
  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const w = container.clientWidth;
  const h = container.clientHeight;
  renderer.setSize(w, h);
  renderer.setClearColor(0x000000, 1);
  container.appendChild(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(w, h);
  labelRenderer.domElement.style.position = "absolute";
  labelRenderer.domElement.style.inset = "0";
  labelRenderer.domElement.style.pointerEvents = "none";
  labelContainer.appendChild(labelRenderer.domElement);

  // Scene & camera
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 500);
  camera.position.set(0, 12, 70);

  // Lights
  scene.add(new THREE.AmbientLight(0x1a3a6e, 0.1));
  const blueLight = new THREE.PointLight(0x3b82f6, 1.6, 200);
  blueLight.position.set(40, 30, 40);
  scene.add(blueLight);
  const purpleLight = new THREE.PointLight(0x8b5cf6, 1.4, 200);
  purpleLight.position.set(-40, -20, -30);
  scene.add(purpleLight);

  // Background particles (static, low cost)
  const bgGeom = new THREE.BufferGeometry();
  const bgCount = 1500;
  const positions = new Float32Array(bgCount * 3);
  for (let i = 0; i < bgCount; i++) {
    const r = 80 + Math.random() * 80;
    const t = Math.random() * Math.PI * 2;
    const p = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(p) * Math.cos(t);
    positions[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
    positions[i * 3 + 2] = r * Math.cos(p);
  }
  bgGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const bgMat = new THREE.PointsMaterial({
    color: 0xffffff, size: 0.04, sizeAttenuation: true, transparent: true, opacity: 0.55,
  });
  scene.add(new THREE.Points(bgGeom, bgMat));

  // Star groups
  const starsGroup = new THREE.Group();
  const linesGroup = new THREE.Group();
  scene.add(starsGroup);
  scene.add(linesGroup);

  // Controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.4;
  controls.minDistance = 12;
  controls.maxDistance = 160;

  let lastInteraction = 0;
  const onUserInteract = () => {
    controls.autoRotate = false;
    lastInteraction = performance.now();
  };
  controls.addEventListener("start", onUserInteract);

  // Raycaster
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2(-10, -10);
  let hovered: { mesh: THREE.Mesh; star: GalaxyStar; label: CSS2DObject; baseScale: number } | null = null;

  // Star data store
  type StarRef = { mesh: THREE.Mesh; glow: THREE.Mesh; star: GalaxyStar; label: CSS2DObject; baseScale: number };
  const starRefs: StarRef[] = [];
  let currentFilter: string | null = null;

  function clearStars() {
    starsGroup.clear();
    linesGroup.clear();
    starRefs.forEach((s) => {
      s.label.element.remove();
      s.label.removeFromParent();
    });
    starRefs.length = 0;
  }

  function buildLabel(star: GalaxyStar): CSS2DObject {
    const div = document.createElement("div");
    div.className = "galaxy-label";
    div.style.cssText =
      "padding:4px 10px;border-radius:9999px;background:rgba(8,11,20,0.85);border:1px solid rgba(255,255,255,0.08);" +
      "color:#F1F5F9;font-family:'Hind Siliguri',sans-serif;font-size:11px;white-space:nowrap;backdrop-filter:blur(8px);" +
      "opacity:0;transition:opacity 200ms ease;pointer-events:none;transform:translate(-50%,-140%);";
    div.innerHTML = `<span>${star.concept}</span> <span style="color:#94A3B8">· ${Math.round(star.mastery * 100)}%</span>`;
    const obj = new CSS2DObject(div);
    return obj;
  }

  function setStars(stars: GalaxyStar[]) {
    clearStars();
    if (stars.length === 0) {
      renderOnce();
      return;
    }

    // Group by subject for connection lines
    const bySubject = new Map<string, StarRef[]>();

    stars.forEach((star, i) => {
      const rand = seededRand(i + 1);
      const quad = quadrantFor(star.subject);
      const r = 8 + rand() * 32;
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      const pos = new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta) * (0.6 + 0.4 * Math.sign(quad.x || 1)),
        r * Math.sin(phi) * Math.sin(theta) * (0.6 + 0.4 * Math.sign(quad.y || 1)),
        r * Math.cos(phi) * (0.6 + 0.4 * Math.sign(quad.z || 1)),
      );
      // Bias toward quadrant
      pos.add(quad.clone().multiplyScalar(8));

      const size = 0.5 + star.mastery * 2;
      const color = colorFor(star.emotional);

      const geom = new THREE.SphereGeometry(size, 8, 8);
      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.4 + star.mastery * 1.6,
        roughness: 0.4,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(pos);
      mesh.userData.starId = star.id;
      starsGroup.add(mesh);

      // Glow halo
      const glowGeom = new THREE.SphereGeometry(size * 2.4, 8, 8);
      const glowMat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.15, depthWrite: false,
      });
      const glow = new THREE.Mesh(glowGeom, glowMat);
      glow.position.copy(pos);
      starsGroup.add(glow);

      const label = buildLabel(star);
      label.position.copy(pos);
      scene.add(label);

      const ref: StarRef = { mesh, glow, star, label, baseScale: 1 };
      starRefs.push(ref);
      const key = star.subject ?? "_";
      if (!bySubject.has(key)) bySubject.set(key, []);
      bySubject.get(key)!.push(ref);
    });

    // Connection lines per subject
    const linePositions: number[] = [];
    bySubject.forEach((group) => {
      if (group.length < 2) return;
      // Connect each to nearest 2 in same group
      group.forEach((a) => {
        const others = group
          .filter((b) => b !== a)
          .map((b) => ({ b, d: a.mesh.position.distanceTo(b.mesh.position) }))
          .sort((x, y) => x.d - y.d)
          .slice(0, 2);
        others.forEach(({ b }) => {
          linePositions.push(a.mesh.position.x, a.mesh.position.y, a.mesh.position.z);
          linePositions.push(b.mesh.position.x, b.mesh.position.y, b.mesh.position.z);
        });
      });
    });
    if (linePositions.length) {
      const lineGeom = new THREE.BufferGeometry();
      lineGeom.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x3b82f6, transparent: true, opacity: 0.15,
      });
      linesGroup.add(new THREE.LineSegments(lineGeom, lineMat));
    }

    applyFilter();
    renderOnce();
  }

  function applyFilter() {
    starRefs.forEach((s) => {
      const visible = !currentFilter || s.star.subject === currentFilter;
      s.mesh.visible = visible;
      s.glow.visible = visible;
      s.label.element.style.display = visible ? "" : "none";
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
    const target = ref.mesh.position.clone();
    const camTarget = target.clone().add(new THREE.Vector3(0, 4, 18));
    animateCamera(camTarget, target);
    // pulse
    ref.baseScale = 1.6;
    setTimeout(() => { ref.baseScale = 1; }, 1200);
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

  // Mouse handling
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
    // Resume autorotate after 3s of no interaction
    if (!controls.autoRotate && performance.now() - lastInteraction > 3000) {
      controls.autoRotate = true;
    }

    // Hover detection (throttled by being part of frame)
    raycaster.setFromCamera(mouse, camera);
    const visibleMeshes = starRefs.filter((s) => s.mesh.visible).map((s) => s.mesh);
    const hits = raycaster.intersectObjects(visibleMeshes, false);
    const hit = hits[0];
    if (hit) {
      const ref = starRefs.find((s) => s.mesh === hit.object);
      if (ref && ref !== hovered) {
        if (hovered) {
          hovered.label.element.style.opacity = "0";
        }
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
  function renderOnce() {
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }
  loop();

  return {
    setStars,
    focusStar,
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
      container.removeChild(renderer.domElement);
      labelContainer.removeChild(labelRenderer.domElement);
    },
  };
}
