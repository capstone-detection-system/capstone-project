const express = require("express");
const cors = require("cors");

const predictionRoutes = require("./routes/predictionRoutes");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Server running",
  });
});

app.use("/api", predictionRoutes);

app.use(errorHandler);

module.exports = app;