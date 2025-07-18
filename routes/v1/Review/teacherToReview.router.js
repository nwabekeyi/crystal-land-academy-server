const express = require('express');
const reviewRouter = express.Router();
const { getTeachersByClassLevelIdController } = require('../../../controllers/Review/teacherToReview.controller');

reviewRouter.get('/teachers/class/:classLevelId', getTeachersByClassLevelIdController);

module.exports = reviewRouter;