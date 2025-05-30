const express = require("express");
const {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
} = require("../controller/contactController");

const router = express.Router();

router.get("/api/v1/contacts", getContacts);
router.post("/api/v1/contacts", createContact);
router.put("/api/v1/contacts/:id", updateContact);
router.delete("/api/v1/contacts/:id", deleteContact);

module.exports = router;
