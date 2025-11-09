const express = require('express');
const router = express.Router();
const { verifyToken, adminRole } = require('../middleware/auth');
const Team = require('../models/Team');
const { generateSignedUrl, getKey } = require('../utils/s3');

// Group And Sort Team Members
const groupAndSortTeamMembers = members => {
  const grouped = {};

  // Group members by section
  members.forEach((member, index) => {
    const section = member.section;

    if (!grouped[section]) {
      grouped[section] = {
        section: section,
        displayOrder: member.displayOrder != null ? member.displayOrder : index,
        members: [],
      };
    }

    grouped[section].members.push(member);
  });

  // Convert to array and sort
  const result = Object.values(grouped)
    .sort((a, b) => a.displayOrder - b.displayOrder) // sort sections
    .map(sectionGroup => {
      sectionGroup.members.sort((a, b) => a.displayMemberOrder - b.displayMemberOrder); // sort members
      return sectionGroup;
    });

  return result;
};

// Get All Team Members.
router.get('/', async (req, res) => {
  try {
    const allMembers = await Team.find();

    // Generate signed URLs for team member images
    const membersWithSignedUrls = await Promise.all(
      allMembers.map(async member => {
        const memberObj = member.toObject();
        
        if (memberObj.imageUrl) {
          const signedUrl = await generateSignedUrl(getKey(memberObj.imageUrl));
          memberObj.imageUrl = signedUrl;
        }

        return memberObj;
      })
    );

    const groupedAndSorted = groupAndSortTeamMembers(membersWithSignedUrls);
    res.status(200).json({ team: groupedAndSorted });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Save a single team section
router.post('/', async (req, res) => {
  try {
    const {
      section,
      displayOrder,
      imageUrl,
      fullName,
      title,
      languagesSpoken,
      description,
      displayMemberOrder,
      draft,
      joiningDate,
    } = req.body;

    if (!section || !fullName) {
      return res.status(400).json({ message: 'Section and fullName are required' });
    }

    const newMember = new Team({
      section,
      displayOrder,
      imageUrl,
      fullName,
      title,
      languagesSpoken,
      description,
      displayMemberOrder,
      draft: draft || false,
      joiningDate: joiningDate || null,
    });

    const savedMember = await newMember.save();

    res.status(201).json({ message: 'Member added successfully', member: savedMember });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get Single Member
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const member = await Team.findById(id);

    if (!member) {
      return res.status(404).json({ message: 'Team member not found' });
    }

    const memberObj = member.toObject();

    // Generate signed URL for team member image
    if (memberObj.imageUrl) {
      const signedUrl = await generateSignedUrl(getKey(memberObj.imageUrl));
      memberObj.imageUrl = signedUrl;
    }

    res.status(200).json({ member: memberObj });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete Single Member
router.delete('/:id', verifyToken, adminRole, async (req, res) => {
  try {
    const { id } = req.params;

    const deletedMember = await Team.findByIdAndDelete(id);

    if (!deletedMember) {
      return res.status(404).json({ message: 'Team member not found' });
    }

    res.status(200).json({ message: 'Member deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: err.message });
  }
});

// Update Single Record.
router.put('/:id', verifyToken, adminRole, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedMember = await Team.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedMember) {
      return res.status(404).json({ message: 'Team member not found' });
    }

    res.status(200).json({ message: 'Member updated successfully', member: updatedMember });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Bulk Update Team Members
router.patch('/bulk-update', verifyToken, adminRole, async (req, res) => {
  try {
    const updates = req.body;

    if (!Array.isArray(updates)) {
      return res.status(400).json({ message: 'Request body must be an array' });
    }

    const updatePromises = updates.map(item => {
      const { _id, ...updateData } = item;

      if (!_id) {
        throw new Error('Each item must contain an _id');
      }

      return Team.findByIdAndUpdate(_id, updateData, {
        new: true,
        runValidators: true,
      });
    });

    const updatedMembers = await Promise.all(updatePromises);

    res.status(200).json({
      message: 'Members updated successfully',
      updatedMembers,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
