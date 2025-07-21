// routes/academic/curriculum.js
const express = require("express");
const curriculumRouter = express.Router();
const isLoggedIn = require("../../../middlewares/isLoggedIn");
const isAdmin = require("../../../middlewares/isAdmin");
const {
  createCurriculumController,
  getAllCurriculaController,
  getCurriculumByIdController,
  updateCurriculumController,
  deleteCurriculumController,
} = require("../../../controllers/academic/curriculum.controller");

curriculumRouter
  .route("/curriculum")
  .get(getAllCurriculaController)
  .post(createCurriculumController);

curriculumRouter
  .route("/curriculum/:id")
  .get(getCurriculumByIdController)
  .patch(isAdmin, updateCurriculumController)
  .delete(deleteCurriculumController);

module.exports = curriculumRouter;