FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    MPLCONFIGDIR=/tmp \
    YOLO_CONFIG_DIR=/tmp \
    TORCH_FORCE_NO_WEIGHTS_ONLY_LOAD=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY server/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY server /app/server
COPY models /app/models

RUN python - <<'PY'
import os
from ultralytics import YOLO

model_path = "/app/models/yolov8n.onnx"
if not os.path.exists(model_path):
    model = YOLO("yolov8n.pt")
    model.export(format="onnx", imgsz=640, opset=18, simplify=False)
    if os.path.exists("yolov8n.onnx"):
        os.replace("yolov8n.onnx", model_path)
PY

WORKDIR /app/server

EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
