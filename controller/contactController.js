const Contact = require("../models/schema/contactSchema");


// Get contacts with pagination
const getContacts = async (req, res) => {
  try {
    const { page = 0, rowsPerPage = 10, sortBy = "id", sortDirection = "asc" } = req.query;

    // Convert page and rowsPerPage to integers
    const pageNumber = parseInt(page, 10);
    const rowsPerPageNumber = parseInt(rowsPerPage, 10);

    // Sorting logic
    const sort = { [sortBy]: sortDirection === "asc" ? 1 : -1 };

    // Total count of documents
    const totalRows = await Contact.countDocuments();

    // Fetch paginated and sorted data
    const contacts = await Contact.find()
      .sort(sort)
      .skip(pageNumber * rowsPerPageNumber) // Skip the rows for previous pages
      .limit(rowsPerPageNumber); // Limit the results to the requested rows per page

    res.status(200).json({
      data: contacts,
      totalRows, // Include total number of documents for the frontend
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
};




// Create a new contact
const createContact = async (req, res) => {
  try {
    const contact = new Contact(req.body);
    const savedContact = await contact.save();
    res.status(201).json(savedContact);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: "Failed to create contact" });
  }
};

// Update a contact by ID
const updateContact = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedContact = await Contact.findOneAndUpdate({ id }, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedContact) {
      return res.status(404).json({ error: "Contact not found" });
    }
    res.status(200).json(updatedContact);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: "Failed to update contact" });
  }
};

// Delete a contact by ID
const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedContact = await Contact.findOneAndDelete({ id });
    if (!deletedContact) {
      return res.status(404).json({ error: "Contact not found" });
    }
    res.status(200).json({ message: "Contact deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: "Failed to delete contact" });
  }
};







module.exports = {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
};


