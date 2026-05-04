// Attention engine powered by face-api.js (TinyFaceDetector + 68-pt landmarks).
// Loads weights from a CDN once, then runs locally in the browser at ~5 FPS.
// Falls back to the native Shape Detection API, then to a brightness/motion heuristic.

import * as faceapi from "face-api.js";

type FaceDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<Array<{ boundingBox: DOMRectReadOnly }>>;
};

export type AttentionEngine = {
  mode: "faceapi" | "native" | "heuristic";
  detector: FaceDetectorLike | null;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  prev?: ImageData;
};

export type AttentionSnapshot = {
  faceDetected: boolean;
  lookingAway: boolean;
  centerOffset: number; // 0..1 (0 = centered)
  gaze?: number;        // 0..1 (0 = looking at screen)
};

const MODEL_URL =
  "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights";

let enginePromise: Promise<AttentionEngine> | null = null;
let faceapiReady = false;

async function tryLoadFaceApi(): Promise<boolean> {
  if (faceapiReady) return true;
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
    ]);
    faceapiReady = true;
    return true;
  } catch (e) {
    console.warn("face-api.js model load failed, falling back:", e);
    return false;
  }
}

export async function loadAttentionEngine(): Promise<AttentionEngine> {
  if (enginePromise) return enginePromise;
  enginePromise = (async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 224;
    canvas.height = 168;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

    if (await tryLoadFaceApi()) {
      return { mode: "faceapi", detector: null, canvas, ctx };
    }

    // Native Shape Detection fallback
    let detector: FaceDetectorLike | null = null;
    let mode: "native" | "heuristic" = "heuristic";
    const FD = (globalThis as unknown as {
      FaceDetector?: new (opts?: unknown) => FaceDetectorLike;
    }).FaceDetector;
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

const tinyOpts = new faceapi.TinyFaceDetectorOptions({
  inputSize: 224,
  scoreThreshold: 0.4,
});

export async function detectAttention(
  engine: AttentionEngine,
  video: HTMLVideoElement,
): Promise<AttentionSnapshot> {
  const { canvas, ctx } = engine;
  if (!video.videoWidth) return { faceDetected: false, lookingAway: false, centerOffset: 1 };
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  if (engine.mode === "faceapi") {
    try {
      const result = await faceapi
        .detectSingleFace(canvas, tinyOpts)
        .withFaceLandmarks(true);
      if (!result) {
        return { faceDetected: false, lookingAway: false, centerOffset: 1 };
      }
      const box = result.detection.box;
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      const offsetX = Math.abs(cx - canvas.width / 2) / (canvas.width / 2);
      const offsetY = Math.abs(cy - canvas.height / 2) / (canvas.height / 2);
      const centerOffset = Math.min(1, Math.max(offsetX, offsetY));

      // Gaze estimate: nose tip position vs face midline.
      const lm = result.landmarks;
      const nose = lm.getNose()[3]; // nose tip
      const leftEye = lm.getLeftEye();
      const rightEye = lm.getRightEye();
      const eyeMidX = (leftEye[0].x + rightEye[3].x) / 2;
      const eyeWidth = Math.abs(rightEye[3].x - leftEye[0].x) || 1;
      const gaze = Math.min(1, Math.abs(nose.x - eyeMidX) / (eyeWidth * 0.5));

      const lookingAway = centerOffset > 0.45 || gaze > 0.55;
      return { faceDetected: true, lookingAway, centerOffset, gaze };
    } catch (e) {
      console.warn("faceapi detect error:", e);
    }
  }

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
      // fall through
    }
  }

  // Heuristic fallback.
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let sum = 0;
  for (let i = 0; i < frame.data.length; i += 4) {
    sum += frame.data[i] + frame.data[i + 1] + frame.data[i + 2];
  }
  const avg = sum / (frame.data.length / 4) / 3;
  let motion = 0;
  if (engine.prev) {
    const a = frame.data;
    const b = engine.prev.data;
    let diff = 0;
    const step = 16;
    for (let i = 0; i < a.length; i += step) diff += Math.abs(a[i] - b[i]);
    motion = diff / (a.length / step) / 255;
  }
  engine.prev = frame;
  const faceDetected = avg > 25 && avg < 235;
  const lookingAway = motion > 0.18;
  return { faceDetected, lookingAway, centerOffset: lookingAway ? 0.6 : 0.2 };
}
