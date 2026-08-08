const mongoose = require('mongoose');

const testResultSchema = new mongoose.Schema({
  input:    { type: String, default: '' },
  expected: { type: String, default: '' },
  actual:   { type: String, default: '' },
  passed:   { type: Boolean, required: true },
}, { _id: false });

const empiricalPointSchema = new mongoose.Schema({
  inputSize: { type: Number, required: true },
  timeMs:    { type: Number, required: true },
}, { _id: false });

const suggestionSchema = new mongoose.Schema({
  issue:          { type: String },
  why_it_matters: { type: String },
}, { _id: false });

const submissionSchema = new mongoose.Schema({
  studentId:  { type: String, required: true, index: true },
  problemId:  { type: String, default: 'general' },
  code:       { type: String, required: true },
  language:   { type: String, required: true },
  timestamp:  { type: Date, default: Date.now, index: true },

  // Execution
  stdout:        { type: String, default: '' },
  stderr:        { type: String, default: '' },
  exitCode:      { type: Number, default: null },
  runtimeMs:     { type: Number, default: null },
  memoryUsedKb:  { type: Number, default: null },

  // Tests
  testResults: [testResultSchema],

  // Error analysis
  errorCategory: {
    type: String,
    enum: ['Runtime', 'Syntax', 'Logic', 'Timeout', 'Memory', null],
    default: null,
  },
  errorExplanation: {
    plain_explanation: { type: String, default: '' },
    concept_hint:      { type: String, default: '' },
  },

  // Complexity
  staticComplexity:    { type: String, default: null },
  empiricalComplexity: [empiricalPointSchema],
  complexityExplanation: {
    confirmed_complexity: { type: String },
    explanation:          { type: String },
    contributing_lines:   [Number],
    empirical_match:      { type: Boolean },
  },

  // Quality
  qualityFeedback: {
    positive_note: { type: String, default: '' },
    suggestions:   [suggestionSchema],
  },
});

module.exports = mongoose.model('Submission', submissionSchema);
