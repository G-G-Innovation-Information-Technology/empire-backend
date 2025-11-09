const express = require('express');
const cors = require('cors');
const connectDB = require('./Database/connection');
const dotenv = require('dotenv');
const multer = require('multer');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/product');
const blogRoutes = require('./routes/blog');
const communityGuideRoutes = require('./routes/communityGuide');
const seoTagRoutes = require('./routes/seoTag');
const projectRoutes = require('./routes/project');
const propertyRoutes = require('./routes/property');
const enquiryRoutes = require('./routes/enquiry');
const careerRoutes = require('./routes/career');
const pageLayoutRoutes = require('./routes/pageLayout');
const zapierRoutes = require('./routes/zapier');
const contactUsRoutes = require('./routes/contactUs');
const dashboardRoutes = require('./routes/Dashboard');

const UploadController = require('./controllers/uploadController');
const userRoutes = require('./routes/User');
const { verifyToken } = require('./middleware/auth');
const path = require('path');
const teamRoutes = require('./routes/team');
const eventsRoutes = require('./routes/events');

const http = require('http');

dotenv.config();

connectDB();
// exportCollection();

const app = express();
const server = http.createServer(app);

app.use(
  cors({
    origin: '*', // Or explicitly: chrome-extension://oekdlegcccpmgoioblacenjdlfffploj
    methods: '*',
    allowedHeaders: '*',
  })
);
// Middleware to parse JSON requests
app.use(express.json());


const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1000 * 1024 * 1024, // limit file size to 1000MB
  },
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const uploadController = new UploadController();

// Server health check
app.get('/', (req, res) => {
  res.send('Empire Infratech Backend Server is healthy');
});

// s3 routes
app.post('/getSignUrlForUpload', verifyToken, upload.single('file'), uploadController.upload);

app.use('/api/products', productRoutes);

// app.use('/api/contact', contactUsRoutes);

app.use('/api/projects', projectRoutes);

// empire infratech
// Auth Routes
app.use('/api/auth', authRoutes);

app.use('/api/user', userRoutes);

app.use('/api/property', propertyRoutes);

app.use('/api/dashboard', dashboardRoutes);

app.use('/api/property/enquiry', enquiryRoutes);

app.use('/api/careers/application', careerRoutes);

app.use('/api/blogs', blogRoutes);
app.use('/api/community-guides', communityGuideRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/seoTags', seoTagRoutes);

app.use('/api/page-layouts', pageLayoutRoutes);

app.use('/api/contact', contactUsRoutes);

app.use('/api/events', eventsRoutes);

// zapier
app.use('/api/zapier', zapierRoutes);
