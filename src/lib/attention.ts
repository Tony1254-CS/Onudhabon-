// Lazy face-api.js loader + attention signal extraction.
// Loads ONLY tiny_face_detector weights from CDN, on demand.

const MODEL_URL = "https://cdn.jsdelivr.net/npm/face-api.js/weights/";

let faceapiPromise: Promise<typeof import("face-api.js")> | null = null;
let modelLoaded = false;

export async function loadAttentionEngine() {
  if (!faceapiPromise) {
    faceapiPromise = import("face-api.js");
  }
  const faceapi = await faceapiPromise;
  if (!modelLoaded) {
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    modelLoaded = true;
  }
  return faceapi;
}

export type AttentionSnapshot = {
  faceDetected: boolean;
  lookingAway: boolean;
  centerOffset: number; // 0..1 (0 = perfectly centered)
};

export async function detectAttention(
  faceapi: typeof import("face-api.js"),
  video: HTMLVideoElement,
): Promise<AttentionSnapshot> {
  const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.5 });
  const result = await faceapi.detectSingleFace(video, opts);
  if (!result) return { faceDetected: false, lookingAway: false, centerOffset: 1 };
  const box = result.box;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const w = video.videoWidth || 320;
  const h = video.videoHeight || 240;
  const offsetX = Math.abs(cx - w / 2) / (w / 2);
  const offsetY = Math.abs(cy - h / 2) / (h / 2);
  const centerOffset = Math.min(1, Math.max(offsetX, offsetY));
  // Approximation: face significantly off-center => looking away (~25°+)
  const lookingAway = centerOffset > 0.45;
  return { faceDetected: true, lookingAway, centerOffset };
}
