const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');

const POSTS_FILE = path.join(__dirname, '..', 'data', 'posts.json');
const ADS_FILE = path.join(__dirname, '..', 'data', 'ads.json');
const RETRO_ADS_FILE = path.join(__dirname, '..', 'data', 'retro_ads.json');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Multer config for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('INVALID FILE FORMAT. ONLY JPG, PNG, GIF, WEBP PERMITTED.'));
    }
  }
});

// Helpers
function readPosts() {
  const data = fs.readFileSync(POSTS_FILE, 'utf8');
  return JSON.parse(data);
}

function writePosts(posts) {
  fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
}

function readAds() {
  const data = fs.readFileSync(ADS_FILE, 'utf8');
  return JSON.parse(data);
}

function generateLikes() {
  return Math.floor(Math.random() * 45000) + 5000;
}

function extractYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// GET /api/posts - list all posts
router.get('/posts', (req, res) => {
  const posts = readPosts();
  posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (req.query.featured === 'true') {
    return res.json(posts.filter(p => p.featured));
  }
  res.json(posts);
});

// GET /api/posts/:id - single post
router.get('/posts/:id', (req, res) => {
  const posts = readPosts();
  const post = posts.find(p => p.id === req.params.id);
  if (!post) {
    return res.status(404).json({ error: 'DISPATCH NOT FOUND. IT MAY HAVE BEEN REDACTED.' });
  }
  res.json(post);
});

// GET /api/ads - get ads (shuffled)
router.get('/ads', (req, res) => {
  const ads = readAds();
  // Fisher-Yates shuffle
  for (let i = ads.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ads[i], ads[j]] = [ads[j], ads[i]];
  }
  res.json(ads);
});

// GET /api/retro-ads - get retro game ads (shuffled)
router.get('/retro-ads', (req, res) => {
  const data = fs.readFileSync(RETRO_ADS_FILE, 'utf8');
  const ads = JSON.parse(data);
  for (let i = ads.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ads[i], ads[j]] = [ads[j], ads[i]];
  }
  res.json(ads);
});

// POST /api/posts - create post (auth required)
router.post('/posts', requireAuth, upload.single('photo'), (req, res) => {
  const posts = readPosts();
  const { type, content, mediaUrl, linkUrl, linkTitle, likes, featured } = req.body;

  const newPost = {
    id: crypto.randomBytes(4).toString('hex'),
    type: type || 'text',
    content: content || '',
    mediaUrl: null,
    linkUrl: linkUrl || null,
    linkTitle: linkTitle || null,
    timestamp: new Date().toISOString(),
    likes: likes ? parseInt(likes, 10) : generateLikes(),
    featured: featured === 'true' || featured === true
  };

  // Handle media based on type
  if (type === 'photo' && req.file) {
    newPost.mediaUrl = `/uploads/${req.file.filename}`;
  } else if (type === 'video' && mediaUrl) {
    const videoId = extractYouTubeId(mediaUrl);
    newPost.mediaUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : mediaUrl;
  }

  posts.push(newPost);
  writePosts(posts);

  res.status(201).json(newPost);
});

// PUT /api/posts/:id - update post (auth required)
router.put('/posts/:id', requireAuth, upload.single('photo'), (req, res) => {
  const posts = readPosts();
  const index = posts.findIndex(p => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'DISPATCH NOT FOUND.' });
  }

  const { type, content, mediaUrl, linkUrl, linkTitle, likes, featured } = req.body;
  const post = posts[index];

  if (content !== undefined) post.content = content;
  if (type !== undefined) post.type = type;
  if (linkUrl !== undefined) post.linkUrl = linkUrl;
  if (linkTitle !== undefined) post.linkTitle = linkTitle;
  if (likes !== undefined) post.likes = parseInt(likes, 10);
  if (featured !== undefined) post.featured = featured === 'true' || featured === true;

  if (type === 'photo' && req.file) {
    post.mediaUrl = `/uploads/${req.file.filename}`;
  } else if (type === 'video' && mediaUrl) {
    const videoId = extractYouTubeId(mediaUrl);
    post.mediaUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : mediaUrl;
  }

  posts[index] = post;
  writePosts(posts);

  res.json(post);
});

// DELETE /api/posts/:id - delete post (auth required)
router.delete('/posts/:id', requireAuth, (req, res) => {
  const posts = readPosts();
  const index = posts.findIndex(p => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'DISPATCH NOT FOUND.' });
  }

  const removed = posts.splice(index, 1)[0];

  // Clean up uploaded file if it exists
  if (removed.mediaUrl && removed.mediaUrl.startsWith('/uploads/')) {
    const filePath = path.join(__dirname, '..', removed.mediaUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  writePosts(posts);
  res.json({ message: 'DISPATCH REDACTED SUCCESSFULLY.', id: removed.id });
});

// POST /api/posts/:id/feature - toggle featured (auth required)
router.post('/posts/:id/feature', requireAuth, (req, res) => {
  const posts = readPosts();
  const post = posts.find(p => p.id === req.params.id);
  if (!post) {
    return res.status(404).json({ error: 'DISPATCH NOT FOUND.' });
  }

  post.featured = !post.featured;
  writePosts(posts);

  res.json({ id: post.id, featured: post.featured });
});

module.exports = router;
