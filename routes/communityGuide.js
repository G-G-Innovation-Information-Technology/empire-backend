const express = require('express');
const CommunityGuide = require('../models/CommunityGuide');
const { generateSignedUrl, getKey } = require('../utils/s3');
const { isValidObjectId } = require('mongoose');
const router = express.Router();
const { verifyToken, adminRole } = require('../middleware/auth');

// Get all communityGuides (with pagination, sorting, and filtering)
router.get('/', async (req, res) => {
  try {
    let { page = 1, limit = 10, sortBy = 'date', order = 'desc', domain } = req.query;
    const sortOrder = order === 'asc' ? 1 : -1;
    let filter = {};

    if (domain) filter.domain = domain;

    // Handle limit = all
    let limitValue;
    if (limit === 'all') {
      limitValue = 0; // mongoose: 0 means "no limit"
      page = 1; // reset pagination
    } else {
      limitValue = parseInt(limit);
    }

    const totalCommunityGuides = await CommunityGuide.countDocuments(filter);

    const communityGuides = await CommunityGuide.find(filter)
      .sort({ [sortBy]: sortOrder })
      .limit(limitValue) // if 0 → fetch all
      .skip(limitValue > 0 ? (page - 1) * limitValue : 0);

    const communityGuidesWithSignedUrls = await Promise.all(
      communityGuides.map(async communityGuide => {
        const imagesPromises =
          communityGuide.images && Array.isArray(communityGuide.images)
            ? communityGuide.images.map(image => generateSignedUrl(getKey(image?.url)))
            : [];

        const videoPromises =
          communityGuide.videos && Array.isArray(communityGuide.videos)
            ? communityGuide.videos.map(el => generateSignedUrl(getKey(el?.url)))
            : [];

        const [imagesSignedUrls, videosSignedUrls] = await Promise.all([
          Promise.all(imagesPromises),
          Promise.all(videoPromises),
        ]);

        if (communityGuide.images?.length === imagesSignedUrls?.length) {
          communityGuide.images = communityGuide.images.map((img, index) => ({
            ...img,
            url: imagesSignedUrls[index],
          }));
        }

        if (communityGuide.videos?.length === videosSignedUrls?.length) {
          communityGuide.videos = communityGuide.videos.map((video, index) => ({
            ...video,
            url: videosSignedUrls[index],
          }));
        }

        return communityGuide;
      })
    );

    res.json({
      totalCommunityGuides,
      currentPage: page,
      totalPages: limit === 'all' ? 1 : Math.ceil(totalCommunityGuides / limitValue),
      communityGuides: communityGuidesWithSignedUrls,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a single communityGuide by ID (with error handling for non-existent ID)
router.get('/:idOrSlug', async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    let communityGuide;

    if (isValidObjectId(idOrSlug)) {
      communityGuide = await CommunityGuide.findById(idOrSlug);
    }

    // If not found by ID or if not a valid ObjectId, try slug
    if (!communityGuide) {
      communityGuide = await CommunityGuide.findOne({ slug: idOrSlug });
    }

    if (!communityGuide) {
      return res.status(404).json({ message: 'CommunityGuide not found' });
    }

    const imagesPromises =
      communityGuide.images && Array.isArray(communityGuide.images)
        ? communityGuide.images.map(image => generateSignedUrl(getKey(image?.url)))
        : [];

    const videoPromises =
      communityGuide.videos && Array.isArray(communityGuide.videos)
        ? communityGuide.videos.map(el => generateSignedUrl(getKey(el?.url)))
        : [];

    const [imagesSignedUrls, videosSignedUrls] = await Promise.all([
      Promise.all(imagesPromises),
      Promise.all(videoPromises),
    ]);

    // Assign signed URLs back to the communityGuide object
    if (communityGuide.images?.length === imagesSignedUrls?.length) {
      communityGuide.images = communityGuide.images.map((img, index) => ({
        ...img,
        url: imagesSignedUrls[index],
      }));
    }

    if (communityGuide.videos?.length === videosSignedUrls?.length) {
      communityGuide.videos.forEach((video, index) => ({
        ...video,
        url: videosSignedUrls[index],
      }));
    }
    res.status(200).json({ communityGuide: communityGuide });
  } catch (err) {
    res.status(500).json({ message: 'Invalid communityGuide ID', error: err.message });
  }
});

router.use(verifyToken, adminRole);

// Create a new communityGuide
router.post('/', async (req, res) => {
  const {
    title,
    slug,
    images,
    videos,
    date,
    description,
    domain,
    SubTitleAndContent,
    metaData,
    shortDescription,
    author,
  } = req.body;

  try {
    const communityGuide = new CommunityGuide({
      title,
      slug,
      images,
      videos,
      date,
      description,
      domain,
      SubTitleAndContent,
      metaData,
      shortDescription,
      author,
    });

    communityGuide.createdBy = req.user?.id;

    await communityGuide.save();
    await communityGuide.populate('createdBy');

    res.status(201).json(communityGuide);
  } catch (err) {
    res.status(500).json({ message: 'Error creating communityGuide', error: err.message });
  }
});

// Update a communityGuide by ID
router.put('/:id', async (req, res) => {
  const {
    title,
    images,
    videos,
    date,
    description,
    domain,
    SubTitleAndContent,
    metaData,
    shortDescription,
    author,
    slug,
  } = req.body;

  try {
    const communityGuide = await CommunityGuide.findById(req.params.id);
    if (!communityGuide) {
      return res.status(404).json({ message: 'CommunityGuide not found' });
    }
    communityGuide.updatedBy = req.user?.id;

    communityGuide.title = title || communityGuide.title;
    communityGuide.slug = slug || communityGuide.slug;
    communityGuide.images = images || communityGuide.images;
    communityGuide.videos = videos || communityGuide.videos;
    communityGuide.date = date || communityGuide.date;
    communityGuide.description = description || communityGuide.description;
    communityGuide.SubTitleAndContent = SubTitleAndContent || communityGuide.SubTitleAndContent;
    communityGuide.domain = domain || communityGuide.domain;
    communityGuide.metaData = metaData || communityGuide.metaData;
    communityGuide.shortDescription = shortDescription || communityGuide.shortDescription;
    communityGuide.author = author || communityGuide.author;

    await communityGuide.save();
    await communityGuide.populate([{ path: 'createdBy' }, { path: 'updatedBy' }]);

    res.json(communityGuide);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete a communityGuide by ID
router.delete('/:id', async (req, res) => {
  try {
    const communityGuide = await CommunityGuide.findById(req.params.id);
    if (!communityGuide) {
      return res.status(404).json({ message: 'CommunityGuide not found' });
    }

    await communityGuide.deleteOne();
    res.json({ message: 'CommunityGuide deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;