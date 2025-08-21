const express = require("express");
const morgan = require("morgan");
const path = require("path");
const cors = require("cors");
const routeSync = require("../handlers/routeSync.handler");
const { verifyEnv } = require("../config/env.Config");
require("../config/dbConnect");

// Import the cron job
const deleteOldCloudinaryFiles = require("../utils/deleteOldCloudinaruFiles");

// Verify all environment variables
verifyEnv();

// Initialize the Express application
const app = express();

// Middleware
app.use(express.json());
app.use(morgan("dev"));

// CORS configuration
app.use(
  cors({
    origin: ["http://localhost:5174", "https://crystal-land-academy.vercel.app"],
    credentials: true,
  })
);

// Register backend routes
routeSync(app, "staff");
routeSync(app, "academic");
routeSync(app, "students");
routeSync(app, "enquiry");
routeSync(app, "feedback");
routeSync(app, "password");
routeSync(app, "registrationCode");
routeSync(app, "announcement");
routeSync(app, "Event");
routeSync(app, "Review");
routeSync(app, "financials");


// Optional catch-all for truly invalid requests (if needed after above)
app.all("*", (req, res) => {
  res.status(404).send("Invalid Route");
});

// Start the cron job
deleteOldCloudinaryFiles();

module.exports = app;