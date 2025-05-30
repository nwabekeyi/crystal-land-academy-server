const mongoose = require('mongoose');
const Counter = require('./counterSchema');  // Import the Counter schema

const contactSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  registrarId: { type: String },
  name: { type: String },
  age: { type: Number },
  phone: { type: String },
  email: { type: String },
  address: { type: String },
  city: { type: String },
  zipCode: { type: String },
});

// Pre-save hook to increment the id value before saving a contact
contactSchema.pre('save', async function (next) {
  if (this.isNew) { // Only generate a new id for new documents
    try {
      const counter = await Counter.findByIdAndUpdate(
        { _id: 'contactId' }, // Use a specific counter identifier
        { $inc: { sequence_value: 1 } }, // Increment the sequence_value
        { new: true, upsert: true } // Return the new counter, and create if doesn't exist
      );

      this.id = counter.sequence_value; // Set the incremented id to the contact
      next(); // Proceed to save the contact document
    } catch (err) {
      next(err); // Pass error if something goes wrong
    }
  } else {
    next(); // If the document isn't new, just proceed
  }
});

// Create the Contact model
const Contact = mongoose.model('Contact', contactSchema);

module.exports = Contact;
