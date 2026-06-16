// src/routes/user.js

const express = require('express');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Middleware de autenticación
const authenticateToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    console.log('📋 Usuario cargando perfil:', user.email);
    console.log('   Plan:', user.plan);
    console.log('   Créditos:', user.imagesRemaining);
    console.log('   Estado:', user.subscriptionStatus);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        imagesRemaining: user.imagesRemaining,
        imagesUsedThisMonth: user.imagesUsedThisMonth,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionStartDate: user.subscriptionStartDate,
        subscriptionEndDate: user.subscriptionEndDate,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Get user projects
router.get('/projects', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json({ projects });

  } catch (error) {
    console.error('Error obteniendo proyectos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Create project
router.post('/projects', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;
    const user = req.user;

    if (!name) {
      return res.status(400).json({ error: 'Nombre del proyecto es requerido' });
    }

    const project = await prisma.project.create({
      data: {
        name,
        description: description || '',
        userId: user.id
      }
    });

    res.status(201).json({
      message: 'Proyecto creado exitosamente',
      project
    });

  } catch (error) {
    console.error('Error creando proyecto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Update project
router.put('/projects/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, description } = req.body;
    const user = req.user;

    // Verificar que el proyecto pertenece al usuario
    const existingProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.id
      }
    });

    if (!existingProject) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        name: name || existingProject.name,
        description: description !== undefined ? description : existingProject.description
      }
    });

    res.json({
      message: 'Proyecto actualizado exitosamente',
      project: updatedProject
    });

  } catch (error) {
    console.error('Error actualizando proyecto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Delete project
router.delete('/projects/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const user = req.user;

    // Verificar que el proyecto pertenece al usuario
    const existingProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.id
      }
    });

    if (!existingProject) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    await prisma.project.delete({
      where: { id: projectId }
    });

    res.json({ message: 'Proyecto eliminado exitosamente' });

  } catch (error) {
    console.error('Error eliminando proyecto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Get usage statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    const totalProjects = await prisma.project.count({
      where: { userId: user.id }
    });

    const totalGenerations = await prisma.generation.count({
      where: { userId: user.id }
    });

    const thisMonthGenerations = await prisma.generation.count({
      where: {
        userId: user.id,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }
    });

    res.json({
      stats: {
        totalProjects,
        totalGenerations,
        thisMonthGenerations,
        imagesRemaining: user.imagesRemaining,
        plan: user.plan,
        subscriptionStatus: user.subscriptionStatus
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ✨ NUEVO: Sincronizar créditos con el servidor (persistencia multi-dispositivo)
router.get('/sync-credits', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    // Verificar si el plan expiró
    let updatedUser = user;
    if (user.subscriptionEnd && new Date(user.subscriptionEnd) < new Date()) {
      console.log('⚠️ Plan expirado, limpiando créditos y bajando a Free');
      
      updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          plan: 'free',
          imagesRemaining: 0,
          subscriptionStatus: 'expired'
        }
      });
    }

    res.json({
      success: true,
      credits: {
        imagesRemaining: updatedUser.imagesRemaining,
        plan: updatedUser.plan,
        subscriptionStatus: updatedUser.subscriptionStatus,
        subscriptionEnd: updatedUser.subscriptionEnd
      }
    });

  } catch (error) {
    console.error('Error sincronizando créditos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ✨ NUEVO: Webhook para manejar cambios de plan (Stripe)
router.post('/update-subscription', authenticateToken, async (req, res) => {
  try {
    const { plan, credits, subscriptionEnd } = req.body;
    const user = req.user;

    if (!plan) {
      return res.status(400).json({ error: 'Plan es requerido' });
    }

    // Mapeo de planes a créditos
    const planCredits = {
      'free': 0,
      'pulse': 50,
      'flow': 200,
      'summit': 500,
      'peak': 2000,
      'infinity': 999999
    };

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        plan: plan,
        imagesRemaining: credits || planCredits[plan] || 0,
        subscriptionStatus: 'active',
        subscriptionEnd: subscriptionEnd ? new Date(subscriptionEnd) : null
      }
    });

    console.log(`✅ Plan actualizado: ${user.email} -> ${plan} (${updatedUser.imagesRemaining} créditos)`);

    res.json({
      success: true,
      message: 'Suscripción actualizada exitosamente',
      user: {
        plan: updatedUser.plan,
        imagesRemaining: updatedUser.imagesRemaining,
        subscriptionStatus: updatedUser.subscriptionStatus
      }
    });

  } catch (error) {
    console.error('Error actualizando suscripción:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;