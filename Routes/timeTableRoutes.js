const express = require('express');
const router = express.Router();
const {
  getTimetable,
  addTimetableEntry,
  updateTimetableEntry,
  deleteTimetableEntry,
  markAttendance,
  markTimetableAsDone
} = require('../controller/timeTableController'); // Adjust the path to your actual controller

// Route to get all timetable entries for a specific cohort
router.get('/api/v1/timetable/:cohortName', getTimetable);

// Route to add a new timetable entry to a specific cohort
router.post('/api/v1/timetable/:cohortName', addTimetableEntry);

// Route to update an existing timetable entry by its ID
router.put('/api/v1/timetable/:cohortName/:entryId', updateTimetableEntry);

// Route to delete a timetable entry by its ID
router.delete('/api/v1/timetable/:cohortName/:entryId', deleteTimetableEntry);

router.patch('/api/v1/timetable/attendance', markAttendance);

router.patch('/api/v1/timetable/markTimetableAsDone', markTimetableAsDone);

module.exports = router;
