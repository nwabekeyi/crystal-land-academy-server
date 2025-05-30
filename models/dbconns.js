const mongoose = require("mongoose");
const dotenv = require('../configs/dotenv');


const localUri = dotenv.MONGO_URI;
const dbConnection = async () => {
  try {
    await mongoose.connect(localUri, 
      {
        serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
        socketTimeoutMS: 30000, // Increase socket timeout as well
      }
    );
    console.log("db successfully connected");
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

module.exports =  dbConnection ;
