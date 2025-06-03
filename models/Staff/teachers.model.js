const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const teacherSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    middleName: {
      type: String,
      required: false,
    },
    email: {
      type: String,
      required: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
    },
    profilePictureUrl: {
      type: String,
      required: false,
    },
    dateEmployed: {
      type: Date,
      default: Date.now,
    },
    teacherId: {
      type: String,
      required: true,
      default: function () {
        const initials =
          (this.firstName?.[0] || "") +
          (this.middleName?.[0] || "") +
          (this.lastName?.[0] || "");
        return (
          "TEA" +
          Math.floor(100 + Math.random() * 900) +
          Date.now().toString().slice(2, 4) +
          initials.toUpperCase()
        );
      },
    },
    isWithdrawn: {
      type: Boolean,
      default: false,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      default: "teacher",
    },
    subject: {
      type: ObjectId,
      ref: "Subject",
    },
    applicationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    program: {
      type: String,
    },
    classLevel: {
      type: String,
    },
    academicYear: {
      type: String,
    },
    academicTerm: {
      type: String,
    },
    createdBy: {
      type: ObjectId,
      ref: "Admin",
      required: true,
    },
    examsCreated: [
      {
        type: ObjectId,
        ref: "Exam",
      },
    ],
    section: {
      type: String,
      enum: ["primary", "secondary"],
      required: true,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true,
    },
    NIN: {
      type: String,
      validate: {
        validator: function (v) {
          return /^\d{11}$/.test(v);
        },
        message: (props) => `${props.value} is not a valid 11-digit NIN.`,
      },
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    qualification: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return /^(ssce|ond|hnd|bsc|mba|btech|msc|phd|other)$/i.test(v);
        },
        message: (props) =>
          `${props.value} is not a valid qualification. Must be one of SSCE, OND, HND, Bsc, MBA, Btech, Msc, PhD, or Other.`,
      },
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    linkedInProfile: {
      type: String,
      required: false,
    },
    tribe: {
      type: String,
      required: true,
    },
    religion: {
      type: String,
      enum: ["christianity", "islam", "hinduism", "buddhism", "atheism", "other"],
      required: true,
    },
    bankAccountDetails: {
      accountName: { type: String, required: true },
      accountNumber: {
        type: String,
        required: true,
        validate: {
          validator: function (v) {
            return /^\d{10}$/.test(v);
          },
          message: (props) => `${props.value} is not a valid 10-digit account number.`,
        },
      },
      bank: { type: String, required: true },
    },
  },
  {
    timestamps: true,
  }
);

const Teacher = mongoose.model("Teacher", teacherSchema);

module.exports = Teacher;
