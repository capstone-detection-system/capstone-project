const aiService = require("../services/aiService");
const analysisService = require("../services/analysisService");
const prisma = require("../lib/prisma");
const fs = require("fs");
const fallbackAnalysisService =require("../services/fallbackAnalysisService");

const predictAudio = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: "fail",
        message: "File audio wajib diupload",
      });
    }

    const result = await aiService.predictAudio(
      req.file.path
    );

    console.log("=== RESULT AI ===");
    console.log(
      JSON.stringify(result, null, 2)
    );

    let analysis = null;

    try {

      analysis =
        await analysisService.generateAnalysis(
          result
        );

      console.log("=== GEMINI ANALYSIS ===");
      console.log(
        JSON.stringify(analysis, null, 2)
      );

    } catch (analysisError) {

      console.error(
        "=== GEMINI ANALYSIS ERROR ==="
      );

      if (analysisError.response) {
        console.error(
          analysisError.response.data
        );
      } else {
        console.error(analysisError);
      }

      console.log(
        "Using fallback analysis..."
      );

      analysis =
        fallbackAnalysisService
          .generateFallbackAnalysis(
            result
          );

      console.log(
        JSON.stringify(analysis, null, 2)
      );
    }

    const savedPrediction =
      await prisma.prediction.create({
        data: {
          filename: result.filename,

          prediction: result.prediction,

          confidence:
            result.average_probability_real *
            100,

          realClips:
            result.real_clips,

          fakeClips:
            result.fake_clips,

          analysis:
            JSON.stringify(analysis),
        },
      });

    if (
      req.file &&
      fs.existsSync(req.file.path)
    ) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(200).json({
      status: "success",

      predictionId:
        savedPrediction.id,

      summary: {
        prediction:
          result.prediction,

        confidence: Number(
          (
            result.average_probability_real *
            100
          ).toFixed(2)
        ),

        realClips:
          result.real_clips,

        fakeClips:
          result.fake_clips,

        totalClips:
          result.total_clips,
      },

      analysis,

      details: result,
    });

  } catch (error) {

    if (
      req.file &&
      fs.existsSync(req.file.path)
    ) {
      fs.unlink(
        req.file.path,
        () => {}
      );
    }

    console.error(
      "=== PREDICT ERROR ==="
    );

    if (error.response) {
      console.error(
        error.response.data
      );
    } else {
      console.error(error);
    }

    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

const getPredictions = async (
  req,
  res
) => {
  try {

    const page =
      parseInt(req.query.page) || 1;

    const limit =
      parseInt(req.query.limit) || 10;

    const skip =
      (page - 1) * limit;

    const total =
      await prisma.prediction.count();

    const predictions =
      await prisma.prediction.findMany({
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      });

    res.status(200).json({
      status: "success",
      page,
      limit,
      total,
      totalPages: Math.ceil(
        total / limit
      ),
      data: predictions,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

const getPredictionById = async (
  req,
  res
) => {
  try {

    const { id } = req.params;

    const prediction =
      await prisma.prediction.findUnique({
        where: {
          id: Number(id),
        },
      });

    if (!prediction) {
      return res.status(404).json({
        status: "fail",
        message:
          "Data prediksi tidak ditemukan",
      });
    }

    res.status(200).json({
      status: "success",
      data: prediction,
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

module.exports = {
  predictAudio,
  getPredictions,
  getPredictionById,
};