const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Admin = require("./models/Staff/admin.model"); // Adjust the path if needed
const { hashPassword } = require("./handlers/passHash.handler"); // Adjust path if needed

dotenv.config();

const MONGO_URI = process.env.DB;

const runMigration = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // 1. Add `profilePictureUrl` field to admins who don't have it
    const profileUpdateResult = await Admin.updateMany(
      { profilePictureUrl: { $exists: false } },
      { $set: { profilePictureUrl: null } }
    );
    console.log(`Updated ${profileUpdateResult.modifiedCount} admin documents with profilePictureUrl.`);

    // 2. Add default admin if not exists
    const existingAdmin = await Admin.findOne({ email: "admin@crystallandacademy.com" });

    if (!existingAdmin) {
      const hashedPassword = await hashPassword("admin123");

      const newAdmin = await Admin.create({
        firstName: "Super",
        lastName: "Admin",
        middleName: "Crystal",
        email: "admin@crystallandacademy.com",
        password: hashedPassword,
        role: "admin",
        profilePictureUrl: null,
      });

      console.log("Default admin created:", newAdmin.email);
    } else {
      console.log("Default admin already exists.");
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error("Migration failed:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

runMigration();
