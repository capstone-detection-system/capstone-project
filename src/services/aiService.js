const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

const predictAudio = async (filePath) => {
  const form = new FormData();

  form.append(
    "file",
    fs.createReadStream(filePath)
  );

  form.append(
    "threshold",
    "0.6"
  );

  const response = await axios.post(
    `${process.env.AI_SERVICE_URL}/predict`,
    form,
    {
      headers: form.getHeaders(),
    }
  );
  console.log(response.data);
  return response.data;
};

module.exports = {
  predictAudio,
};