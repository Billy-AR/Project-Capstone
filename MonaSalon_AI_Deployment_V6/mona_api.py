
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool
from mona_inference import MonaSalonPredictor

BASE_DIR = Path(__file__).resolve().parent
predictor = None

MAX_UPLOAD_BYTES = 10 * 1024 * 1024

@asynccontextmanager
async def lifespan(app: FastAPI):
    global predictor
    predictor = MonaSalonPredictor(
        model_dir=BASE_DIR,
        device=os.getenv("MONA_DEVICE", "cpu")
    )
    yield
    predictor.close()

app = FastAPI(
    title="Mona Salon Face Shape API",
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": "EfficientNet-B4 V6"
    }

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if file.content_type not in [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/avif"
    ]:
        raise HTTPException(
            status_code=415,
            detail="Format gambar tidak didukung"
        )

    data = await file.read(MAX_UPLOAD_BYTES + 1)

    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Ukuran foto maksimal 10 MB"
        )

    try:
        # Jalankan inferensi PyTorch dan MediaPipe di threadpool agar tidak memblokir event loop asyncio
        result = await run_in_threadpool(predictor.predict, data)
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Foto tidak dapat diproses: {str(exc)}"
        )

    if not result["success"]:
        error_msg = result.get("error", "Wajah tidak terdeteksi jelas, silakan unggah ulang foto Anda")
        if error_msg == "Wajah tidak terdeteksi":
            error_msg = "Wajah tidak terdeteksi jelas, silakan unggah ulang foto Anda"
        raise HTTPException(
            status_code=422,
            detail=error_msg
        )

    return result
