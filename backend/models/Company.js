const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  clerkId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  companyName: { type: String, required: true },
  industry: String,
  size: String,
  website: String,
  description: String,
  location: String,
  logo: String,
  contactPerson: {
    name: String,
    designation: String,
    phone: String
  },
  document: {
    type: {
      type: String,
      enum: ['gst', 'pan']
    },
    number: String,
    url: String
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended'],
    default: 'pending'
  },
  profileComplete: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'companies' }); // Explicitly match the collection name

module.exports = mongoose.model('Company', companySchema);
