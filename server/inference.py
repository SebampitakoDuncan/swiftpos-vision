import os
import time
from functools import lru_cache
from typing import Any, Dict

from PIL import Image
from ultralytics import YOLO

DEFAULT_MODEL_PATH = os.path.join(
    os.path.dirname(__file__),
    "..",
    "models",
    "yolov8n.onnx",
)


@lru_cache(maxsize=1)
def get_model() -> YOLO:
    model_path = os.getenv("MODEL_PATH", DEFAULT_MODEL_PATH)
    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"Model not found at {model_path}. Add yolov8n.onnx under models/."
        )
    return YOLO(model_path)


def run_inference(image: Image.Image) -> Dict[str, Any]:
    model = get_model()
    start = time.perf_counter()
    results = model.predict(image, conf=0.25, iou=0.45, verbose=False)
    elapsed_ms = (time.perf_counter() - start) * 1000

    result = results[0]
    detections = []
    if result.boxes is not None:
        for box in result.boxes:
            xyxy = box.xyxy[0].tolist()
            cls_index = int(box.cls[0]) if box.cls is not None else -1
            confidence = float(box.conf[0]) if box.conf is not None else 0.0
            label = result.names.get(cls_index, str(cls_index))
            detections.append(
                {
                    "label": label,
                    "confidence": confidence,
                    "box": [float(v) for v in xyxy],
                }
            )

    height, width = result.orig_shape
    return {
        "imageWidth": int(width),
        "imageHeight": int(height),
        "detections": detections,
        "inferenceMs": elapsed_ms,
    }
