// controllers/academic/timetable.controller.js
const {
  getTimetablesService,
  getStudentTimetableService,
  getTeacherTimetableService,
  createTimetableService,
  updateTimetableService,
  deleteTimetableService,
  markAttendanceService,
  getAttendanceService,
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
  await updateTimetableService(req.params.timetableId, req.body, res);
};

const deleteTimetableController = async (req, res) => {
  await deleteTimetableService(req.params.timetableId, res);
};

const markAttendanceController = async (req, res) => {
  const { timetableId } = req.params;
  const { periodIndex, attendanceData, date } = req.body;
  await markAttendanceService(timetableId, periodIndex, attendanceData, date, res);
};

const getAttendanceController = async (req, res) => {
  const { timetableId } = req.params;
  const { periodIndex, date } = req.query;
  await getAttendanceService(timetableId, periodIndex, date, res);
};

module.exports = {
  getTimetablesController,
  getStudentTimetableController,
  getTeacherTimetableController,
  createTimetableController,
  updateTimetableController,
  deleteTimetableController,
  markAttendanceController,
  getAttendanceController,
};