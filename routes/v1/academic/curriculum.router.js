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
  .get(isLoggedIn, getAllCurriculaController)
  .post(isLoggedIn, isAdmin, createCurriculumController);

curriculumRouter
  .route("/curriculum/:id")
  .get(isLoggedIn, getCurriculumByIdController)
  .patch(isLoggedIn, isAdmin, updateCurriculumController)
  .delete(isLoggedIn, isAdmin, deleteCurriculumController);

module.exports = curriculumRouter;