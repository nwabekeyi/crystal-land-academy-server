const responseStatus = require("../handlers/responseStatus.handler");
const Teacher = require("../models/Staff/teachers.model");

const isTeacher = async (req, res, next) => {
  console.log(req.userAuth)
  const userId = req.userAuth.id;
  const teacher = await Teacher.findById(userId);
  if (teacher?.role === "teacher") {
    next();
  } else {
    responseStatus(res, 403, "failed", "Access Denied.teachers only route!");
  }
};
module.exports = isTeacher;
