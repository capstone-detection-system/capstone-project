from pathlib import Path
from typing import Any

import librosa
import numpy as np
import tensorflow as tf


# ============================================================
# AUDIO CONFIGURATION
# Harus sama dengan preprocessing saat training
# ============================================================

SAMPLE_RATE = 16000
DURATION = 2.0
NUM_SAMPLES = int(SAMPLE_RATE * DURATION)

N_MFCC = 40
N_MELS = 64

FRAME_LENGTH = 512
FRAME_STEP = 160
FFT_LENGTH = 512


# ============================================================
# LOAD DAN POTONG AUDIO MENJADI CLIP
# ============================================================

def load_audio_clips(
    file_path: str | Path
) -> list[np.ndarray]:
    """
    Load audio, resample ke 16 kHz, ubah menjadi mono,
    lalu potong menjadi beberapa clip berdurasi 2 detik.

    Clip terakhir yang kurang dari 2 detik akan diberi padding nol.

    Contoh:
        audio 1 detik  -> 1 clip
        audio 2 detik  -> 1 clip
        audio 5 detik  -> 3 clip
        audio 60 detik -> 30 clip
    """

    audio, _ = librosa.load(
        str(file_path),
        sr=SAMPLE_RATE,
        mono=True
    )

    audio = audio.astype(
        np.float32
    )

    if len(audio) == 0:
        raise ValueError(
            "Audio kosong atau tidak dapat dibaca."
        )

    clips = []

    for start_index in range(
        0,
        len(audio),
        NUM_SAMPLES
    ):
        clip = audio[
            start_index:start_index + NUM_SAMPLES
        ]

        # Padding jika clip terakhir kurang dari 2 detik
        if len(clip) < NUM_SAMPLES:
            padding_size = (
                NUM_SAMPLES
                - len(clip)
            )

            clip = np.pad(
                clip,
                pad_width=(0, padding_size),
                mode="constant"
            )

        clips.append(
            clip.astype(np.float32)
        )

    return clips


# ============================================================
# PREPROCESS SATU CLIP AUDIO
# ============================================================

def preprocess_audio_clip(
    audio_clip: np.ndarray
) -> dict[str, tf.Tensor]:
    """
    Preprocess satu clip audio berdurasi tepat 2 detik.

    Returns:
        {
            "waveform_input": shape (1, 32000, 1),
            "mfcc_input": shape (1, 40, time_frames, 1)
        }
    """

    audio_tensor = tf.convert_to_tensor(
        audio_clip,
        dtype=tf.float32
    )

    # ========================================================
    # WAVEFORM INPUT
    # Shape: (batch, samples, channel)
    # ========================================================

    waveform_input = tf.expand_dims(
        audio_tensor,
        axis=-1
    )

    waveform_input = tf.expand_dims(
        waveform_input,
        axis=0
    )

    # ========================================================
    # MFCC INPUT
    # ========================================================

    # Center padding manual agar sama seperti training
    pad = FFT_LENGTH // 2

    audio_centered = tf.pad(
        audio_tensor,
        paddings=[[pad, pad]]
    )

    stft = tf.signal.stft(
        audio_centered,
        frame_length=FRAME_LENGTH,
        frame_step=FRAME_STEP,
        fft_length=FFT_LENGTH
    )

    spectrogram = tf.abs(
        stft
    )

    power_spectrogram = tf.square(
        spectrogram
    )

    num_spectrogram_bins = (
        FFT_LENGTH // 2 + 1
    )

    mel_weight_matrix = (
        tf.signal.linear_to_mel_weight_matrix(
            num_mel_bins=N_MELS,
            num_spectrogram_bins=num_spectrogram_bins,
            sample_rate=SAMPLE_RATE,
            lower_edge_hertz=80.0,
            upper_edge_hertz=7600.0
        )
    )

    mel_spectrogram = tf.matmul(
        power_spectrogram,
        mel_weight_matrix
    )

    log_mel_spectrogram = tf.math.log(
        mel_spectrogram + 1e-6
    )

    mfcc = tf.signal.mfccs_from_log_mel_spectrograms(
        log_mel_spectrogram
    )

    # Ambil 40 koefisien MFCC
    mfcc = mfcc[:, :N_MFCC]

    # Shape: (mfcc, time)
    mfcc = tf.transpose(
        mfcc
    )

    # Normalisasi MFCC
    mean = tf.reduce_mean(
        mfcc
    )

    std = tf.math.reduce_std(
        mfcc
    )

    mfcc = (
        (mfcc - mean)
        / (std + 1e-6)
    )

    # Shape: (batch, mfcc, time, channel)
    mfcc_input = tf.expand_dims(
        mfcc,
        axis=-1
    )

    mfcc_input = tf.expand_dims(
        mfcc_input,
        axis=0
    )

    return {
        "waveform_input": waveform_input,
        "mfcc_input": mfcc_input
    }


