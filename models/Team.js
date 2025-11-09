const mongoose = require('mongoose');

const TeamMemberSchema = new mongoose.Schema(
  {
    section: { type: String, required: true },
    displayOrder: { type: Number }, // for ordering the section
    imageUrl: { type: String },
    fullName: { type: String },
    title: { type: String },
    languagesSpoken: { type: String },
    description: { type: String },
    displayMemberOrder: { type: Number }, // member-specific order
    draft: { type: Boolean, default: false },
    joiningDate: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Team', TeamMemberSchema);