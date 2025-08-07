// models/Comment.js
const mongoose = require("mongoose");
const { Schema, Types } = mongoose;
const ObjectId = Types.ObjectId;

const commentSchema = new Schema(
  {
    studentId: {
      type: ObjectId,
      ref: "Student",
      required: true,
    },
    teacherId: {
      type: ObjectId,
      ref: "Teacher",
      required: true,
    },
    classLevelId: {
      type: ObjectId,
      ref: "ClassLevel",
      required: true,
    },
    academicTermId: {
      type: ObjectId,
      ref: "AcademicTerm",
      required: true,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

commentSchema.index({ studentId: 1, teacherId: 1, classLevelId: 1, academicTermId: 1 });

module.exports = mongoose.model("Comment", commentSchema);