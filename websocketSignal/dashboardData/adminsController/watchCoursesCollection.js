const Course = require('../../../models/schema/courseSchema'); // Import the courses model

// Function to fetch all courses
const fetchAllCourses = async () => {
  try {
    const courses = await Course.find();
    return courses.map(course => course.toObject());
  } catch (error) {
    console.error('Error fetching courses:', error);
    throw error;
  }
};

// Function to watch changes in the courses collection and send updates to WebSocket clients
const watchCourse = async (ws) => {

  // Step 2: Set up the change stream to monitor the courses collection
  const changeStream = Course.watch();
  
  // Listen for changes in the courses collection
  changeStream.on('change', async () => {
    try {
      const updatedCourses = await fetchAllCourses();

      // Send updated course data to the WebSocket client when a change occurs
      ws.send(JSON.stringify({
        action: 'updateCourses',
        data: updatedCourses,
      }));
    } catch (error) {
      console.error('Error fetching updated courses:', error);
      ws.send(JSON.stringify({ action: 'error', message: 'Failed to fetch updated course data' }));
    };
    console.log('watching courses...')
  });

  // Handle change stream errors
  changeStream.on('error', (error) => {
    console.error('Change stream error for courses:', error);
    ws.send(JSON.stringify({ action: 'error', message: 'Change stream error' }));
  });

};


  module.exports = { watchCourse };



