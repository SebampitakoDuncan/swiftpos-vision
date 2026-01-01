# SwiftPOS Vision

Real-time POS item recognition demo using YOLOv8n (ONNX), built as a Vercel-ready PWA frontend with a FastAPI + Streamlit inference service.

## What this demonstrates
- Lightweight object detection (YOLOv8n ONNX) for POS environments
- Edge-style inference service with JSON API for POS integration
- Upload + webcam workflows for operators
- Clean, professional UI inspired by modern SaaS hardware brands

## Project layout
- `web/`: Next.js frontend (Vercel deployment)
- `server/`: FastAPI inference API + Streamlit demo UI
- `models/`: YOLOv8n ONNX model (`yolov8n.onnx`)

## Local setup

### 1) API + Streamlit
```bash
cd swiftpos-vision/server
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Optional Streamlit UI:
```bash
cd swiftpos-vision/server
source .venv/bin/activate
streamlit run streamlit_app.py
```

### 2) Frontend
```bash
cd swiftpos-vision/web
npm install
NEXT_PUBLIC_INFER_URL=http://localhost:8000 npm run dev
```

Open `http://localhost:3000` and test upload + webcam capture.

## Deployment notes
- Frontend: deploy `swiftpos-vision/web` to Vercel.
- Backend: deploy to a free Hugging Face Space using the provided `Dockerfile`.
- Set the Vercel env var `NEXT_PUBLIC_INFER_URL` to the FastAPI base URL.

### Hugging Face Spaces (FastAPI)
1) Create a new Space at https://huggingface.co/spaces and choose **Docker**.
2) Connect the GitHub repo and select this project.
3) Keep the default port `7860` (the Dockerfile uses it).
4) Deploy; after it builds you will get a public URL like `https://<space-name>.hf.space`.
5) Set `NEXT_PUBLIC_INFER_URL` in Vercel to that URL.

## Model file
The repo includes `models/yolov8n.onnx`. If you want to re-export:
```bash
pip install ultralytics==8.2.47 onnx==1.16.1
TORCH_FORCE_NO_WEIGHTS_ONLY_LOAD=1 python - <<'PY'
from ultralytics import YOLO
model = YOLO("yolov8n.pt")
model.export(format="onnx", imgsz=640, simplify=False)
PY
```

## API
- `POST /infer`: multipart form with `file` (image). Returns detections + latency.
- `GET /health`: health check.
