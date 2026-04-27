// Lightweight attention engine.
// Uses the browser's native FaceDetector (Shape Detection API) when available,
// otherwise falls back to a brightness/motion heuristic on a tiny canvas.
// No external models, no heavy deps — bulletproof for a live demo.

type FaceDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<Array<{ boundingBox: DOMRectReadOnly }>>;
};

export type AttentionEngine = {
  mode: "native" | "heuristic";
  detector: FaceDetectorLike | null;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  prev?: ImageData;
};

let enginePromise: Promise<AttentionEngine> | null = null;

export async function loadAttentionEngine(): Promise<AttentionEngine> {
  if (enginePromise) return enginePromise;
  enginePromise = (async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 120;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    let detector: FaceDetectorLike | null = null;
    let mode: "native" | "heuristic" = "heuristic";
    const FD = (globalThis as unknown as { FaceDetector?: new (opts?: unknown) => FaceDetectorLike }).FaceDetector;
    if (typeof FD === "function") {
      try {
        detector = new FD({ fastMode: true, maxDetectedFaces: 1 });
        mode = "native";
      } catch {
        detector = null;
      }
    }
    return { mode, detector, canvas, ctx };
  })();
  return enginePromise;
}

export type AttentionSnapshot = {
  faceDetected: boolean;
  lookingAway: boolean;
  centerOffset: number; // 0..1 (0 = perfectly centered)
};

export async function detectAttention(
  engine: AttentionEngine,
  video: HTMLVideoElement,
): Promise<AttentionSnapshot> {
  const { canvas, ctx } = engine;
  if (!video.videoWidth) return { faceDetected: false, lookingAway: false, centerOffset: 1 };
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  if (engine.mode === "native" && engine.detector) {
    try {
      const faces = await engine.detector.detect(canvas);
      if (!faces || faces.length === 0) {
        return { faceDetected: false, lookingAway: false, centerOffset: 1 };
      }
      const box = faces[0].boundingBox;
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      const offsetX = Math.abs(cx - canvas.width / 2) / (canvas.width / 2);
      const offsetY = Math.abs(cy - canvas.height / 2) / (canvas.height / 2);
      const centerOffset = Math.min(1, Math.max(offsetX, offsetY));
      return { faceDetected: true, lookingAway: centerOffset > 0.45, centerOffset };
    } catch {
      // fall through to heuristic
    }
  }

  // Heuristic fallback: detect "presence" via average luminance + frame motion.
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let sum = 0;
  for (let i = 0; i < frame.data.length; i += 4) {
    sum += frame.data[i] + frame.data[i + 1] + frame.data[i + 2];
  }
  const avg = sum / (frame.data.length / 4) / 3; // 0..255
  let motion = 0;
  if (engine.prev) {
    const a = frame.data;
    const b = engine.prev.data;
    let diff = 0;
    const step = 16; // sample sparsely for speed
    for (let i = 0; i < a.length; i += step) {
      diff += Math.abs(a[i] - b[i]);
    }
    motion = diff / (a.length / step) / 255;
  }
  engine.prev = frame;
  const faceDetected = avg > 25 && avg < 235; // not pitch black, not blown out
  const lookingAway = motion > 0.18; // big sudden movement => probably turned
  return { faceDetected, lookingAway, centerOffset: lookingAway ? 0.6 : 0.2 };
}
