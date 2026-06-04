from contextlib import asynccontextmanager
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Annotated

import tensorflow as tf
from fastapi import (
    FastAPI,
    File,
    Form,
    HTTPException,
    UploadFile
)

from custom_layers import (
    AdaptiveAvgPool1D,
    AdaptiveAvgPool2D
)

from inference import predict_audio


# ============================================================
# CONFIGURATION
# ============================================================

MODEL_PATH = Path(
    "best_torchlike_mfcc_waveform_model.keras"
)

ALLOWED_EXTENSIONS = {
    ".wav",
    ".mp3",
    ".flac",
    ".ogg",
    ".m4a"
}

MAX_FILE_SIZE_MB = 20
MAX_FILE_SIZE_BYTES = (
    MAX_FILE_SIZE_MB
    * 1024
    * 1024
)

model: tf.keras.Model | None = None


# ============================================================
# LOAD MODEL ON STARTUP
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    global model

    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model tidak ditemukan: {MODEL_PATH}"
        )

    print("Loading model...")

    model = tf.keras.models.load_model(
        MODEL_PATH,
        custom_objects={
            "AdaptiveAvgPool1D": AdaptiveAvgPool1D,
            "AdaptiveAvgPool2D": AdaptiveAvgPool2D
        },
        compile=False
    )

    print("Model loaded successfully.")

    yield

    model = None


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="Deepfake Audio Detection API",
    description=(
        "REST API untuk mendeteksi audio real atau fake "
        "menggunakan model MFCC + Waveform."
    ),
    version="1.0.0",
    lifespan=lifespan
)


# ============================================================
# ROUTES
# ============================================================

@app.get("/")
def root():
    return {
        "message": "Deepfake Audio Detection API",
        "status": "running",
        "docs": "/docs",
        "predict_endpoint": "/predict",
        "default_threshold": 0.60
    }


@app.get("/health")
def health():
    return {
        "status": (
            "healthy"
            if model is not None
            else "model_not_loaded"
        ),
        "model_loaded": model is not None
    }


@app.post("/predict")
async def predict(
    file: Annotated[
        UploadFile,
        File(
            description=(
                "File audio dengan format WAV, MP3, "
                "FLAC, OGG, atau M4A."
            )
        )
    ],
    threshold: Annotated[
        float,
        Form(
            ge=0.0,
            le=1.0,
            description=(
                "Audio dianggap fake jika probability_fake "
                "lebih besar atau sama dengan threshold."
            )
        )
    ] = 0.60
):
    """
    Prediksi apakah audio termasuk real atau fake.

    Default threshold:
        0.60

    Threshold dapat diubah pada setiap request.
    """

    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Model belum siap digunakan."
        )

    original_filename = file.filename or "uploaded_audio.wav"

    suffix = Path(
        original_filename
    ).suffix.lower()

    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                "Format audio tidak didukung. "
                "Gunakan WAV, MP3, FLAC, OGG, atau M4A."
            )
        )

    file_content = await file.read()

    if len(file_content) == 0:
        raise HTTPException(
            status_code=400,
            detail="File audio kosong."
        )

    if len(file_content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=(
                f"Ukuran file terlalu besar. "
                f"Maksimal {MAX_FILE_SIZE_MB} MB."
            )
        )

    temp_path: Path | None = None

    try:
        with NamedTemporaryFile(
            delete=False,
            suffix=suffix
        ) as temp_file:
            temp_file.write(file_content)

            temp_path = Path(
                temp_file.name
            )

        result = predict_audio(
            model=model,
            file_path=temp_path,
            threshold=threshold
        )

        return {
            "filename": original_filename,
            **result
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        ) from error

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Inference gagal: {str(error)}"
        ) from error

    finally:
        if (
            temp_path is not None
            and temp_path.exists()
        ):
            temp_path.unlink()