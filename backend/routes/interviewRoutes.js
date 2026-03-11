const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  listInterviews,
  createInterview,
  getInterview,
  updateInterview,
  deleteInterview,
  submitFeedback,
  generateFeedback,
} = require("../controllers/interviewController");

// Vapi webhook — NO auth (called by Vapi servers)
// Must be BEFORE the /:id routes to avoid "feedback" being treated as an :id
router.post("/feedback", submitFeedback);

// Protected routes
router.get("/", protect, listInterviews);
router.post("/", protect, createInterview);
router.post("/:id/generate-feedback", protect, generateFeedback);
router.get("/:id", protect, getInterview);
router.patch("/:id", protect, updateInterview);
router.delete("/:id", protect, deleteInterview);

module.exports = router;
