const mongoose = require("mongoose");
const { Schema, model } = mongoose;
const { ObjectId } = Schema;

// Individual part payment (e.g., split fees)
const schoolFeesSchema= new Schema(
  {
    amountPaid: {
      type: Number,
      required: true,
      min: 0,
    },
    datePaid: {
      type: Date,
      default: Date.now,
    },
    method: {
      type: String,
      enum: ["Cash", "Transfer", "POS", "Card", "Other"],
      default: "Cash",
    },
    reference: {
      type: String,
      default: "",
    },
    status:{
      type: String,
      enum:["success","failed"],
      default: "success",
    }
  },
  { _id: false }
);

// Payment per term
const termPaymentSchema = new Schema(
  {
    termName: {
      type: String,
      enum: ["1st Term", "2nd Term", "3rd Term"],
      required: true,
    },
    subclassLetter: {
      type: String,
      required: true,
      match: /^[A-Z]$/, // matches subclass like 'A', 'B', etc.
    },
    payments: [schoolFeesSchema],
  },
  { _id: false, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Virtual: total paid in this term
termPaymentSchema.virtual("totalPaidInTerm").get(function () {
  return this.payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
});

// Student payment record for a specific class level and academic year
const studentPaymentSchema = new Schema(
  {
    studentId: {
      type: ObjectId,
      ref: "Student",
      required: true,
    },
    classLevelId: {
      type: ObjectId,
      ref: "ClassLevel",
      required: true,
    },
    academicYear: {
      type: ObjectId,
      ref: "AcademicYear",
      required: true,
    },
    section: {
      type: String,
      enum: ["Primary", "Secondary"],
      required: true,
    },
    termPayments: [termPaymentSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);


studentPaymentSchema.pre('validate', function (next) {
  console.log('Validating student payment:', this);
  next();
});
// Virtual: total paid across all terms
studentPaymentSchema.virtual("totalAmountPaid").get(function () {
  return this.termPayments.reduce(
    (total, term) =>
      total +
      term.payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0),
    0
  );
});

const StudentPayment = model("StudentPayment", studentPaymentSchema);
module.exports = StudentPayment;
