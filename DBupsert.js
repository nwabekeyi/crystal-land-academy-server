const mongoose = require("mongoose");
const dotenv = require("dotenv");
const ClassLevel = require("./models/Academic/class.model"); // Adjust path as needed
const Subject = require("./models/Academic/subject.model"); // Adjust path as needed
const { createSubjectService } = require("./services/academic/subject.service"); // Adjust path as needed

dotenv.config();

const MONGO_URI = process.env.DB || "mongodb://localhost:27017/your_database_name";

async function assignEnglishLanguage() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");

    // Assign English Language to All ClassLevels
    const classLevels = await ClassLevel.find();
    if (classLevels.length === 0) {
      console.log("⚠️ No ClassLevels found in the database");
    } else {
      console.log(`📚 Found ${classLevels.length} ClassLevels`);

      // Check if English Language Subject exists
      let englishSubject = await Subject.findOne({ name: "English Language" });
      if (!englishSubject) {
        // Create English Language Subject
        const subjectData = {
          name: "English Language",
          description: "Mandatory subject: English Language",
          classLevelSubclasses: [],
        };
        englishSubject = await createSubjectService(subjectData);
        console.log(`✅ Created English Language Subject`);
      } else {
        console.log(`ℹ️ English Language Subject already exists`);
      }

      // Assign English Language to all ClassLevels
      for (const classLevel of classLevels) {
        const classLevelSubclasses = [];

        if (["SS 1", "SS 2", "SS 3"].includes(classLevel.name)) {
          // For SS classes, assign English Language to each subclass
          for (const subclass of classLevel.subclasses) {
            if (!subclass.subjects.some((s) => s.subject.toString() === englishSubject._id.toString())) {
              classLevelSubclasses.push({
                classLevel: classLevel._id,
                subclassLetter: subclass.letter,
                teachers: [], // No teachers assigned
              });
            }
          }
        } else {
          // For Primary/JSS, assign English Language to the class level
          if (!classLevel.subjects.some((s) => s.toString() === englishSubject._id.toString())) {
            classLevelSubclasses.push({
              classLevel: classLevel._id,
              subclassLetter: null,
              teachers: [],
            });
          }
        }

        if (classLevelSubclasses.length > 0) {
          // Update the English Language Subject with new classLevelSubclasses
          await Subject.findByIdAndUpdate(
            englishSubject._id,
            {
              $addToSet: {
                classLevelSubclasses: { $each: classLevelSubclasses },
              },
            },
            { new: true }
          );

          // Update the ClassLevel document
          if (["SS 1", "SS 2", "SS 3"].includes(classLevel.name)) {
            for (const cls of classLevelSubclasses) {
              await ClassLevel.updateOne(
                {
                  _id: cls.classLevel,
                  "subclasses.letter": cls.subclassLetter,
                },
                {
                  $addToSet: {
                    "subclasses.$[sub].subjects": {
                      subject: englishSubject._id,
                      teachers: cls.teachers,
                    },
                  },
                },
                {
                  arrayFilters: [{ "sub.letter": cls.subclassLetter }],
                }
              );
            }
          } else {
            await ClassLevel.updateOne(
              { _id: classLevel._id },
              {
                $addToSet: {
                  subjects: englishSubject._id,
                  "subclasses.$[].subjects": {
                    subject: englishSubject._id,
                    teachers: [],
                  },
                },
              }
            );
          }

          console.log(
            `✅ Assigned English Language to ${classLevel.name}${
              ["SS 1", "SS 2", "SS 3"].includes(classLevel.name)
                ? ` (subclasses: ${classLevelSubclasses.map((cls) => cls.subclassLetter).join(", ")})`
                : ""
            }`
          );
        } else {
          console.log(`ℹ️ English Language already assigned to ${classLevel.name}`);
        }
      }
    }

    console.log("🎉 English Language assigned to all ClassLevels.");
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
    process.exit(1);
  }
}

assignEnglishLanguage();