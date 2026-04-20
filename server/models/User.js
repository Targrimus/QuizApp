const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  sicil: { type: String, required: true, unique: true },
  ad: { type: String, required: true },
  soyad: { type: String, required: true },
  eposta: { type: String },
  gorev: { type: String },
  birim: { type: String },
  role: { type: String, enum: ["admin", "personel"], default: "personel" },
  password: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
