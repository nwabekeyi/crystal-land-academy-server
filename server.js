// Importing required modules
const express = require("express");
const morgan = require("morgan"); // For logging
const helmet = require("helmet"); // For setting HTTP headers for security
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const http = require("http"); // Import the HTTP server
const dbConnection = require("./models/dbconns");
const userRouter = require("./Routes/user");
const envConfig = require('./configs/dotenv')
const onlineUsers = require("./Routes/onlineUsers");
const auth = require('./Routes/auth');
const cookieParser = require('cookie-parser');
const {websocketSignal} = require("./websocketSignal");
const code = require("./Routes/codeRoutes");
const courseRouter = require("./Routes/courseRoutes");
const timeTableRouter = require("./Routes/timeTableRoutes");
const assignmentRouter = require("./Routes/assignmentRoutes");
const feedback = require("./Routes/feedbackRoute");
const contact = require("./Routes/contactRoute");
const instructorReviews = require("./Routes/insructorReviews");
const payment = require("./Routes/paymentRoute");
const enquiries = require("./Routes/enquiries");
const announcementRoutes = require('./Routes/announcement');
// Import rate limiting middleware
const rateLimit = require('express-rate-limit');


// Database connection
dbConnection();


// Initialize the Express app
const app = express();
const PORT = envConfig.PORT || 3000;
const logFile = fs.createWriteStream(path.join(__dirname, "logFile.log"), {
  flags: "a",
});


// Rate limiting setup (global for all routes)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});


// Middleware functions
/// List of allowed origins
const allowedOrigins = [
  "https://the-tech-archival-client-side.vercel.app",
  "https://thetecharchival-clientside.onrender.com",
  "http://localhost:5174",
  "https://the-tech-archival-client-side-5wvq.vercel.app",
  "https://babtech-e-learning.onrender.com"
];

// The rest of your middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true, // Allow credentials (cookies, headers)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'], // Allow the required methods
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'], // Allow specific headers
  preflightContinue: false,
  optionsSuccessStatus: 204 // For compatibility with older browsers
}));


// Middleware to handle OPTIONS preflight requests explicitly
app.options('*', (req, res) => {
  const origin = req.headers.origin;

  // Check if the request's origin is in the allowed origins list
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin); // Dynamically set the origin
  }

  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");
  res.header("Access-Control-Allow-Credentials", "true");
  res.sendStatus(204); // Use 204 No Content for preflight response
});


// Set up CSP using Helmet
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://*.googleapis.com"],
    connectSrc: ["'self'", "https://firestore.googleapis.com", "wss://babatech-e-learning.onrender.com", 'https://the-tech-archival-client-side-5wvq.vercel.app'], // Allow WSS connection
    imgSrc: ["'self'", "data:", "https://*"],
    mediaSrc: ["'self'", "https://*"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://*.googleapis.com"],
  },
}));


// Other middleware and routes follow
// Apply rate limiting middleware globally
app.use(limiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev", { stream: logFile }));


// Serve static files from the Vite `dist` folder
const distPath = path.join(__dirname, '../client_side','dist');
app.use(express.static(distPath));
app.use(express.static(path.join(__dirname, 'public')));


// Routes
app.use(announcementRoutes);
app.use(userRouter);
app.use(onlineUsers);
app.use(auth);
app.use(code);
app.use(courseRouter)
app.use(timeTableRouter)
app.use(assignmentRouter)
app.use(feedback)
app.use(contact)
app.use(instructorReviews)
app.use(payment)
app.use(enquiries)


// Wildcard route to serve the index.html file for all other routes
app.get('/', (req, res) => {
  res.send('welcome to The Archival');
});

// Create the HTTP server from the Express app
const server = http.createServer(app);

// Initialize WebSocket signaling logic
websocketSignal(server);


// Start the HTTP and WebSocket server
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
