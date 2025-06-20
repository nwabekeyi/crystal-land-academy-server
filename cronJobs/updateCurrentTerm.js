const cron = require("node-cron");
const AcademicYear = require("../models/Academic/academicYear.model");
const AcademicTerm = require("../models/Academic/academicTerm.model");

// Define the cron job
const updateCurrentTerm = () => {
  // Schedule cron job to run daily at midnight
  cron.schedule("0 0 * * *", async () => {
    console.log("Running cron job to update current academic term at", new Date().toISOString());

    try {
      // Step 1: Find the current AcademicYear
      const currentAcademicYear = await AcademicYear.findOne({ isCurrent: true });

      if (!currentAcademicYear) {
        console.log("No current AcademicYear found.");
        return;
      }

      // Step 2: Find all AcademicTerms for the current AcademicYear
      const academicTerms = await AcademicTerm.find({
        academicYear: currentAcademicYear._id,
      });

      if (!academicTerms || academicTerms.length === 0) {
        console.log("No AcademicTerms found for the current AcademicYear:", currentAcademicYear.name);
        return;
      }

      // Step 3: Get the current date (normalized to midnight for comparison)
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);

      // Step 4: Iterate through each AcademicTerm
      for (const academicTerm of academicTerms) {
        let hasChanges = false;

        // Step 5: Check each term in the AcademicTerm's terms array
        for (let i = 0; i < academicTerm.terms.length; i++) {
          const term = academicTerm.terms[i];
          const startDate = new Date(term.startDate);
          const endDate = new Date(term.endDate);

          // Normalize dates for consistent comparison
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);

          // Check if the current date is within the term's date range
          const isWithinRange = currentDate >= startDate && currentDate <= endDate;

          // Update isCurrent if it doesn't match the date range condition
          if (term.isCurrent !== isWithinRange) {
            academicTerm.terms[i].isCurrent = isWithinRange;
            hasChanges = true;
            console.log(
              `${isWithinRange ? "Set" : "Unset"} ${term.name} as current term for AcademicTerm ID: ${
                academicTerm._id
              }`
            );
          }
        }

        // Step 6: Save the AcademicTerm if changes were made
        if (hasChanges) {
          await academicTerm.save();
          console.log(`Updated isCurrent for terms in AcademicTerm ID: ${academicTerm._id}`);
        } else {
          console.log(`No updates needed for AcademicTerm ID: ${academicTerm._id}`);
        }
      }

      console.log("Cron job completed successfully.");
    } catch (error) {
      console.error("Error in cron job:", error.message);
    }
  });
};

module.exports = updateCurrentTerm;