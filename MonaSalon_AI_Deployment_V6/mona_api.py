import asyncio
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
import os
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from mona_inference import MonaSalonPredictor

BASE_DIR = Path(__file__).resolve().parent
predictor = None
inference_executor: ThreadPoolExecutor | None = None

MAX_UPLOAD_BYTES = 10 * 1024 * 1024


def _init_predictor() -> MonaSalonPredictor:
    return MonaSalonPredictor(
        model_dir=BASE_DIR,
        device=os.getenv("MONA_DEVICE", "auto"),
    )


def _close_predictor():
    global predictor
    if predictor is not None:
        predictor.close()
        predictor = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global predictor, inference_executor
    # Single dedicated worker thread ensures MediaPipe LiteRT/XNNPACK is always
    # initialized, invoked, and closed on the exact same thread (thread-safe & non-blocking).
    inference_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="mona-ai")
    loop = asyncio.get_running_loop()
    predictor = await loop.run_in_executor(inference_executor, _init_predictor)
    try:
        yield
    finally:
        await loop.run_in_executor(inference_executor, _close_predictor)
        inference_executor.shutdown(wait=True)
        inference_executor = None


app = FastAPI(
    title="Mona Salon Face Shape API",
    version="0.2.0",
    lifespan=lifespan,
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
    cfg = predictor.config if predictor is not None else {}
    return {
        "status": "ok",
        "model": cfg.get("model_name", "ConvNeXt-Small + GeoLandmarks V7"),
        "device": str(predictor.device) if predictor is not None else "unknown",
        "metrics": {
            "test_accuracy": cfg.get("test_accuracy"),
            "test_macro_precision": cfg.get("test_macro_precision"),
            "test_macro_recall": cfg.get("test_macro_recall"),
            "test_macro_f1": cfg.get("test_macro_f1"),
            "test_ece": cfg.get("test_ece"),
        },
    }


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if file.content_type not in [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/avif",
    ]:
        raise HTTPException(
            status_code=415,
            detail="Format gambar tidak didukung",
        )

    data = await file.read(MAX_UPLOAD_BYTES + 1)

    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Ukuran foto maksimal 10 MB",
        )

    if predictor is None or inference_executor is None:
        raise HTTPException(
            status_code=503,
            detail="Model AI sedang dimuat, silakan coba beberapa saat lagi",
        )

    try:
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(inference_executor, predictor.predict, data)
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Foto tidak dapat diproses: {str(exc)}",
        )

    if not result["success"]:
        error_msg = result.get(
            "error",
            "Wajah tidak terdeteksi jelas, silakan unggah ulang foto Anda",
        )
        if error_msg == "Wajah tidak terdeteksi":
            error_msg = "Wajah tidak terdeteksi jelas, silakan unggah ulang foto Anda"
        raise HTTPException(
            status_code=422,
            detail=error_msg,
        )

    return result
