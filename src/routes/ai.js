// src/routes/ai.js

const express = require('express');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const vertexAI = require('../services/vertexAI');

const router = express.Router();
const prisma = new PrismaClient();

// Middleware para verificar autenticaciÃ³n
const authenticateToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Obtener datos actualizados del usuario
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Error en autenticaciÃ³n:', error);
    return res.status(401).json({ error: 'Token invÃ¡lido' });
  }
};

// Generate Image endpoint
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { prompt, projectId, imageUrl, images } = req.body;
    const user = req.user;

    console.log('ðŸ“¥ Received generate request:', { 
      prompt: prompt?.substring(0, 50) + '...', 
      projectId, 
      hasImages: images?.length > 0,
      imagesCount: images?.length 
    });

    // Verificar que el usuario tiene crÃ©ditos
    if (user.imagesRemaining <= 0) {
      return res.status(400).json({ 
        error: 'Sin crÃ©ditos disponibles',
        imagesRemaining: 0
      });
    }

    if (!prompt || !projectId) {
      return res.status(400).json({ error: 'Prompt y projectId son requeridos' });
    }

    // Verificar que el proyecto pertenece al usuario
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.id
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    // ✅ NUEVO: Cargar historial de mensajes del proyecto (últimos 10)
    console.log('📜 Cargando historial del proyecto...');
    const projectMessages = await prisma.message.findMany({
      where: { projectId: projectId },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Invertir para tener orden cronológico
    const conversationHistory = projectMessages.reverse().map(msg => ({
      role: msg.role,
      content: msg.content,
      imageUrl: msg.imageUrl
    }));

    console.log(📚 Historial cargado: +conversationHistory.length+ mensajes);

    // ✅ NUEVO: Extraer última imagen generada por la IA (para poder editarla)
    let lastAIImage = null;
    for (let i = projectMessages.length - 1; i >= 0; i--) {
      if (projectMessages[i].role === 'assistant' && projectMessages[i].imageUrl) {
        lastAIImage = projectMessages[i].imageUrl;
        console.log('🖼️ Última imagen IA encontrada para contexto');
        break;
      }
    }

    // Validar prompt antes de enviar
    try {
      vertexAI.validatePrompt(prompt);
    } catch (validationError) {
      return res.status(400).json({ error: validationError.message });
    }

    let chatResult;
    let imageResult;
    let actionType = 'generate';

    try {
      // PASO 1: Usar Gemini para generar respuesta de texto
      console.log('🤖 Generando respuesta con Gemini...');
      
      // Preparar imágenes para enviar a la IA
      const imagesToSend = [];
      
      // Agregar última imagen generada por IA (para poder editarla)
      if (lastAIImage && lastAIImage.startsWith('data:image')) {
        imagesToSend.push({
          base64Data: lastAIImage.split(',')[1],
          mimeType: lastAIImage.split(';')[0].split(':')[1]
        });
        console.log('✅ Enviando última imagen IA a Gemini para contexto');
      }
      
      // Agregar imágenes del usuario actual
      if (images && images.length > 0) {
        imagesToSend.push(...images);
        console.log(✅ Enviando ${images.length} imagen(es) del usuario a Gemini);
      }

      chatResult = await vertexAI.generateChatResponse(prompt, {
        images: imagesToSend,
        conversationHistory: conversationHistory.slice(-5) // Últimos 5 mensajes para contexto
      });

      if (!chatResult.success) {
        throw new Error('Error en la generaciÃ³n de chat con Gemini');
      }

      // PASO 2: Generar imagen con Imagen 3.0
      console.log('ðŸŽ¨ Generando imagen con Imagen 3.0...');
      if (imageUrl) {
        // EdiciÃ³n de imagen existente
        imageResult = await vertexAI.editImage(imageUrl, prompt, {
          strength: 0.7,
          guidanceScale: 7.5
        });
        actionType = 'edit';
      } else {
        // GeneraciÃ³n nueva
        imageResult = await vertexAI.generateImage(prompt, {
          aspectRatio: '1:1',
          quality: 'high',
          style: 'realistic'
        });
      }

      if (!imageResult.success) {
        throw new Error('Error en la generaciÃ³n de imagen');
      }

      console.log('âœ… Imagen generada exitosamente');
      console.log('ðŸ–¼ï¸ ImageUrl recibido de Imagen 3.0:', imageResult.imageUrl?.substring(0, 100) + '...');
      console.log('ðŸ“ ImageUrl length:', imageResult.imageUrl?.length);

      // Guardar el mensaje del usuario
      await prisma.message.create({
        data: {
          role: 'user',
          content: prompt,
          projectId: projectId
        }
      });

      // Guardar respuesta de la IA (texto de Gemini + imagen)
      const aiMessage = await prisma.message.create({
        data: {
          role: 'assistant',
          content: chatResult.text, // Respuesta de Gemini
          imageUrl: imageResult.imageUrl, // Imagen generada
          imagePrompt: prompt,
          projectId: projectId
        }
      });

      console.log('💾 Mensaje guardado en DB con imageUrl:', !!aiMessage.imageUrl);

      // ✅ SEGURIDAD: Decrementar créditos SOLO si se generó imagen exitosamente
      let updatedUser = user;
      if (imageResult.imageUrl && imageResult.imageUrl.startsWith('data:image')) {
        console.log('💳 Decrementando crédito - Imagen generada exitosamente');
        updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: {
            imagesRemaining: user.imagesRemaining - 1,
            imagesUsedThisMonth: user.imagesUsedThisMonth + 1
          }
        });

        // Guardar en historial de generaciones SOLO si se cobró
        await prisma.generation.create({
          data: {
            userId: user.id,
            prompt: prompt,
            imageUrl: imageResult.imageUrl,
            cost: 1
          }
        });
      } else {
        console.log('⚠️ NO se decrementa crédito - Imagen no generada correctamente');
      }

      // Actualizar timestamp del proyecto
      await prisma.project.update({
        where: { id: projectId },
        data: { updatedAt: new Date() }
      });

      console.log('ðŸ“¤ Enviando respuesta al frontend...');
      console.log('   - success: true');
      console.log('   - imageUrl length:', imageResult.imageUrl?.length);
      console.log('   - aiMessage.imageUrl length:', aiMessage.imageUrl?.length);

      res.json({
        success: true,
        imageUrl: imageResult.imageUrl, // âœ… IMPORTANTE: Imagen en formato base64
        imagesRemaining: updatedUser.imagesRemaining,
        aiMessage: {
          id: aiMessage.id,
          role: aiMessage.role,
          content: aiMessage.content, // Texto de Gemini
          imageUrl: aiMessage.imageUrl, // âœ… IMPORTANTE: Imagen generada
          imagePrompt: aiMessage.imagePrompt,
          createdAt: aiMessage.createdAt
        },
        metadata: {
          chat: chatResult.metadata,
          image: imageResult.metadata
        }
      });

      console.log('âœ… Respuesta enviada exitosamente');

    } catch (aiError) {
      // ❌ Si falla Vertex AI, NO cobrar créditos
      console.error('❌ Error en Vertex AI - NO se cobrará crédito:', aiError.message);
      
      // Guardar mensaje de usuario pero NO cobrar
      await prisma.message.create({
        data: {
          role: 'user',
          content: prompt,
          projectId: projectId
        }
      });

      // 🚫 Verificar si es violación de políticas de contenido
      let errorMessage = `❌ Error generando imagen. Por favor, intenta de nuevo. No se ha cobrado ningún crédito.`;
      let userFriendlyError = 'Error generando imagen';
      
      if (aiError.message === 'CONTENT_POLICY_VIOLATION') {
        errorMessage = `🚫 Lo siento, el contenido solicitado viola nuestros términos de servicio. Por favor, intenta con una solicitud diferente. No se ha cobrado ningún crédito.`;
        userFriendlyError = 'El contenido demandado viola nuestros términos';
        console.log('🚫 Contenido bloqueado por violar políticas de seguridad');
      }

      // Mensaje de error sin cobrar
      const aiMessage = await prisma.message.create({
        data: {
          role: 'assistant',
          content: errorMessage,
          imageUrl: null,
          imagePrompt: prompt,
          projectId: projectId
        }
      });

      // ❌ NO decrementar créditos en caso de error
      console.log('💳 Crédito NO cobrado - Error en generación');

      res.json({
        success: false,
        error: userFriendlyError,
        imagesRemaining: user.imagesRemaining, // Créditos sin cambios
        aiMessage: {
          id: aiMessage.id,
          role: aiMessage.role,
          content: aiMessage.content,
          imageUrl: null,
          imagePrompt: aiMessage.imagePrompt,
          createdAt: aiMessage.createdAt
        },
        errorDetails: aiError.message === 'CONTENT_POLICY_VIOLATION' ? 'Contenido bloqueado por políticas de seguridad' : aiError.message
      });
    }

  } catch (error) {
    console.error('Error generando imagen:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Get generations history
router.get('/generations', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { limit = 20, offset = 0 } = req.query;

    const generations = await prisma.generation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    res.json({
      generations,
      total: await prisma.generation.count({
        where: { userId: user.id }
      })
    });

  } catch (error) {
    console.error('Error obteniendo historial:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});

module.exports = router;
