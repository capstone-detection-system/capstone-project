"use client";

import { useRef, useState } from "react";

export default function HomePage() {
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState("upload");

  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // START RECORD
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });

        const url = URL.createObjectURL(audioBlob);

        setAudioURL(url);

        // stop microphone stream
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();

      setAudioURL("");
      setIsRecording(true);
    } catch (error) {
      alert("Microphone tidak diizinkan.");
      console.error(error);
    }
  };

  // STOP RECORD
  const stopRecording = () => {
    mediaRecorderRef.current?.stop();

    setIsRecording(false);
  };

  return (
    <main className={darkMode ? "page" : "page light"}>
      {/* NAVBAR */}
      <header className="navbar">
        <div className="logo">
          <span className="music">♪</span>

          <span>
            AudioGuard
            <span className="gradient-text">AI</span>
          </span>
        </div>

        <div className="nav-right">
          <div className="status">
            <span className="dot"></span>
            Offline
          </div>

          <button
            className="theme-btn"
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? "☾" : "☀"}
          </button>
        </div>
      </header>

      {/* HERO */}
      <section className="hero">
        <div className="badge">
          🛡 Powered by Hybrid CNN Model
        </div>

        <h1 className="hero-title">
          Deteksi Audio <span>Deepfake</span>
          <br />
          dengan Kecerdasan Buatan
        </h1>

        <p className="hero-desc">
          Upload file audio atau rekam suara langsung —
          AI kami akan menganalisis keaslian audio
          dalam hitungan detik.
        </p>

        <button className="hero-btn">
          ▶ Mulai Deteksi
        </button>
      </section>

      {/* UPLOAD */}
      <section className="upload-wrapper">
        <div className="upload-card">
          {/* TABS */}
          <div className="tabs">
            <button
              className={
                activeTab === "upload"
                  ? "tab active"
                  : "tab"
              }
              onClick={() => setActiveTab("upload")}
            >
              ⬆ Upload File
            </button>

            <button
              className={
                activeTab === "record"
                  ? "tab active"
                  : "tab"
              }
              onClick={() => setActiveTab("record")}
            >
              🎤 Rekam Suara
            </button>
          </div>

          {/* UPLOAD TAB */}
          {activeTab === "upload" && (
            <>
              <div className="dropzone">
                <div className="upload-icon">⇪</div>

                <h3>
                  Drag & drop file audio di sini
                </h3>

                <p>atau</p>

                <label className="choose-btn">
                  Pilih File

                  <input
                    type="file"
                    accept="audio/*"
                    hidden
                  />
                </label>

                <span>
                  MP3, WAV, OGG, FLAC, M4A, AAC,
                  WebM — Maks. 10 MB
                </span>
              </div>

              <button className="analyze-btn">
                🔍 Analisis Sekarang
              </button>
            </>
          )}

          {/* RECORD TAB */}
          {activeTab === "record" && (
            <>
              <div className="dropzone">
                <div className="upload-icon">🎤</div>

                <h3>
                  Rekam suara langsung dari mikrofon
                </h3>

                <p>
                  Klik tombol di bawah untuk mulai
                  merekam suara
                </p>

                {/* BUTTON AREA */}
                <div className="record-actions">
                  {!isRecording ? (
                    <button
                      className="record-btn start-btn"
                      onClick={startRecording}
                    >
                      ⏺ Mulai Rekam
                    </button>
                  ) : (
                    <button
                      className="record-btn stop-btn"
                      onClick={stopRecording}
                    >
                      ⏹ Stop Rekam
                    </button>
                  )}
                </div>

                {/* AUDIO PLAYER */}
                {audioURL && (
                  <div className="audio-player-wrapper">
                    <audio
                      controls
                      src={audioURL}
                      className="audio-player"
                    />
                  </div>
                )}

                <span>
                  Rekaman suara akan digunakan
                  untuk analisis deepfake AI
                </span>
              </div>

              <button className="analyze-btn">
                🔍 Analisis Rekaman
              </button>
            </>
          )}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section">
        <h2 className="section-title">
          Bagaimana Cara Kerjanya?
        </h2>

        <p className="section-desc">
          Tiga langkah sederhana untuk mendeteksi
          keaslian audio
        </p>

        <div className="card-grid">
          <div className="info-card">
            <div className="number-circle">1</div>

            <div className="card-icon">⇪</div>

            <h3>Upload atau Rekam</h3>

            <p>
              Upload file audio (MP3, WAV, dll.)
              atau rekam suara langsung dari
              mikrofon browser Anda.
            </p>
          </div>

          <div className="info-card">
            <div className="number-circle">2</div>

            <div className="card-icon">▣</div>

            <h3>Analisis AI</h3>

            <p>
              Model Hybrid CNN menganalisis
              waveform dan MFCC audio untuk
              mendeteksi pola deepfake.
            </p>
          </div>

          <div className="info-card">
            <div className="number-circle">3</div>

            <div className="card-icon">✓</div>

            <h3>Lihat Hasil</h3>

            <p>
              Dapatkan hasil instan: apakah audio
              tersebut Real (asli) atau Fake
              (deepfake).
            </p>
          </div>
        </div>
      </section>

      {/* TECHNOLOGY */}
      <section className="section">
        <h2 className="section-title">
          Teknologi di Balik Deteksi
        </h2>

        <p className="section-desc">
          Model AI yang menggabungkan dua
          pendekatan analisis audio
        </p>

        <div className="card-grid">
          <div className="tech-card">
            <div className="tech-icon">⌁</div>

            <h3>1D CNN — Waveform</h3>

            <p>
              Menganalisis pola gelombang mentah
              untuk mendeteksi artefak audio.
            </p>
          </div>

          <div className="tech-card">
            <div className="tech-icon">▦</div>

            <h3>2D CNN — MFCC</h3>

            <p>
              Mengekstrak fitur frekuensi untuk
              mengenali suara sintetis.
            </p>
          </div>

          <div className="tech-card">
            <div className="tech-icon">◔</div>

            <h3>Hybrid Fusion</h3>

            <p>
              Menggabungkan kedua fitur untuk hasil
              klasifikasi lebih akurat.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-logo">
          ♪ AudioGuard <span>AI</span>
        </div>

        <p className="footer-text">
          Audio Deepfake Detector — Powered by
          Hybrid CNN Model
        </p>

        <div className="footer-links">
          <a href="#">API Docs</a>

          <a href="#">HuggingFace</a>
        </div>

        <p className="copyright">
          © 2026 AudioGuardAI. Built for
          Capstone Project.
        </p>
      </footer>
    </main>
  );
}