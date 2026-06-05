const express = require("express");
const router = express.Router();
const upload = require("../middlewares/uploadMiddleware");
const { predictAudio,getPredictions,getPredictionById, } = require("../controllers/predictionController");

router.post(
  "/predict",
  upload.single("file"),
  predictAudio
);

router.get(
  "/predictions",
  getPredictions
);

router.get(
  "/predictions/:id",
  getPredictionById
);

module.exports = router;