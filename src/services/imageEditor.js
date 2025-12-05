// src/services/imageEditor.js
// Sistema de edición de imágenes con memoria visual y Context Caching

const fetch = require('node-fetch');
const { GoogleAuth } = require('google-auth-library');
const path = require('path');

class ImageEditorService {
  constructor() {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'dazly-84a82';
    this.location = process.env.VERTEX_AI_LOCATION || 'us-central1';
    
    // Modelo Gemini para visión y análisis con caché
    this.visionModel = 'gemini-1.5-flash-002'; // Soporta context caching
    
    // Modelo Imagen para edición
    this.editModel = 'imagegeneration@006';
    
    this.keyFilePath = path.join(__dirname, '../../dazly-api-f81d60806910.json');
    
    this.auth = new GoogleAuth({
      keyFile: this.keyFilePath,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    
    // URLs de API
    this.visionURL = \https://\-aiplatform.googleapis.com/v1/projects/\/locations/\/publishers/google/models/\:generateContent\;
    this.cacheURL = \https://\-aiplatform.googleapis.com/v1/projects/\/locations/\/cachedContents\;
    this.editURL = \https://\-aiplatform.googleapis.com/v1/projects/\/locations/\/publishers/google/models/\:predict\;
    
    console.log('🎨 ImageEditor Service initialized');
    console.log('   Vision Model:', this.visionModel);
    console.log('   Edit Model:', this.editModel);
  }

  async getAccessToken() {
    const client = await this.auth.getClient();
    const accessToken = await client.getAccessToken();
    return accessToken.token;
  }

  // 🆕 COMPRIMIR IMAGEN para evitar "failed to fetch"
  async compressImageBase64(base64Data, maxSizeKB = 500) {
    try {
      // Si la imagen es menor a maxSizeKB, no comprimir
      const currentSizeKB = (base64Data.length * 3) / 4 / 1024;
      
      if (currentSizeKB <= maxSizeKB) {
        console.log(\📦 Imagen ya es pequeña: \ KB\);
        return base64Data;
      }

      console.log(\🗜️ Comprimiendo imagen de \ KB a ~\ KB\);
      
      // En Node.js necesitarías sharp o similar
      // Por ahora, retornar la imagen original
      // TODO: Implementar compresión real con sharp
      return base64Data;

    } catch (error) {
      console.error('Error comprimiendo imagen:', error);
      return base64Data;
    }
  }

  // 🆕 CREAR CACHÉ CON CONTEXTO VISUAL (todas las imágenes del proyecto)
  async createVisualCache(projectName, previousImages = []) {
    try {
      console.log(\🧠 Creando caché visual para proyecto: \\);
      console.log(\📸 Imágenes en caché: \\);
      
      const accessToken = await this.getAccessToken();
      
      // System prompt para edición precisa
      const systemPrompt = \Eres Dazly, experto en EDICIÓN PRECISA de imágenes.

TU MISIÓN:
- VER todas las imágenes del proyecto y recordarlas
- EDITAR imágenes EXACTAMENTE como el usuario pide
- NO cambiar nada que el usuario NO mencione
- Mantener el estilo, composición y elementos originales
- Solo modificar lo que se pide explícitamente

CAPACIDADES DE EDICIÓN:
✏️ Cambiar colores específicos
🎨 Ajustar saturación, brillo, contraste
✂️ Remover objetos o personas
➕ Añadir elementos (texto, logos, objetos)
🔄 Cambiar fondos
🎭 Aplicar filtros o estilos
📐 Ajustar composición

IMPORTANTE:
- RECUERDAS todas las imágenes previas del proyecto
- Puedes comparar versiones: "en la imagen anterior..."
- Das feedback específico sobre cambios realizados
- Siempre mantienes coherencia con el proyecto

PROYECTO: \
IMÁGENES EN MEMORIA: \

Responde en español con formato Markdown.\;

      // Construir contenido inicial del caché con todas las imágenes
      const initialContents = [];
      
      // Agregar system prompt
      initialContents.push({
        role: 'user',
        parts: [{ text: systemPrompt }]
      });
      
      initialContents.push({
        role: 'model',
        parts: [{ text: 'Entendido. Soy Dazly, especialista en edición precisa. Puedo ver y recordar todas las imágenes del proyecto. ¿Qué imagen quieres que edite?' }]
      });

      // 🔑 AGREGAR TODAS LAS IMÁGENES PREVIAS AL CACHÉ
      if (previousImages.length > 0) {
        console.log(\📸 Agregando \ imágenes al caché...\);
        
        for (let i = 0; i < previousImages.length; i++) {
          const img = previousImages[i];
          
          // Comprimir imagen si es muy grande
          const compressedBase64 = await this.compressImageBase64(img.base64Data);
          
          initialContents.push({
            role: 'user',
            parts: [
              { text: \Imagen \: \\ },
              {
                inlineData: {
                  mimeType: img.mimeType || 'image/jpeg',
                  data: compressedBase64
                }
              }
            ]
          });
          
          initialContents.push({
            role: 'model',
            parts: [{ text: \He guardado la imagen \ en mi memoria. Puedo referenciarla en ediciones futuras.\ }]
          });
        }
        
        console.log(\✅ \ imágenes agregadas al caché\);
      }

      // Crear caché en Gemini
      const cacheRequest = {
        model: \projects/\/locations/\/publishers/google/models/\\,
        displayName: \Dazly Visual Cache: \\,
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: initialContents,
        ttl: '3600s' // 1 hora
      };

      const response = await fetch(this.cacheURL, {
        method: 'POST',
        headers: {
          'Authorization': \Bearer \\,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cacheRequest)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error creando caché visual:', errorText);
        throw new Error(\Error creando caché: \\);
      }

      const cacheData = await response.json();
      console.log('✅ Caché visual creado:', cacheData.name);
      
      return {
        cacheId: cacheData.name,
        expiry: new Date(Date.now() + 3600000), // 1 hora
        imagesCount: previousImages.length
      };

    } catch (error) {
      console.error('❌ Error creando caché visual:', error.message);
      throw error;
    }
  }

  // 🆕 ANALIZAR IMAGEN CON CONTEXTO (usar caché)
  async analyzeImageWithContext(cacheId, newImage, prompt) {
    try {
      console.log(\👁️ Analizando imagen con contexto (caché: \)\);
      
      const accessToken = await this.getAccessToken();
      
      // Comprimir imagen nueva
      const compressedBase64 = await this.compressImageBase64(newImage.base64Data);
      
      const requestBody = {
        cachedContent: cacheId, // 🔑 Usa el caché con todas las imágenes previas
        contents: [{
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: newImage.mimeType || 'image/jpeg',
                data: compressedBase64
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.7, // Más preciso para ediciones
          topP: 0.95,
          maxOutputTokens: 2048
        }
      };

      const response = await fetch(this.visionURL, {
        method: 'POST',
        headers: {
          'Authorization': \Bearer \\,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error analizando imagen:', errorText);
        
        // Si el caché expiró, retornar null para recrearlo
        if (response.status === 404) {
          return null;
        }
        
        throw new Error(\Error análisis: \\);
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates[0]) {
        const text = data.candidates[0].content.parts.map(part => part.text).join('');
        
        console.log('✅ Análisis completado con contexto visual');
        
        return {
          success: true,
          analysis: text,
          usedCache: true
        };
      }

      throw new Error('Formato de respuesta inesperado');

    } catch (error) {
      console.error('❌ Error en análisis con contexto:', error.message);
      throw error;
    }
  }

  // 🆕 EDITAR IMAGEN PRECISA (mantener lo que no se menciona)
  async editImagePrecise(baseImage, editPrompt, options = {}) {
    try {
      console.log(\✏️ Editando imagen con prompt: "\..."\);
      
      const accessToken = await this.getAccessToken();

      // Prompt mejorado para edición precisa
      const precisePrompt = \EDICIÓN PRECISA: \. 
IMPORTANTE: Mantener TODO lo que NO se menciona en la instrucción. 
Solo modificar exactamente lo que se pide.\;

      const requestBody = {
        instances: [{
          prompt: precisePrompt,
          image: {
            bytesBase64Encoded: baseImage.base64Data
          }
        }],
        parameters: {
          sampleCount: 1,
          mode: 'edit', // Modo edición en lugar de generación
          editConfig: {
            editMode: 'inpainting', // Mantener partes no mencionadas
            guidanceScale: options.guidanceScale || 7.5,
            imageGuidanceScale: options.imageGuidanceScale || 2.0, // Alta fidelidad a imagen original
            numberOfSteps: options.steps || 30
          },
          safetyFilterLevel: 'block_some',
          personGeneration: 'allow_adult'
        }
      };

      const response = await fetch(this.editURL, {
        method: 'POST',
        headers: {
          'Authorization': \Bearer \\,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error editando imagen:', errorText);
        throw new Error(\Error edición: \\);
      }

      const data = await response.json();
      
      if (data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
        const editedBase64 = data.predictions[0].bytesBase64Encoded;
        const editedUrl = \data:image/png;base64,\\;
        
        console.log('✅ Imagen editada exitosamente');
        
        return {
          success: true,
          imageUrl: editedUrl,
          imageBase64: editedBase64,
          metadata: {
            originalPrompt: editPrompt,
            editMode: 'precise',
            model: this.editModel
          }
        };
      }

      throw new Error('No se pudo editar la imagen');

    } catch (error) {
      console.error('❌ Error en edición precisa:', error.message);
      throw error;
    }
  }

  // 🆕 WORKFLOW COMPLETO: Analizar + Editar con contexto
  async analyzeAndEdit(cacheId, currentImage, editPrompt, previousImages = []) {
    try {
      console.log('🎯 Iniciando workflow: Analizar + Editar');
      
      // PASO 1: Analizar con contexto de todas las imágenes previas
      let analysis = null;
      if (cacheId) {
        console.log('👁️ Analizando con caché visual...');
        analysis = await this.analyzeImageWithContext(cacheId, currentImage, 
          \Analiza esta imagen y explica qué cambios hacer para: \\
        );
        
        // Si el caché expiró, recrear
        if (!analysis) {
          console.log('🔄 Caché expirado, recreando...');
          const newCache = await this.createVisualCache('temp', previousImages);
          cacheId = newCache.cacheId;
          analysis = await this.analyzeImageWithContext(cacheId, currentImage, 
            \Analiza esta imagen y explica qué cambios hacer para: \\
          );
        }
      }

      // PASO 2: Editar imagen de forma precisa
      console.log('✏️ Editando imagen...');
      const editResult = await this.editImagePrecise(currentImage, editPrompt, {
        guidanceScale: 7.5,
        imageGuidanceScale: 2.5, // Alta fidelidad
        steps: 30
      });

      return {
        success: true,
        imageUrl: editResult.imageUrl,
        imageBase64: editResult.imageBase64,
        analysis: analysis?.analysis || 'Imagen editada según tu petición',
        usedCache: !!analysis?.usedCache,
        metadata: {
          ...editResult.metadata,
          hadAnalysis: !!analysis
        }
      };

    } catch (error) {
      console.error('❌ Error en workflow:', error.message);
      throw error;
    }
  }

  // Renovar caché antes de expirar
  async updateCache(cacheId) {
    try {
      const accessToken = await this.getAccessToken();
      
      const updateRequest = {
        ttl: '3600s'
      };

      const response = await fetch(\\/\\, {
        method: 'PATCH',
        headers: {
          'Authorization': \Bearer \\,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateRequest)
      });

      return response.ok;

    } catch (error) {
      console.error('Error renovando caché:', error);
      return false;
    }
  }

  // Limpiar caché
  async deleteCache(cacheId) {
    try {
      const accessToken = await this.getAccessToken();
      
      await fetch(\\/\\, {
        method: 'DELETE',
        headers: {
          'Authorization': \Bearer \\
        }
      });
      
      console.log('🗑️ Caché visual eliminado');
      return true;

    } catch (error) {
      console.error('Error eliminando caché:', error);
      return false;
    }
  }
}

module.exports = new ImageEditorService();
