const mongoose = require("mongoose");

const TestAssignmentSchema = new mongoose.Schema({
  personel: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
  expiresAt: { type: Date, required: true },
  isCompleted: { type: Boolean, default: false },
  score: { type: Number, default: 0 },
  letterGrade: { type: String, default: '' },
  completedAt: { type: Date, default: null },
  answers: { type: Map, of: String },
  ipAddress: { type: String, default: null },
  terminationReason: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model("TestAssignment", TestAssignmentSchema);
