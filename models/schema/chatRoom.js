const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { ObjectId } = Schema.Types;

// Chatroom Schema
const chatroomSchema = new Schema({
  name: { type: String, required: true, unique: true }, // Chatroom name
  avatarUrl: { type: String, required: false },  // Added avatarUrl field
  
  // Modified participants to accept an object with user details
  participants: [{
    userId: { type: ObjectId, required: true, ref: "User" }, // User ID reference
    firstName: { type: String, required: true }, // User's first name
    lastName: { type: String, required: true },  // User's last name
    role: { type: String, required: true },
    profilePictureUrl: { type: String, required: true }, // User's profile picture URL
  }],
  // Set default value of participants to an empty array
  default: []
}, { timestamps: true });

const Chatroom = mongoose.model("Chatroom", chatroomSchema);
module.exports = Chatroom;
