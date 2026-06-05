import os
from typing import Any

from google import genai
from google.genai import types
from pydantic import BaseModel, Field


# ============================================================
# CONFIGURATION
# ============================================================

GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-2.5-pro"
)


# ============================================================
# STRUCTURED OUTPUT SCHEMA
# ============================================================

class AIAnalysisResult(BaseModel):
    summary: str = Field(
        description=(
            "Ringkasan hasil deteksi deepfake audio "
            "dalam Bahasa Indonesia."
        )
    )

    recommendation: list[str] = Field(
        description=(
            "Daftar rekomendasi tindakan lanjutan."
        )
    )

    disclaimer: str = Field(
        description=(
            "Peringatan bahwa hasil deteksi bukan "
            "bukti forensik final."
        )
    )


# ============================================================
# GEMINI CLIENT
# ============================================================

def get_gemini_client() -> genai.Client:
    api_key = os.getenv(
        "GEMINI_API_KEY"
    )

    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY belum dikonfigurasi."
        )

    return genai.Client(
        api_key=api_key
    )


# ============================================================
# GENERATE AI ANALYSIS
# ============================================================

def generate_detection_analysis(
    detection_result: dict[str, Any]
) -> dict[str, Any]:
    """
    Gemini hanya menjelaskan hasil model TensorFlow.
    Gemini tidak menentukan label real atau fake.
    """

    client = get_gemini_client()

    prediction = detection_result["prediction"]
    threshold = detection_result["threshold"]
    total_clips = detection_result["total_clips"]
    real_clips = detection_result["real_clips"]
    fake_clips = detection_result["fake_clips"]

    average_probability_real = detection_result[
        "average_probability_real"
    ]

    average_probability_fake = detection_result[
        "average_probability_fake"
    ]

    prompt = f"""
Anda adalah AI Analysis Assistant untuk aplikasi pendeteksi
deepfake audio.

Tugas Anda hanya menjelaskan hasil klasifikasi dari model
TensorFlow. Jangan mengubah hasil klasifikasi.

Gunakan Bahasa Indonesia yang mudah dipahami dan ringkas.

Aturan penting:
- Jangan mengubah label prediction.
- Jangan menyatakan hasil sebagai bukti forensik final.
- Jangan membuat klaim berlebihan.
- Berikan rekomendasi tindakan yang praktis.
- Jelaskan bahwa hasil bersifat indikasi awal.

Hasil deteksi model TensorFlow:
- prediction: {prediction}
- threshold: {threshold}
- total_clips: {total_clips}
- real_clips: {real_clips}
- fake_clips: {fake_clips}
- average_probability_real: {average_probability_real}
- average_probability_fake: {average_probability_fake}
"""

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=AIAnalysisResult
        )
    )

    if not response.text:
        raise RuntimeError(
            "Gemini API tidak mengembalikan respons."
        )

    parsed_result = AIAnalysisResult.model_validate_json(
        response.text
    )

    return parsed_result.model_dump()