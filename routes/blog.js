const express = require('express');
const Blog = require('../models/Blog');
const { generateSignedUrl, getKey } = require('../utils/s3');
const { isValidObjectId } = require('mongoose');
const router = express.Router();
const { verifyToken, adminRole } = require('../middleware/auth');

// Get all blogs (with pagination, sorting, and filtering)
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

    const totalBlogs = await Blog.countDocuments(filter);

    const blogs = await Blog.find(filter)
      .sort({ [sortBy]: sortOrder })
      .limit(limitValue) // if 0 → fetch all
      .skip(limitValue > 0 ? (page - 1) * limitValue : 0);

    const blogsWithSignedUrls = await Promise.all(
      blogs.map(async blog => {
        const imagesPromises =
          blog.images && Array.isArray(blog.images)
            ? blog.images.map(image => generateSignedUrl(getKey(image?.url)))
            : [];

        const videoPromises =
          blog.videos && Array.isArray(blog.videos)
            ? blog.videos.map(el => generateSignedUrl(getKey(el?.url)))
            : [];

        const [imagesSignedUrls, videosSignedUrls] = await Promise.all([
          Promise.all(imagesPromises),
          Promise.all(videoPromises),
        ]);

        if (blog.images?.length === imagesSignedUrls?.length) {
          blog.images = blog.images.map((img, index) => ({
            ...img,
            url: imagesSignedUrls[index],
          }));
        }

        if (blog.videos?.length === videosSignedUrls?.length) {
          blog.videos = blog.videos.map((video, index) => ({
            ...video,
            url: videosSignedUrls[index],
          }));
        }

        return blog;
      })
    );

    res.json({
      totalBlogs,
      currentPage: page,
      totalPages: limit === 'all' ? 1 : Math.ceil(totalBlogs / limitValue),
      blogs: blogsWithSignedUrls,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a single blog by ID (with error handling for non-existent ID)
router.get('/:idOrSlug', async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    let blog;

    if (isValidObjectId(idOrSlug)) {
      blog = await Blog.findById(idOrSlug);
    }

    // If not found by ID or if not a valid ObjectId, try slug
    if (!blog) {
      blog = await Blog.findOne({ slug: idOrSlug });
    }

    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    const imagesPromises =
      blog.images && Array.isArray(blog.images)
        ? blog.images.map(image => generateSignedUrl(getKey(image?.url)))
        : [];

    const videoPromises =
      blog.videos && Array.isArray(blog.videos)
        ? blog.videos.map(el => generateSignedUrl(getKey(el?.url)))
        : [];

    const [imagesSignedUrls, videosSignedUrls] = await Promise.all([
      Promise.all(imagesPromises),
      Promise.all(videoPromises),
    ]);

    // Assign signed URLs back to the blog object
    if (blog.images?.length === imagesSignedUrls?.length) {
      blog.images = blog.images.map((img, index) => ({
        ...img,
        url: imagesSignedUrls[index],
      }));
    }

    if (blog.videos?.length === videosSignedUrls?.length) {
      blog.videos.forEach((video, index) => ({
        ...video,
        url: videosSignedUrls[index],
      }));
    }
    res.status(200).json({ blog: blog });
  } catch (err) {
    res.status(500).json({ message: 'Invalid blog ID', error: err.message });
  }
});

router.use(verifyToken, adminRole);

// Create a new blog
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
    const blog = new Blog({
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

    blog.createdBy = req.user?.id;

    await blog.save();
    await blog.populate('createdBy');

    res.status(201).json(blog);
  } catch (err) {
    res.status(500).json({ message: 'Error creating blog', error: err.message });
  }
});

// Update a blog by ID
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
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    blog.updatedBy = req.user?.id;

    blog.title = title || blog.title;
    blog.slug = slug || blog.slug;
    blog.images = images || blog.images;
    blog.videos = videos || blog.videos;
    blog.date = date || blog.date;
    blog.description = description || blog.description;
    blog.SubTitleAndContent = SubTitleAndContent || blog.SubTitleAndContent;
    blog.domain = domain || blog.domain;
    blog.metaData = metaData || blog.metaData;
    blog.shortDescription = shortDescription || blog.shortDescription;
    blog.author = author || blog.author;

    await blog.save();
    await blog.populate([{ path: 'createdBy' }, { path: 'updatedBy' }]);

    res.json(blog);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete a blog by ID
router.delete('/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    await blog.deleteOne();
    res.json({ message: 'Blog deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
