// controllers/timetable.controller.js
const {
    createTimetableService,
    updateTimetableService,
    getTeacherTimetablesService,
    getStudentTimetablesService,
    markAttendanceService,
  } = require('../../services/academic/timeTable.service');
  
/**
 * Create a timetable (admin only)
 */
exports.createTimetable = async (req, res) => {
    await createTimetableService(req.body, res);
  };
  
  /**
   * Update a timetable (admin only)
   */
  exports.updateTimetable = async (req, res) => {
    const { timetableId } = req.params;
    await updateTimetableService(timetableId, req.body, res);
  };
  
  /**
   * Get timetables for a teacher
   */
  exports.getTeacherTimetables = async (req, res) => {
    const teacherId = req.userAuth.id;
    await getTeacherTimetablesService(teacherId, res);
  };
  
  /**
   * Get timetables for a student
   */
  exports.getStudentTimetables = async (req, res) => {
    const studentId = req.userAuth.id;
    await getStudentTimetablesService(studentId, res);
  };
  
  /**
   * Mark attendance for a timetable period
   */
  exports.markAttendance = async (req, res) => {
    const { timetableId } = req.params;
    const { periodIndex, attendanceData } = req.body;
    const teacherId = req.userAuth.id;
    await markAttendanceService(timetableId, periodIndex, attendanceData, teacherId, res);
  };