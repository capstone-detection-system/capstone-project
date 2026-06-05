"use client";

import { useRef, useState } from "react";

export default function HomePage() {
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState("upload");

  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

  // HANDLE FILE CHANGE
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setAudioURL(URL.createObjectURL(e.target.files[0]));
      setResult(null);
    }
  };

  // HANDLE ANALYZE
  const handleAnalyze = async () => {
    let fileToUpload = selectedFile;

    // If in record tab and there's a recording
    if (activeTab === "record" && audioURL) {
      const response = await fetch(audioURL);
      const blob = await response.blob();
      fileToUpload = new File([blob], "recording.wav", { type: "audio/wav" });
    }

    if (!fileToUpload) {
      alert("Silakan pilih file atau rekam suara terlebih dahulu.");
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    const formData = new FormData();
    formData.append("audio", fileToUpload);

    try {
      const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.status === "success") {
        setResult(data);
      } else {
        alert("Gagal menganalisis audio: " + data.message);
      }
    } catch (error) {
      console.error("Error analyzing audio:", error);
      alert("Terjadi kesalahan saat menghubungi server.");
    } finally {
      setIsAnalyzing(false);
    }
  };

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
        setResult(null);

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
            <span className="dot" style={{ backgroundColor: result ? "#10b981" : "#6b7280" }}></span>
            {result ? "Online" : "Offline"}
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

        <button className="hero-btn" onClick={() => {
          document.getElementById('upload-section')?.scrollIntoView({ behavior: 'smooth' });
        }}>
          ▶ Mulai Deteksi
        </button>
      </section>

      {/* UPLOAD */}
      <section id="upload-section" className="upload-wrapper">
        <div className="upload-card">
          {/* TABS */}
          <div className="tabs">
            <button
              className={
                activeTab === "upload"
                  ? "tab active"
                  : "tab"
              }
              onClick={() => {
                setActiveTab("upload");
                setResult(null);
              }}
            >
              ⬆ Upload File
            </button>

            <button
              className={
                activeTab === "record"
                  ? "tab active"
                  : "tab"
              }
              onClick={() => {
                setActiveTab("record");
                setResult(null);
              }}
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
                  {selectedFile ? selectedFile.name : "Drag & drop file audio di sini"}
                </h3>

                <p>atau</p>

                <label className="choose-btn">
                  Pilih File

                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileChange}
                    hidden
                  />
                </label>

                <span>
                  MP3, WAV, OGG, FLAC, M4A, AAC,
                  WebM — Maks. 10 MB
                </span>
              </div>

              {audioURL && (
                <div className="audio-player-wrapper" style={{ marginTop: '1rem' }}>
                  <audio controls src={audioURL} className="audio-player" />
                </div>
              )}

              <button 
                className="analyze-btn" 
                onClick={handleAnalyze}
                disabled={isAnalyzing || !selectedFile}
              >
                {isAnalyzing ? "⌛ Menganalisis..." : "🔍 Analisis Sekarang"}
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

              <button 
                className="analyze-btn" 
                onClick={handleAnalyze}
                disabled={isAnalyzing || !audioURL}
              >
                {isAnalyzing ? "⌛ Menganalisis..." : "🔍 Analisis Rekaman"}
              </button>
            </>
          )}

          {/* RESULT DISPLAY */}
          {result && (
            <div className="result-card" style={{ 
              marginTop: '2rem', 
              padding: '1.5rem', 
              borderRadius: '12px', 
              backgroundColor: result.summary.prediction === 'real' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${result.summary.prediction === 'real' ? '#10b981' : '#ef4444'}`
            }}>
              <h3 style={{ color: result.summary.prediction === 'real' ? '#10b981' : '#ef4444', marginBottom: '0.5rem' }}>
                Hasil Analisis: {result.summary.prediction.toUpperCase()}
              </h3>
              <p>Tingkat Kepercayaan: <strong>{result.summary.confidence.toFixed(2)}%</strong></p>
              <div style={{ marginTop: '1rem', fontSize: '0.9rem', lineHeight: '1.5' }}>
                <strong>Analisis AI:</strong>
                <p>
                  {result.analysis?.analysis?.summary || result.analysis?.text || "Tidak ada analisis tersedia."}
                </p>
                
                {result.analysis?.analysis?.recommendation && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <strong>Rekomendasi:</strong>
                    <ul style={{ paddingLeft: '1.2rem', marginTop: '0.2rem' }}>
                      {result.analysis.analysis.recommendation.map((rec: string, index: number) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <small style={{ color: '#6b7280', display: 'block', marginTop: '1rem' }}>
                  Sumber: {result.analysis?.source || (result.analysis?.analysis ? "Gemini AI" : "Unknown")}
                </small>
              </div>
            </div>
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