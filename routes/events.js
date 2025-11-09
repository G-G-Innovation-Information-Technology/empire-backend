const express = require('express');
const Event = require('../models/Event');
const { isValidObjectId } = require('mongoose');
const router = express.Router();
const { verifyToken, adminRole } = require('../middleware/auth');

// Get all events (with pagination, sorting, and filtering)
router.get('/', async (req, res) => {
  try {
    let { 
      page = 1, 
      limit = 10, 
      sortBy = 'createdAt', 
      order = 'desc', 
      status,
      email,
      name,
      title,
      phoneNumber,
      whatsappNumber,
      eventType
    } = req.query;
    
    const sortOrder = order === 'asc' ? 1 : -1;
    let filter = { isActive: true };

    // Apply filters
    if (status) filter.status = status;
    if (email) filter.email = { $regex: email, $options: 'i' };
    if (name) filter.name = { $regex: name, $options: 'i' };
    if (title) filter.title = { $regex: title, $options: 'i' };
    if (eventType) filter.eventType = { $regex: eventType, $options: 'i' };
    if (phoneNumber) filter.phoneNumber = { $regex: phoneNumber, $options: 'i' };
    if (whatsappNumber) filter.whatsappNumber = { $regex: whatsappNumber, $options: 'i' };

    // Handle limit = all
    let limitValue;
    if (limit === 'all') {
      limitValue = 0; // mongoose: 0 means "no limit"
      page = 1; // reset pagination
    } else {
      limitValue = parseInt(limit);
    }

    const totalEvents = await Event.countDocuments(filter);

    const events = await Event.find(filter)
      .sort({ [sortBy]: sortOrder })
      .limit(limitValue)
      .skip(limitValue > 0 ? (page - 1) * limitValue : 0)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    res.json({
      totalEvents,
      currentPage: page,
      totalPages: limit === 'all' ? 1 : Math.ceil(totalEvents / limitValue),
      events,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a single event by ID or slug
router.get('/:idOrSlug', async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    let event;

    // Try to find by ID first if it's a valid ObjectId
    if (isValidObjectId(idOrSlug)) {
      event = await Event.findById(idOrSlug)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email');
    }

    // If not found by ID or if not a valid ObjectId, try slug
    if (!event) {
      event = await Event.findOne({ slug: idOrSlug })
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email');
    }

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.status(200).json({ event });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching event', error: err.message });
  }
});

// Create a new event (public endpoint - no auth required)
router.post('/', async (req, res) => {
  const {
    title,
    slug,
    name,
    email,
    phoneNumber,
    whatsappNumber,
    selectedDates,
    selectedTimes,
    consentCheckbox,
    eventType,
    numberOfAttendees,
    specialRequirements,
  } = req.body;

  try {
    // // Validate required fields
    // if (!title || !name || !email || !phoneNumber || !whatsappNumber || !selectedDates || !consentCheckbox) {
    //   return res.status(400).json({ 
    //     message: 'All required fields must be provided',
    //     required: ['title', 'name', 'email', 'phoneNumber', 'whatsappNumber', 'selectedDates', 'consentCheckbox']
    //   });
    // }

    // Validate selectedDates is an array
    if (!Array.isArray(selectedDates) || selectedDates.length === 0) {
      return res.status(400).json({ 
        message: 'selectedDates must be a non-empty array of dates'
      });
    }

    if (!Array.isArray(selectedTimes) || selectedTimes.length === 0) {
      return res.status(400).json({ 
        message: 'selectedTimes must be a non-empty array of dates'
      });
    }

    // Validate consent is true
    // if (consentCheckbox !== true) {
    //   return res.status(400).json({ 
    //     message: 'Consent must be accepted to submit the event registration'
    //   });
    // }

    const event = new Event({
      title,
      slug,
      name,
      email,
      phoneNumber,
      whatsappNumber,
      selectedDates,
      selectedTimes,
      consentCheckbox,
      eventType,
      numberOfAttendees,
      specialRequirements,
    });

    await event.save();

    res.status(201).json({ 
      message: 'Event registration submitted successfully',
      event 
    });
  } catch (err) {
    res.status(500).json({ message: 'Error creating event', error: err.message });
  }
});

// Update an event by ID
router.put('/:id', async (req, res) => {
  const {
    title,
    slug,
    name,
    email,
    phoneNumber,
    whatsappNumber,
    selectedDates,
    selectedTimes,
    consentCheckbox,
    eventType,
    numberOfAttendees,
    specialRequirements,
    status,
    notes,
  } = req.body;

  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    event.updatedBy = req.user?.id;

    // Update fields if provided
    if (title !== undefined) event.title = title;
    if (slug !== undefined) event.slug = slug;
    if (name !== undefined) event.name = name;
    if (email !== undefined) event.email = email;
    if (phoneNumber !== undefined) event.phoneNumber = phoneNumber;
    if (whatsappNumber !== undefined) event.whatsappNumber = whatsappNumber;
    if (selectedDates !== undefined) event.selectedDates = selectedDates;
    if (selectedTimes !== undefined) event.selectedTimes = selectedTimes;
    if (consentCheckbox !== undefined) event.consentCheckbox = consentCheckbox;
    if (eventType !== undefined) event.eventType = eventType;
    if (numberOfAttendees !== undefined) event.numberOfAttendees = numberOfAttendees;
    if (specialRequirements !== undefined) event.specialRequirements = specialRequirements;
    if (status !== undefined) event.status = status;
    if (notes !== undefined) event.notes = notes;

    await event.save();
    await event.populate([
      { path: 'createdBy', select: 'name email' },
      { path: 'updatedBy', select: 'name email' }
    ]);

    res.json({ 
      message: 'Event updated successfully',
      event 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Permanent delete (hard delete)
router.delete('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    await event.deleteOne();
    res.json({ message: 'Event permanently deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
