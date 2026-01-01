"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Detection = {
  label: string;
  confidence: number;
  box: [number, number, number, number];
};

type InferenceResult = {
  imageWidth: number;
  imageHeight: number;
  detections: Detection[];
  inferenceMs: number;
};

const DEFAULT_API = "http://localhost:8000";

export default function Home() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const videoOverlayRef = useRef<HTMLCanvasElement | null>(null);
  const streamTimerRef = useRef<number | null>(null);
  const streamBusyRef = useRef(false);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InferenceResult | null>(null);
  const [streamActive, setStreamActive] = useState(false);

  const apiBase =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_INFER_URL || DEFAULT_API
      : DEFAULT_API;

  const detectionCount = result?.detections.length ?? 0;

  const statusLabel = useMemo(() => {
    if (busy) return "Running inference...";
    if (result) return `${detectionCount} item${detectionCount === 1 ? "" : "s"} detected`;
    return "Ready for a frame";
  }, [busy, result, detectionCount]);

  useEffect(() => {
    if (!result || !imageRef.current || !overlayRef.current) return;
    drawDetections(result, imageRef.current, overlayRef.current);
  }, [result, previewUrl]);

  useEffect(() => {
    if (!streamActive) {
      if (streamTimerRef.current) {
        window.clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
      }
      clearVideoOverlay();
      return;
    }

    streamTimerRef.current = window.setInterval(() => {
      if (streamBusyRef.current) return;
      void captureAndInferFrame();
    }, 600);

    return () => {
      if (streamTimerRef.current) {
        window.clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
      }
    };
  }, [streamActive, apiBase]);

  const handleImageLoad = () => {
    if (!result || !imageRef.current || !overlayRef.current) return;
    drawDetections(result, imageRef.current, overlayRef.current);
  };

  const startCamera = async () => {
    setError(null);
    if (!videoRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStreamActive(true);
    } catch (err) {
      setError("Camera permission denied or unavailable.");
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
  };

  const handleUpload = async (file?: File | null) => {
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    await runInference(file);
  };

  const captureFrame = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((value) => resolve(value), "image/jpeg", 0.92)
    );
    if (!blob) return;
    const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
    setPreviewUrl(URL.createObjectURL(blob));
    await runInference(file);
  };

  const captureAndInferFrame = async () => {
    if (!videoRef.current) return;
    if (videoRef.current.readyState < 2) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((value) => resolve(value), "image/jpeg", 0.8)
    );
    if (!blob) return;
    await runStreamInference(blob);
  };

  const runInference = async (file: File) => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(`${apiBase}/infer`, {
        method: "POST",
        body: form,
      });
      if (!response.ok) {
        throw new Error("Inference service error");
      }
      const data = (await response.json()) as InferenceResult;
      setResult(data);
    } catch (err) {
      setError("Unable to reach the inference service.");
    } finally {
      setBusy(false);
    }
  };

  const runStreamInference = async (blob: Blob) => {
    if (streamBusyRef.current) return;
    streamBusyRef.current = true;
    try {
      const form = new FormData();
      form.append("file", blob, "frame.jpg");
      const response = await fetch(`${apiBase}/infer`, {
        method: "POST",
        body: form,
      });
      if (!response.ok) {
        throw new Error("Inference service error");
      }
      const data = (await response.json()) as InferenceResult;
      setResult(data);
      drawVideoDetections(data);
    } catch (err) {
      setError("Unable to reach the inference service.");
    } finally {
      streamBusyRef.current = false;
    }
  };

  const drawVideoDetections = (data: InferenceResult) => {
    if (!videoRef.current || !videoOverlayRef.current) return;
    const displayWidth = videoRef.current.clientWidth;
    const displayHeight = videoRef.current.clientHeight;
    drawDetectionsOnCanvas(data, videoOverlayRef.current, displayWidth, displayHeight);
  };

  const clearVideoOverlay = () => {
    const canvas = videoOverlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <main className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">SwiftPOS Vision</p>
          <h1>
            Real-time item recognition for modern POS environments.
          </h1>
        </div>
        <div className="hero-card">
          <p className="hero-title">Edge-ready detection pipeline</p>
          <p className="hero-body">
            YOLOv8n inference with FastAPI + Streamlit, optimized for responsive POS workflows and rapid staff training.
          </p>
        </div>
      </header>

      <section className="content">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Capture or upload</h2>
              <p>Detect packaged items, trays, or menu plates in under a second.</p>
            </div>
            <span className="status">{statusLabel}</span>
          </div>

          <div className="panel-actions">
            <label className="upload">
              <input
                type="file"
                accept="image/*"
                onChange={(event) => handleUpload(event.target.files?.[0])}
              />
              Upload image
            </label>
            <button className="secondary" onClick={streamActive ? stopCamera : startCamera}>
              {streamActive ? "Stop camera" : "Start camera"}
            </button>
            <button onClick={captureFrame} disabled={!streamActive || busy}>
              Capture frame
            </button>
          </div>

          <div className="preview">
            <div className="preview-frame">
              {previewUrl ? (
                <>
                  <img
                    ref={imageRef}
                    src={previewUrl}
                    alt="Preview"
                    onLoad={handleImageLoad}
                  />
                  <canvas ref={overlayRef} className="overlay" />
                </>
              ) : (
                <div className="placeholder">No image selected yet</div>
              )}
            </div>
            <div className="preview-side">
              <div className="metrics">
                <div>
                  <span>Detections</span>
                  <strong>{detectionCount}</strong>
                </div>
                <div>
                  <span>Latency</span>
                  <strong>{result ? `${result.inferenceMs.toFixed(0)} ms` : "-"}</strong>
                </div>
              </div>
              {error && <p className="error">{error}</p>}
              <div className="list">
                {result?.detections.map((det, index) => (
                  <div key={`${det.label}-${index}`} className="list-item">
                    <div>
                      <p>{det.label}</p>
                      <span>{(det.confidence * 100).toFixed(1)}% confidence</span>
                    </div>
                    <span className="pill">POS-ready</span>
                  </div>
                ))}
                {!result && !error && (
                  <p className="muted">
                    Results will appear here after inference completes.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <aside className="panel support">
          <h3>POS integration flow</h3>
          <ol>
            <li>Camera or POS scanner sends frame to the edge service.</li>
            <li>YOLOv8n ONNX model classifies items in under 1s.</li>
            <li>Detected SKUs sync with the POS cart via API.</li>
          </ol>
          <div className="device">
            <video ref={videoRef} muted playsInline />
            <canvas ref={videoOverlayRef} className="overlay" />
          </div>
        </aside>
      </section>

      <footer className="footer">
        <span className="footer-name">
          Built by Duncan Sebampitako
          <a
            className="linkedin"
            href="https://www.linkedin.com/in/duncan-seb/"
            target="_blank"
            rel="noreferrer"
            aria-label="LinkedIn profile"
          >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5ZM0 8h5v16H0V8Zm7.5 0h4.8v2.2h.1c.67-1.27 2.3-2.6 4.73-2.6 5.06 0 6 3.32 6 7.64V24h-5v-7.17c0-1.71-.03-3.91-2.39-3.91-2.39 0-2.76 1.86-2.76 3.79V24h-5V8Z" />
          </svg>
          </a>
        </span>
      </footer>
    </main>
  );
}

function drawDetections(
  result: InferenceResult,
  imageEl: HTMLImageElement,
  canvasEl: HTMLCanvasElement
) {
  drawDetectionsOnCanvas(
    result,
    canvasEl,
    imageEl.clientWidth,
    imageEl.clientHeight
  );
}

function drawDetectionsOnCanvas(
  result: InferenceResult,
  canvasEl: HTMLCanvasElement,
  displayWidth: number,
  displayHeight: number
) {
  const ctx = canvasEl.getContext("2d");
  if (!ctx) return;
  const { imageWidth, imageHeight, detections } = result;

  canvasEl.width = displayWidth;
  canvasEl.height = displayHeight;

  ctx.clearRect(0, 0, displayWidth, displayHeight);
  ctx.strokeStyle = "#35d0ba";
  ctx.lineWidth = 2;
  ctx.font = "12px 'IBM Plex Mono', monospace";
  ctx.fillStyle = "#0b1e1b";

  detections.forEach((det) => {
    const [x1, y1, x2, y2] = det.box;
    const scaleX = displayWidth / imageWidth;
    const scaleY = displayHeight / imageHeight;

    const left = x1 * scaleX;
    const top = y1 * scaleY;
    const width = (x2 - x1) * scaleX;
    const height = (y2 - y1) * scaleY;

    ctx.strokeRect(left, top, width, height);
    const label = `${det.label} ${(det.confidence * 100).toFixed(0)}%`;
    const textWidth = ctx.measureText(label).width;
    ctx.fillRect(left, top - 18, textWidth + 10, 16);
    ctx.fillStyle = "#35d0ba";
    ctx.fillText(label, left + 4, top - 6);
    ctx.fillStyle = "#0b1e1b";
  });
}
