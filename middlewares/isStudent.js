const responseStatus = require("../handlers/responseStatus.handler");
const Student = require("../models/Students/students.model");

const isStudent = async (req, res, next) => {
  const userId = req.userAuth.id;
  const student = await Student.findById(userId);
  if (student?.role === "student") {
    next();
  } else {
    responseStatus(res, 403, "failed", "Access Denied.students only route!");
  }
};
module.exports = isStudent;