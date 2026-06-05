const axios = require("axios");

const generateAnalysis = async (predictionResult) => {

  const response = await axios.post(
    `${process.env.AI_SERVICE_URL}/generate-analysis`,
    {
      prediction: predictionResult.prediction,
      threshold: predictionResult.threshold,
      total_clips: predictionResult.total_clips,
      real_clips: predictionResult.real_clips,
      fake_clips: predictionResult.fake_clips,
      average_probability_real:
        predictionResult.average_probability_real,
      average_probability_fake:
        predictionResult.average_probability_fake,
    }
  );

  return response.data;
};

module.exports = {
  generateAnalysis,
};