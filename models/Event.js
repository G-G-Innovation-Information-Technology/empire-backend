const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    whatsappNumber: {
      type: String,
      trim: true,
    },
    selectedDates: [
      {
        type: String,
        // required: [true, 'At least one date must be selected']
      },
    ],
    selectedTimes: [
      {
        type: String,
        // required: [true, 'At least one date must be selected']
      },
    ],
    consentCheckbox: {
      type: Boolean,
      default: false
    },
    eventType: {
      type: String,
      trim: true,
    },
    numberOfAttendees: {
      type: Number,
      min: 1,
    },
    specialRequirements: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'],
      default: 'PENDING',
    },
    notes: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Index for faster queries
eventSchema.index({ email: 1, createdAt: -1 });
eventSchema.index({ status: 1 });
eventSchema.index({ selectedDates: 1 });
eventSchema.index({ name: 1 });
eventSchema.index({ slug: 1 });
eventSchema.index({ title: 1 });

module.exports = mongoose.model('Event', eventSchema);
