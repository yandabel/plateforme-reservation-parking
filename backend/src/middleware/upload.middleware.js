const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Storage pour les images de parking
const parkingStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'parking-reservation/parkings',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [{ width: 1200, height: 800, crop: 'limit' }],
    public_id: (req, file) => {
      const name = Date.now() + '-' + Math.round(Math.random() * 1E9);
      return `parking-${name}`;
    }
  }
});

// Storage pour les avatars utilisateurs
const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'parking-reservation/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'thumb', gravity: 'face' }],
    public_id: (req, file) => {
      const name = Date.now() + '-' + Math.round(Math.random() * 1E9);
      return `avatar-${name}`;
    }
  }
});

// Storage pour les photos de véhicules
const vehicleStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'parking-reservation/vehicles',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, height: 600, crop: 'limit' }],
    public_id: (req, file) => {
      const name = Date.now() + '-' + Math.round(Math.random() * 1E9);
      return `vehicle-${name}`;
    }
  }
});

// Filtre des fichiers
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error('Seules les images sont autorisées (jpeg, jpg, png, gif, webp)'));
  }
};

// Configuration multer pour Cloudinary
const uploadParkingImage = multer({ 
  storage: parkingStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter
}).single('image');

const uploadAvatar = multer({ 
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: fileFilter
}).single('avatar');

const uploadVehiclePhoto = multer({ 
  storage: vehicleStorage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
  fileFilter: fileFilter
}).single('photo');

module.exports = {
  uploadParkingImage,
  uploadAvatar,
  uploadVehiclePhoto,
  cloudinary // Export cloudinary pour d'autres utilisations
};