// src/routes/projects.js

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const router = express.Router();
const prisma = new PrismaClient();

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// Obtener todos los proyectos del usuario
router.get('/', authenticateToken, async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { userId: req.user.userId },
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

// Límites de proyectos por plan
const PROJECT_LIMITS = {
  'free': 1,      // 🎁 Actualizado: 1 proyecto gratis
  'xmas': 3,      // 🎄 Plan Navidad: 3 proyectos
  'pulse': 5,     // 5 proyectos
  'flow': 10,     // 10 proyectos
  'summit': 25,   // 25 proyectos
  'peak': 50,     // 50 proyectos
  'infinity': 100 // 100 proyectos
};

// Crear nuevo proyecto
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'El nombre del proyecto es requerido' });
    }

    // ✅ Verificar límite de proyectos según el plan del usuario
    const userPlan = req.user.plan || 'free';
    const maxProjects = PROJECT_LIMITS[userPlan] || 1;

    // Contar proyectos actuales del usuario
    const currentProjectCount = await prisma.project.count({
      where: { userId: req.user.userId }
    });

    if (currentProjectCount >= maxProjects) {
      return res.status(403).json({ 
        error: 'Límite de proyectos alcanzado',
        message: `Tu plan ${userPlan === 'free' ? 'Free' : userPlan.charAt(0).toUpperCase() + userPlan.slice(1)} permite máximo ${maxProjects} proyecto${maxProjects > 1 ? 's' : ''}. Elimina un proyecto existente o actualiza tu plan.`,
        currentCount: currentProjectCount,
        maxProjects: maxProjects,
        plan: userPlan
      });
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        userId: req.user.userId
      }
    });

    res.status(201).json({ project });
  } catch (error) {
    console.error('Error creando proyecto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar proyecto
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    // Verificar que el proyecto pertenece al usuario
    const existingProject = await prisma.project.findFirst({
      where: {
        id,
        userId: req.user.userId
      }
    });

    if (!existingProject) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        name: name || existingProject.name,
        description: description !== undefined ? description : existingProject.description
      }
    });

    res.json({ project });
  } catch (error) {
    console.error('Error actualizando proyecto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar proyecto
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el proyecto pertenece al usuario
    const existingProject = await prisma.project.findFirst({
      where: {
        id,
        userId: req.user.userId
      }
    });

    if (!existingProject) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    await prisma.project.delete({
      where: { id }
    });

    res.json({ message: 'Proyecto eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando proyecto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Agregar mensaje a proyecto
router.post('/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, content, imageUrl, imagePrompt } = req.body;

    // Verificar que el proyecto pertenece al usuario
    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: req.user.userId
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    const message = await prisma.message.create({
      data: {
        role,
        content,
        imageUrl,
        imagePrompt,
        projectId: id
      }
    });

    // Actualizar timestamp del proyecto
    await prisma.project.update({
      where: { id },
      data: { updatedAt: new Date() }
    });

    res.status(201).json({ message });
  } catch (error) {
    console.error('Error agregando mensaje:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;