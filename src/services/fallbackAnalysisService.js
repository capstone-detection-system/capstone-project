const generateFallbackAnalysis = (
  predictionResult
) => {

  const confidence =
    (
      predictionResult
        .average_probability_real *
      100
    ).toFixed(2);

  if (
    predictionResult.prediction ===
    "real"
  ) {

    return {
      source: "fallback",

      text:
        `Audio terdeteksi sebagai suara ASLI (REAL) ` +
        `dengan tingkat kepercayaan ${confidence}%. ` +
        `Dari ${predictionResult.total_clips} segmen audio, ` +
        `${predictionResult.real_clips} segmen diklasifikasikan REAL ` +
        `dan ${predictionResult.fake_clips} segmen diklasifikasikan FAKE.`
    };
  }

  return {
    source: "fallback",

    text:
      `Audio terdeteksi sebagai suara PALSU (FAKE). ` +
      `Dari ${predictionResult.total_clips} segmen audio, ` +
      `${predictionResult.fake_clips} segmen terindikasi FAKE.`
  };
};

module.exports = {
  generateFallbackAnalysis,
};