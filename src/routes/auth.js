// src/routes/auth.js

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Configurar Google OAuth (solo si está disponible)
let googleClient = null;
try {
  const { OAuth2Client } = require('google-auth-library');
  googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.FRONTEND_URL || 'http://localhost:8080'}/login/callback`
  );
} catch (error) {
  console.warn('Google Auth Library no disponible, OAuth deshabilitado');
}

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validación básica
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario con plan Free por defecto
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        plan: 'free',
        imagesRemaining: 0, // Plan Free bloqueado
        imagesUsedThisMonth: 0,
        subscriptionStatus: 'inactive'
      }
    });

    // ✅ Generar token JWT simplificado (solo identificación)
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email
        // ❌ NO incluir datos que cambian (plan, créditos, estado)
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    console.log('✅ Usuario registrado:', user.email);
    console.log('   Plan inicial:', user.plan);
    console.log('   Créditos:', user.imagesRemaining);

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      token,
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        imagesRemaining: user.imagesRemaining,
        imagesUsedThisMonth: user.imagesUsedThisMonth,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionStartDate: user.subscriptionStartDate,
        subscriptionEndDate: user.subscriptionEndDate
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // ✅ Generar token JWT simplificado (solo identificación)
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email
        // ❌ NO incluir datos que cambian (plan, créditos, estado)
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    console.log('✅ Login exitoso:', user.email);
    console.log('   Plan:', user.plan);
    console.log('   Créditos:', user.imagesRemaining);
    console.log('   Estado:', user.subscriptionStatus);

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        imagesRemaining: user.imagesRemaining,
        imagesUsedThisMonth: user.imagesUsedThisMonth,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionStartDate: user.subscriptionStartDate,
        subscriptionEndDate: user.subscriptionEndDate
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Change password endpoint
router.put('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const token = req.headers.authorization?.replace('Bearer ', '');

    console.log('🔐 Solicitud de cambio de contraseña recibida');

    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Contraseña actual y nueva contraseña son requeridas' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    console.log('🔍 Buscando usuario:', userId);

    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar que el usuario tenga contraseña (no OAuth)
    if (!user.password) {
      return res.status(400).json({ error: 'Este usuario no tiene contraseña. Usa el login de Google.' });
    }

    console.log('🔓 Verificando contraseña actual...');

    // Verificar contraseña actual
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);

    if (!isValidPassword) {
      console.log('❌ Contraseña actual incorrecta');
      return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
    }

    console.log('✅ Contraseña actual válida, actualizando...');

    // Hashear nueva contraseña
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    });

    console.log('✅ Contraseña actualizada exitosamente');
    res.json({ message: 'Contraseña actualizada exitosamente' });

  } catch (error) {
    console.error('❌ Error al cambiar contraseña:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Google OAuth routes
router.get('/google', (req, res) => {
  try {
    if (!googleClient) {
      return res.status(503).json({ 
        error: 'Google OAuth no disponible. Usa email/contraseña por ahora.' 
      });
    }

    const authUrl = googleClient.generateAuthUrl({
      access_type: 'offline',
      scope: ['profile', 'email'],
      prompt: 'select_account'
    });

    res.redirect(authUrl);
  } catch (error) {
    console.error('Error iniciando OAuth:', error);
    res.status(500).json({ error: 'Error en autenticación con Google' });
  }
});

// Google OAuth callback
router.get('/google/callback', async (req, res) => {
  try {
    if (!googleClient) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_unavailable`);
    }

    const { code } = req.query;

    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_cancelled`);
    }

    // Intercambiar código por tokens
    const { tokens } = await googleClient.getTokens(code);
    googleClient.setCredentials(tokens);

    // Obtener información del usuario
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_email`);
    }

    // Buscar o crear usuario
    let user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Crear nuevo usuario
      user = await prisma.user.create({
        data: {
          email,
          password: '', // Sin contraseña para usuarios OAuth
          plan: 'free',
          imagesRemaining: 3,
          imagesUsedThisMonth: 0,
          subscriptionStatus: 'active'
        }
      });
    }

    // ✅ Generar token JWT simplificado (solo identificación)
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email
        // ❌ NO incluir datos que cambian
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    console.log('✅ OAuth login exitoso:', user.email);

    // Redirigir al frontend con el token
    res.redirect(`${process.env.FRONTEND_URL}/login/callback?token=${token}`);

  } catch (error) {
    console.error('Error en OAuth callback:', error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
  }
});

module.exports = router;