// src/routes/health.js

const express = require('express');
const vertexAI = require('../services/vertexAI');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Health check endpoint
router.get('/', async (req, res) => {
  try {
    const checks = {
      database: false,
      vertexAI: false,
      timestamp: new Date().toISOString()
    };

    // Check database
    try {
      await prisma.user.count();
      checks.database = true;
    } catch (error) {
      console.error('Database health check failed:', error.message);
    }

    // Check Vertex AI
    try {
      const aiHealth = await vertexAI.healthCheck();
      checks.vertexAI = aiHealth.status === 'healthy';
    } catch (error) {
      console.error('Vertex AI health check failed:', error.message);
    }

    const isHealthy = checks.database && checks.vertexAI;

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      checks,
      version: '1.0.0',
      uptime: process.uptime()
    });

  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Specific service health checks
router.get('/database', async (req, res) => {
  try {
    const start = Date.now();
    const userCount = await prisma.user.count();
    const responseTime = Date.now() - start;

    res.json({
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      userCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/vertex-ai', async (req, res) => {
  try {
    const health = await vertexAI.healthCheck();
    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;