# ============================================================
# PREDIKSI SATU CLIP
# ============================================================

def predict_single_clip(
    model: tf.keras.Model,
    audio_clip: np.ndarray,
    threshold: float
) -> dict[str, Any]:
    """
    Prediksi terhadap satu clip audio berdurasi 2 detik.

    Model output:
        class 0 = real
        class 1 = fake
    """

    inputs = preprocess_audio_clip(
        audio_clip=audio_clip
    )

    logits = model(
        inputs,
        training=False
    )

    probabilities = tf.nn.softmax(
        logits,
        axis=-1
    ).numpy()[0]

    probability_real = float(
        probabilities[0]
    )

    probability_fake = float(
        probabilities[1]
    )

    predicted_label = (
        "fake"
        if probability_fake >= threshold
        else "real"
    )

    return {
        "prediction": predicted_label,
        "probability_real": probability_real,
        "probability_fake": probability_fake
    }


# ============================================================
# PREDIKSI AUDIO UTUH BERDASARKAN MAYORITAS CLIP
# ============================================================

def predict_audio(
    model: tf.keras.Model,
    file_path: str | Path,
    threshold: float = 0.60
) -> dict[str, Any]:
    """
    Potong audio menjadi clip 2 detik, prediksi setiap clip,
    lalu tentukan hasil akhir berdasarkan mayoritas clip.

    Jika jumlah prediksi fake dan real sama:
        gunakan rata-rata probability_fake sebagai tie breaker.
    """

    if not 0.0 <= threshold <= 1.0:
        raise ValueError(
            "Threshold harus berada pada rentang 0.0 sampai 1.0."
        )

    clips = load_audio_clips(
        file_path=file_path
    )

    clip_results = []

    for clip_index, clip in enumerate(
        clips,
        start=1
    ):
        result = predict_single_clip(
            model=model,
            audio_clip=clip,
            threshold=threshold
        )

        clip_results.append({
            "clip_index": clip_index,
            "start_second": round(
                (clip_index - 1) * DURATION,
                2
            ),
            "end_second": round(
                clip_index * DURATION,
                2
            ),
            "prediction": result["prediction"],
            "probability_real": round(
                result["probability_real"],
                6
            ),
            "probability_fake": round(
                result["probability_fake"],
                6
            )
        })

    total_clips = len(
        clip_results
    )

    fake_clips = sum(
        result["prediction"] == "fake"
        for result in clip_results
    )

    real_clips = (
        total_clips
        - fake_clips
    )

    average_probability_fake = float(
        np.mean([
            result["probability_fake"]
            for result in clip_results
        ])
    )

    average_probability_real = float(
        np.mean([
            result["probability_real"]
            for result in clip_results
        ])
    )

    # Hasil akhir berdasarkan mayoritas clip
    if fake_clips > real_clips:
        final_prediction = "fake"

    elif real_clips > fake_clips:
        final_prediction = "real"

    else:
        # Tie breaker jika jumlah real dan fake sama
        final_prediction = (
            "fake"
            if average_probability_fake >= threshold
            else "real"
        )

    return {
        "prediction": final_prediction,
        "decision_method": "majority_vote",
        "threshold": round(
            float(threshold),
            4
        ),
        "clip_duration_seconds": DURATION,
        "total_clips": total_clips,
        "real_clips": real_clips,
        "fake_clips": fake_clips,
        "average_probability_real": round(
            average_probability_real,
            6
        ),
        "average_probability_fake": round(
            average_probability_fake,
            6
        ),
        "clips": clip_results
    }