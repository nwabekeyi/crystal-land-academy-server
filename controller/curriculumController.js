const { Course } = require("../models/schema/courseSchema"); // Import Course model

// Add a new curriculum to a course
const addCurriculum = async (req, res) => {
    try {
      const { courseId, topic, description, duration, resources } = req.body;
  
      // Find the course by courseId
      const course = await Course.findOne({ courseId: courseId});
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
  
      // Create a new curriculum object
      const newCurriculum = {
        topic,
        description,
        duration,
        resources,
      };
  
      // Push the new curriculum to the curriculum array
      course.curriculum.push(newCurriculum);
  
      // Save the course with the new curriculum
      await course.save();
      res.status(201).json({ message: "Curriculum added successfully", course });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  };
  
  // Update an existing curriculum in a course by curriculumId
  const updateCurriculum = async (req, res) => {
    try {
      const { courseId, curriculumId, topic, description, duration, resources } = req.body;
  
      // Find the course by courseId
      const course = await Course.findOne({ courseId: courseId});
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
  
      // Find the specific curriculum entry by its _id
      const curriculumIndex = course.curriculum.findIndex((item) => item._id.toString() === curriculumId);
      if (curriculumIndex === -1) {
        return res.status(404).json({ message: "Curriculum not found" });
      }
  
      // Update the curriculum fields
      course.curriculum[curriculumIndex].topic = topic || course.curriculum[curriculumIndex].topic;
      course.curriculum[curriculumIndex].description = description || course.curriculum[curriculumIndex].description;
      course.curriculum[curriculumIndex].duration = duration || course.curriculum[curriculumIndex].duration;
      course.curriculum[curriculumIndex].resources = resources || course.curriculum[curriculumIndex].resources;
  
      // Save the updated course
      await course.save();
      res.status(200).json({ message: "Curriculum updated successfully", course });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  };
  
  // Get all curriculums for a specific course
  const getAllCurriculums = async (req, res) => {
    try {
      const { courseId } = req.params;

      // Find the course by courseId
      const course = await Course.findOne({ courseId: courseId});
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      // Return the curriculum array directly from the course
      res.status(200).json({ curriculum: course.curriculum });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  };

  // Delete a curriculum from a course by curriculumId
  const deleteCurriculum = async (req, res) => {
    try {
      const { courseId, curriculumId } = req.body;

      // Find the course by courseId
      const course = await Course.findOne({ courseId });
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      // Find the curriculum entry by its _id
      const curriculumIndex = course.curriculum.findIndex((item) => item._id.toString() === curriculumId);
      if (curriculumIndex === -1) {
        return res.status(404).json({ message: "Curriculum not found" });
      }
  
      // Remove the curriculum from the array
      course.curriculum.splice(curriculumIndex, 1);
  
      // Save the updated course
      await course.save();
      res.status(200).json({ message: "Curriculum deleted successfully", course });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  };


  const getAllResources = async (req, res) => {
    try {
      const { courseId } = req.params;
  
      // Find the course by courseId
      const course = await Course.findOne({ courseId: courseId });
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
  
      // Combine all resources from the curriculums into one array
      const allResources = course.curriculum.reduce((resources, curriculum) => {
        return resources.concat(curriculum.resources);
      }, []);
  
      // Return the array of resources
      res.status(200).json({ resources: allResources });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  };
  
  
  module.exports = {
    addCurriculum,
    updateCurriculum,
    getAllCurriculums,
    deleteCurriculum,
    getAllResources
  };