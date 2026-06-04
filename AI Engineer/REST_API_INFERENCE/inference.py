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


def preprocess_single_audio(
    file_path: str | Path
) -> dict[str, tf.Tensor]:
    """
    Load dan preprocess satu file audio.

    Returns:
        {
            "waveform_input": shape (1, 32000, 1),
            "mfcc_input": shape (1, 40, time_frames, 1)
        }
    """

    file_path = str(file_path)

    # Load audio, ubah menjadi mono, lalu resample ke 16 kHz
    audio, _ = librosa.load(
        file_path,
        sr=SAMPLE_RATE,
        mono=True
    )

    audio = audio.astype(np.float32)

    # Potong atau tambahkan padding agar panjang audio tepat 2 detik
    if len(audio) > NUM_SAMPLES:
        audio = audio[:NUM_SAMPLES]

    elif len(audio) < NUM_SAMPLES:
        padding_size = NUM_SAMPLES - len(audio)

        audio = np.pad(
            audio,
            pad_width=(0, padding_size),
            mode="constant"
        )

    audio_tensor = tf.convert_to_tensor(
        audio,
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

    # Center padding manual agar sama seperti pipeline training
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

    spectrogram = tf.abs(stft)
    power_spectrogram = tf.square(spectrogram)

    num_spectrogram_bins = FFT_LENGTH // 2 + 1

    mel_weight_matrix = tf.signal.linear_to_mel_weight_matrix(
        num_mel_bins=N_MELS,
        num_spectrogram_bins=num_spectrogram_bins,
        sample_rate=SAMPLE_RATE,
        lower_edge_hertz=80.0,
        upper_edge_hertz=7600.0
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

    # Ubah shape dari (time, mfcc) menjadi (mfcc, time)
    mfcc = tf.transpose(mfcc)

    # Normalisasi MFCC
    mean = tf.reduce_mean(mfcc)
    std = tf.math.reduce_std(mfcc)

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


def predict_audio(
    model: tf.keras.Model,
    file_path: str | Path,
    threshold: float = 0.60
) -> dict[str, Any]:
    """
    Melakukan prediksi terhadap satu file audio.

    Model output:
        class 0 = real
        class 1 = fake

    Threshold diterapkan pada probability_fake.
    """

    if not 0.0 <= threshold <= 1.0:
        raise ValueError(
            "Threshold harus berada pada rentang 0.0 sampai 1.0."
        )

    inputs = preprocess_single_audio(
        file_path=file_path
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
        "threshold": round(float(threshold), 4),
        "probability_real": round(probability_real, 6),
        "probability_fake": round(probability_fake, 6)
    }