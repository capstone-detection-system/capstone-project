const multer = require("multer");

const allowedMimeTypes = [
  "audio/wav",
  "audio/mpeg",
  "audio/flac",
  "audio/ogg",
  "audio/mp4",
];

const storage = multer.diskStorage({
  destination: "src/uploads",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const fileFilter = (
  req,
  file,
  cb
) => {

  if (
    allowedMimeTypes.includes(
      file.mimetype
    )
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Format audio tidak didukung"
      )
    );
  }
};

module.exports = multer({ storage,fileFilter });