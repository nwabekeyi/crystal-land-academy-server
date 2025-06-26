const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const teachingAssignmentSchema = new mongoose.Schema(
  {
    section: {
      type: String,
      enum: ["Primary", "Secondary"],
      required: true,
    },
    className: {
      type: String,
      required: true,
      enum: [
        "Kindergarten",
        "Reception",
        "Nursery 1",
        "Nursery 2",
        "Primary 1",
        "Primary 2",
        "Primary 3",
        "Primary 4",
        "Primary 5",
        "Primary 6",
        "JSS 1",
        "JSS 2",
        "JSS 3",
        "SS 1",
        "SS 2",
        "SS 3",
      ],
    },
    subclasses: [
      {
        type: String,
        required: true,
        match: [/^[A-Z]$/, "Subclass must be a single uppercase letter"],
      },
    ],
  },
  { _id: false }
);

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
    middleName: String,
    email: {
      type: String,
      required: true,
      index: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    profilePictureUrl: String,
    dateEmployed: {
      type: Date,
      default: Date.now,
    },
    teacherId: {
      type: String,
      required: true,
      unique: true,
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
    subject: [
      {
        type: ObjectId,
        ref: "Subject",
        required: false, // Subjects are optional and allowed for all classes
      },
    ],
    applicationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    teachingAssignments: [teachingAssignmentSchema],
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: true,
    },
    NIN: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return /^\d{11}$/.test(v);
        },
        message: (props) => `${props.value} is not a valid 11-digit NIN.`,
      },
    },
    address: {
      type: String,
      required: true,
    },
    qualification: {
      type: String,
      required: true,
      enum: ["SSCE", "OND", "HND", "BSc", "MBA", "BTech", "MSc", "PhD", "Other"],
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    linkedInProfile: String,
    tribe: {
      type: String,
      required: true,
    },
    religion: {
      type: String,
      enum: ["Christianity", "Islam", "Hinduism", "Buddhism", "Atheism", "Other"],
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

// Validate className based on section
teachingAssignmentSchema.pre("validate", function (next) {
  const primaryClasses = [
    "Kindergarten",
    "Reception",
    "Nursery 1",
    "Nursery 2",
    "Primary 1",
    "Primary 2",
    "Primary 3",
    "Primary 4",
    "Primary 5",
    "Primary 6",
  ];
  const secondaryClasses = ["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"];

  if (this.section === "Primary" && !primaryClasses.includes(this.className)) {
    next(new Error(`Invalid class name for Primary section: ${this.className}`));
  } else if (this.section === "Secondary" && !secondaryClasses.includes(this.className)) {
    next(new Error(`Invalid class name for Secondary section: ${this.className}`));
  }
  next();
});

// Ensure subjects are allowed for all classes and subclasses
teacherSchema.pre("validate", function (next) {
  // No restriction on subjects for non-SS classes
  if (this.teachingAssignments.length > 0 && this.subject.length > 0) {
    const assignment = this.teachingAssignments[0];
    // Only validate that subjects exist (handled in service)
    // No check for SS-only or subclass A restrictions
  }
  next();
});

teacherSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

teacherSchema.pre("findOneAndUpdate", function (next) {
  this.set({ updatedAt: Date.now() });
  next();
});

teacherSchema.index({ teacherId: 1 });
teacherSchema.index({ "teachingAssignments.section": 1, "teachingAssignments.className": 1 });

const Teacher = mongoose.model("Teacher", teacherSchema);

module.exports = Teacher;