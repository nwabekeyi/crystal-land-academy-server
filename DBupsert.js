// const mongoose = require("mongoose");
// const dotenv = require("dotenv");
// const Teacher = require("./models/Staff/teachers.model"); // Adjust the path as needed
// const Review = require("./models/review/index"); // Adjust path as needed

// dotenv.config();

// const MONGO_URI = process.env.DB || 'mongodb://localhost:27017/your_database_name';

// async function updateTeachersWithRatingAndReviews() {
//   try {
//     // Connect to MongoDB
//     await mongoose.connect(MONGO_URI, {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//     });
//     console.log('✅ Connected to MongoDB');

//     const teachers = await Teacher.find();

//     for (const teacher of teachers) {
//       const reviews = await Review.find({ teacherId: teacher._id }, "_id rating");

//       // Update the reviews field
//       const reviewRefs = reviews.map((r) => ({ id: r._id }));

//       // Calculate the average rating
//       const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
//       const averageRating = reviews.length ? totalRating / reviews.length : 0;

//       teacher.reviews = reviewRefs;
//       teacher.rating = parseFloat(averageRating.toFixed(2));

//       await teacher.save();

//       console.log(`✅ Updated ${teacher.firstName} ${teacher.lastName} (${reviews.length} reviews)`);
//     }

//     console.log("🎉 All teachers updated with rating and reviews.");
//     await mongoose.disconnect();
//     console.log('🔌 Disconnected from MongoDB');
//     process.exit(0);
//   }
// }

// updateTeachersWithRatingAndReviews();
