const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  _id:               { type: String }, // Use a custom string ID (e.g., "student_001")
  name:              { type: String, required: true },
  preferredLanguage: { type: String, default: 'python' },
  stats: {
    totalSubmissions: { type: Number, default: 0 },
    passRate:         { type: Number, default: 0 },   // 0–1 float
    avgHintsUsed:     { type: Number, default: 0 },
  },
}, { _id: false }); // Disable auto _id so we use our own string ID

module.exports = mongoose.model('Student', studentSchema);
