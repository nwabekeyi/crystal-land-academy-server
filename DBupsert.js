const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const Admin = require("./models/Staff/admin.model"); // Adjust the path to your Admin model

dotenv.config();

const MONGO_URI = process.env.DB;

const seedAdmin = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const existingAdmin = await Admin.findOne({ email: "admin@crystallandacademy.com" });

    if (existingAdmin) {
      console.log("Admin already exists.");
    } else {
      const hashedPassword = await bcrypt.hash("admin123", 12);

      const newAdmin = new Admin({
        name: "Super Admin",
        email: "admin@crystallandacademy.com",
        password: hashedPassword,
      });

      await newAdmin.save();
      console.log("Admin created successfully.");
    }

    mongoose.connection.close();
  } catch (error) {
    console.error("Migration failed:", error);
    mongoose.connection.close();
  }
};

seedAdmin();
