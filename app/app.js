const express = require("express");
const morgan = require("morgan");
const routeSync = require("../handlers/routeSync.handler");
const cors = require('cors');
const { verifyEnv } = require('../config/env.Config');

// Verify all env
verifyEnv();

// Initialize the Express application
const app = express();

// Middleware
app.use(express.json());
app.use(morgan("dev"));

// Initialize CORS with allowed origins
app.use(cors({
  origin: [
    "http://localhost:5174",
    "https://crystal-land-academy.vercel.app"
  ],
  credentials: true
}));

// Initialize staff route
routeSync(app, "staff");
// Initialize academic route
routeSync(app, "academic");
// Initialize student route
routeSync(app, "students");

// Define a default route
app.get("/", (req, res) => {
  res.send("Server is running!");
});

// Handle invalid routes
app.all("*", (req, res) => {
  res.send("Invalid Route");
});

module.exports = app;
