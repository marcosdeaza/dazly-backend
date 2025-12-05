// src/routes/upload.js - Nuevo endpoint para manejar uploads de imágenes

const express = require('express');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configurar multer para el upload de imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/images';
    // Crear directorio si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB límite
  },
  fileFilter: (req, file, cb) => {
    // Solo permitir imágenes
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'), false);
    }
  }
});

// Middleware de autenticación
const authenticateToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Error en autenticación:', error);
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// Endpoint para subir imágenes
router.post('/images', authenticateToken, upload.array('images', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron archivos' });
    }

    // Procesar archivos subidos
    const uploadedImages = req.files.map((file, index) => ({
      id: `img_${Date.now()}_${index}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      url: `/uploads/images/${file.filename}`, // URL relativa
      uploadedAt: new Date().toISOString()
    }));

    console.log(`📤 ${uploadedImages.length} imagen(es) subida(s) por usuario ${req.user.userId}`);

    res.json({
      success: true,
      message: `${uploadedImages.length} imagen(es) subida(s) exitosamente`,
      images: uploadedImages
    });

  } catch (error) {
    console.error('Error en upload:', error);
    res.status(500).json({ error: 'Error al procesar las imágenes' });
  }
});

// Endpoint para servir imágenes subidas
router.get('/images/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(__dirname, '../../uploads/images', filename);

  if (fs.existsSync(imagePath)) {
    res.sendFile(path.resolve(imagePath));
  } else {
    res.status(404).json({ error: 'Imagen no encontrada' });
  }
});

// Endpoint para eliminar imagen
router.delete('/images/:filename', authenticateToken, (req, res) => {
  try {
    const filename = req.params.filename;
    const imagePath = path.join(__dirname, '../../uploads/images', filename);

    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
      res.json({ success: true, message: 'Imagen eliminada' });
    } else {
      res.status(404).json({ error: 'Imagen no encontrada' });
    }
  } catch (error) {
    console.error('Error eliminando imagen:', error);
    res.status(500).json({ error: 'Error al eliminar imagen' });
  }
});

module.exports = router;