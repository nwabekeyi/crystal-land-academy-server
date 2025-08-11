const mongoose = require("mongoose");

const { ObjectId } = mongoose;

// questionSchema
const questionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      index: true,
      text: true,
    },
    optionA: {
      type: String,
      required: true,
    },
    optionB: {
      type: String,
      required: true,
    },
    optionC: {
      type: String,
      required: true,
    },
    optionD: {
      type: String,
      required: true,
    },
    correctAnswer: {
      type: String,
      required: true,
    },
    score: {
      type: Number,
      required: true,
      min: [0, "Score must be greater than or equal to zero"],
    },
    isCorrect: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: ObjectId,
      ref: "Teacher",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Question = mongoose.model("Question", questionSchema);

module.exports = Question;