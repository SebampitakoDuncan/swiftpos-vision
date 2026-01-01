import io
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

from inference import run_inference

app = FastAPI(title="SwiftPOS Vision API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/infer")
async def infer(file: UploadFile = File(...)) -> dict:
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")
    return run_inference(image)
