const mongoose = require("mongoose");

const QuestionSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  soru: { type: String, required: true },
  secenekler: { type: Map, of: String, required: true },
  cevap: { type: String, required: true },
  grup: { type: String, default: "Genel" }
});

module.exports = mongoose.model("Question", QuestionSchema);
