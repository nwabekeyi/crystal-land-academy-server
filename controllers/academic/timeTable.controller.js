const {
  getTimetablesService,
  getStudentTimetableService,
  getTeacherTimetableService,
  createTimetableService,
  updateTimetableService,
  deleteTimetableService,
  markAttendanceService,
} = require('../../services/academic/timeTable.service');

const getTimetablesController = async (req, res) => {
  const { classLevel, subclassLetter, subject } = req.query;
  await getTimetablesService(classLevel, subclassLetter, subject, res);
};

const getStudentTimetableController = async (req, res) => {
  const { studentId } = req.params;
  await getStudentTimetableService(studentId, res);
};

const getTeacherTimetableController = async (req, res) => {
  const { teacherId } = req.params;
  await getTeacherTimetableService(teacherId, res);
};

const createTimetableController = async (req, res) => {
  await createTimetableService(req.body, res);
};

const updateTimetableController = async (req, res) => {
  await updateTimetableService(req.params.id, req.body, res);
};

const deleteTimetableController = async (req, res) => {
  await deleteTimetableService(req.params.id, res);
};

const markAttendanceController = async (req, res) => {
  const { timetableId, periodIndex, attendanceData } = req.body;
  await markAttendanceService(timetableId, periodIndex, attendanceData, res);
};

module.exports = {
  getTimetablesController,
  getStudentTimetableController,
  getTeacherTimetableController,
  createTimetableController,
  updateTimetableController,
  deleteTimetableController,
  markAttendanceController,
};