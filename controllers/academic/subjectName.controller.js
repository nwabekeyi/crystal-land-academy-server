const {
    createSubjectNameService,
    getAllSubjectNamesService,
    getSubjectNameService,
    updateSubjectNameService,
    deleteSubjectNameService,
  } = require("../../services/academic/subjectName.service");
  
  /**
   * Create SubjectName controller
   */
  exports.createSubjectNameController = async (req, res, next) => {
    try {
      const subjectName = await createSubjectNameService(req.body);
      res.status(201).json({
        status: "success",
        data: subjectName,
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        status: "error",
        message: error.message,
      });
    }
  };
  
  /**
   * Get all SubjectNames controller
   */
  exports.getAllSubjectNamesController = async (req, res, next) => {
    try {
      const subjectNames = await getAllSubjectNamesService();
      res.status(200).json({
        status: "success",
        data: subjectNames,
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        status: "error",
        message: error.message,
      });
    }
  };
  
  /**
   * Get a single SubjectName controller
   */
  exports.getSubjectNameController = async (req, res, next) => {
    try {
      const subjectName = await getSubjectNameService(req.params.id);
      res.status(200).json({
        status: "success",
        data: subjectName,
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        status: "error",
        message: error.message,
      });
    }
  };
  
  /**
   * Update SubjectName controller
   */
  exports.updateSubjectNameController = async (req, res, next) => {
    try {
      const subjectName = await updateSubjectNameService(req.body, req.params.id);
      res.status(200).json({
        status: "success",
        data: subjectName,
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        status: "error",
        message: error.message,
      });
    }
  };
  
  /**
   * Delete SubjectName controller
   */
  exports.deleteSubjectNameController = async (req, res, next) => {
    try {
      const message = await deleteSubjectNameService(req.params.id);
      res.status(200).json({
        status: "success",
        message,
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        status: "error",
        message: error.message,
      });
    }
  };