const express = require("express");
const morgan = require("morgan");
const path = require("path");
const cors = require("cors");
const routeSync = require("../handlers/routeSync.handler");
const { verifyEnv } = require("../config/env.Config");
require("../config/dbConnect");

// Import the cron job
const cronJobs = require("../cronJobs");

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
routeSync(app, "password");
routeSync(app, "registrationCode");
routeSync(app, "announcement");


// Serve static files from the frontend build
app.use(express.static(path.join(__dirname, "../public/dist")));

// Serve the index.html file on root or any unmatched route (for SPA support)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/dist/index.html"));
});

// Optional catch-all for truly invalid requests (if needed after above)
app.all("*", (req, res) => {
  res.status(404).send("Invalid Route");
});

// Start the cron job
cronJobs();

module.exports = app;