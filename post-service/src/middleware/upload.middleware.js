const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const logger = require("../utils/logger");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    let resource_type = "auto"; // Automatically detect file type
    let folder = "professional-platform/uploads";
    if (file.mimetype.startsWith("video/")) {
      folder += "/videos";
    } else if (file.mimetype.startsWith("audio/")) {
      folder += "/audio";
    }
    return {
      folder: folder,
      resource_type: resource_type,
      public_id: `post-${req.postId}-${Date.now()}`,
    };
  },
});

const upload = multer({ storage: storage });

module.exports = upload;
