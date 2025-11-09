const mongoose = require('mongoose');
const metaDataSchema = require('../schemas/metaData.schema');
const mediaSchema = require('../schemas/media.schema');

const SubTitleAndContentSchema = new mongoose.Schema(
  {
    title: { type: String },
    content: { type: String },
  },
  { _id: false }
);

const communityGuideSchema = new mongoose.Schema(
  {
    title: { type: String },
    domain: {
      type: String,
    },
    SubTitleAndContent: [SubTitleAndContentSchema],
    slug: { type: String, unique: true, default: null },
    author: { type: String },
    images: [mediaSchema],
    videos: [mediaSchema],
    date: { type: String },
    shortDescription: { type: String },
    isHomePage: { type: Boolean, default: false },
    description: { type: String },
    metaData: metaDataSchema,
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);
module.exports = mongoose.model('CommunityGuide', communityGuideSchema);
