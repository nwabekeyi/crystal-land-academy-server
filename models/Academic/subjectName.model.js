const mongoose = require("mongoose");

const subjectNameSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const SubjectName = mongoose.model("SubjectName", subjectNameSchema);

module.exports = SubjectName;