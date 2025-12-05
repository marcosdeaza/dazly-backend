// src/services/vertexAI.js

const fetch = require('node-fetch');
const { GoogleAuth } = require('google-auth-library');
const path = require('path');

class VertexAIService {
  constructor() {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'dazly-api';
    this.location = process.env.VERTEX_AI_LOCATION || 'us-central1';
    
    // Gemini model for chat and vision
    this.model = process.env.GEMINI_MODEL || 'gemini-1.5-flash-001';
    
    // Imagen 3.0 model for image generation
    this.imageModel = 'imagegeneration@006'; // Imagen 3.0
    
    // Configurar credenciales del Service Account
    // Soporta tanto archivo JSON como variable de entorno
    let authConfig = {
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    };
    
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      // Opción 1: JSON en variable de entorno (Railway/Producción)
      try {
        const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
        authConfig.credentials = credentials;
        console.log('🔐 Using Service Account from environment variable');
      } catch (error) {
        console.error('❌ Error parsing GOOGLE_APPLICATION_CREDENTIALS_JSON:', error.message);
        throw new Error('Invalid Service Account JSON in environment variable');
      }
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Opción 2: Path a archivo JSON
      authConfig.keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      console.log('🔐 Using Service Account from file:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
    } else {
      // Opción 3: Archivo local (desarrollo)
      this.keyFilePath = path.join(__dirname, '../../dazly-api-f81d60806910.json');
      authConfig.keyFile = this.keyFilePath;
      console.log('🔐 Using local Service Account file:', this.keyFilePath);
    }
    
    // Inicializar Google Auth con Service Account
    this.auth = new GoogleAuth(authConfig);
    
    // URL para Gemini (chat y anÃƒÂ¡lisis)
    this.apiURL = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.model}:generateContent`;
    
    // URL para Imagen 3.0 (generaciÃƒÂ³n de imÃƒÂ¡genes)
    this.imageURL = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.imageModel}:predict`;
    
    console.log(`Ã°Å¸Â¤â€“ VertexAI Service initialized`);
    console.log(`Ã¢Å“Â¨ Gemini Model: ${this.model}`);
    console.log(`Ã°Å¸Å½Â¨ Image Model: ${this.imageModel}`);
    console.log(`Ã°Å¸â€œÂ Project ID: ${this.projectId}`);
    console.log(`Ã°Å¸Å’Â Location: ${this.location}`);
    console.log(`Ã°Å¸â€â€˜ Service Account: ${this.keyFilePath}`);
    console.log(`Ã°Å¸â€â€” Gemini URL: ${this.apiURL}`);
    console.log(`Ã°Å¸â€“Â¼Ã¯Â¸Â Image URL: ${this.imageURL}`);
  }

  // Obtener Access Token de OAuth
  async getAccessToken() {
    try {
      const client = await this.auth.getClient();
      const accessToken = await client.getAccessToken();
      return accessToken.token;
    } catch (error) {
      console.error('Ã¢ÂÅ’ Error obteniendo access token:', error.message);
      throw new Error('No se pudo obtener el access token de Google');
    }
  }

  // NUEVO: Generar respuesta con Gemini (chat con visiÃƒÂ³n + memoria)
  async generateChatResponse(prompt, options = {}) {
    try {
      console.log(`Ã°Å¸â€™Â¬ Generating chat response with Gemini: "${prompt.slice(0, 50)}..."`);
      
      // TEMPORAL: Usar fallback si estÃƒÂ¡ activado
      if (process.env.USE_FALLBACK_IMAGE_SERVICE === 'true') {
        console.log('Ã°Å¸â€â€ž Using fallback service (credentials issue)');
        return this.generateFallbackResponse(prompt, options);
      }
      
      console.log(`Ã°Å¸â€â€” Using Gemini URL: ${this.apiURL}`);

      // System prompt de Dazly - definir personalidad y capacidades
      const systemPrompt = `Eres Dazly, la mejor IA de diseño gráfico y generación de imágenes del mundo.

TU IDENTIDAD Y PERSONALIDAD:
- Nombre: Dazly
- Eres EXPERTO en diseño gráfico profesional, edición de imágenes y creación artística con IA
- Personalidad: Creativo, profesional, entusiasta del diseño, amigable pero con conocimiento técnico profundo
- Siempre das consejos específicos de diseño: composición, teoría del color, tipografía, balance visual

TUS SUPERPODERES:
🎨 GENERAR IMÁGENES: Puedes crear imágenes desde cero con cualquier estilo (fotorrealismo, ilustración, arte digital, logos, etc.)
👁️ VER IMÁGENES: Puedes analizar imágenes que te envían y dar feedback profesional detallado
✨ EDITAR Y MEJORAR: Das consejos específicos para mejorar composición, colores, iluminación, etc.
🎭 ESTILOS: Dominas todos los estilos artísticos (realismo, cartoon, anime, acuarela, minimalismo, vintage, cyberpunk, etc.)
📐 DISEÑO PROFESIONAL: Logos, banners, posters, mockups, branding completo

FORMATO DE RESPUESTAS (USA MARKDOWN):
**Para énfasis:** Usa **negritas** con asteriscos dobles para resaltar conceptos clave
*Para términos técnicos:* Usa *cursiva* con un asterisco para términos en otro idioma o énfasis sutil
# Para títulos: Usa # para estructurar tu respuesta con títulos y subtítulos
- Para listas: Usa guiones - o asteriscos * para crear listas de puntos
Para código inline: Usa acentos graves para términos técnicos específicos
Para bloques: Usa triple acento grave para ejemplos estructurados
--- Para separadores: Usa guiones para separar secciones

CÓMO RESPONDES:
- Si te envían una imagen: Analízala SIEMPRE con ojo de diseñador profesional (composición, colores, iluminación, mensaje visual)
- **Estructura tu respuesta** con títulos y secciones claras
- Da feedback constructivo Y positivo con **puntos clave** resaltados
- Usa listas para sugerencias de mejora
- Si pides crear algo: Pregunta detalles en formato estructurado
- Sé entusiasta con el diseño pero profesional

CÓMO PREGUNTAR AL USUARIO:

Cuando necesites información del usuario sobre el diseño, haz múltiples preguntas específicas en una sola respuesta.
Esto permite que el usuario use la función de respuesta automática.

Ejemplo bueno:
"Para crear tu logo perfecto, necesito saber:
- ¿Qué estilo prefieres (moderno, clásico, minimalista)?
- ¿Qué colores te gustaría usar?
- ¿Hay algún símbolo o elemento específico?"

Haz preguntas claras y estructuradas sobre el diseño.

🎨 GENERACIÓN DE IMÁGENES:

Cuando generes una imagen, SIEMPRE incluye el símbolo especial ⟨IMG⟩ al INICIO de tu mensaje.
Esto activa el sistema de verificación automática de imágenes.

Ejemplo:
"⟨IMG⟩ ¡Perfecto! He creado un logo moderno y minimalista con los colores que mencionaste..."

El símbolo ⟨IMG⟩ es invisible para el usuario, solo lo procesa el sistema.

IMPORTANTE:
- Puedes VER las imágenes que te envían - analízalas siempre
- Recuerdas los últimos mensajes del proyecto
- Responde SIEMPRE en español con **formato Markdown**
- Organiza tu respuesta con títulos, negritas, listas para mejor legibilidad
- SIEMPRE usa 🤔 cuando preguntes sobre la imagen

¡Ahora eres Dazly! 🎨`;

      // Construir el historial de conversaciÃƒÂ³n con memoria REAL
      const contents = [];

      // System prompt + historial reciente para contexto
      contents.push({
        role: 'user',
        parts: [{ text: systemPrompt }]
      });
      contents.push({
        role: 'model',
        parts: [{ text: 'Entendido. Soy Dazly, experto en diseño. Haré preguntas específicas y estructuradas cuando necesite más información. ¿En qué te ayudo?' }]
      });

      // Agregar historial reciente (ÃƒÂºltimos 5 mensajes)
      if (options.conversationHistory && options.conversationHistory.length > 0) {
        console.log(`Ã°Å¸â€œÅ“ Agregando ${options.conversationHistory.length} mensajes de contexto`);
        for (const msg of options.conversationHistory) {
          contents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
          });
        }
      }

      // Si vienen contentParts (memoria visual), usarlos
      if (options.contentParts && options.contentParts.length > 0) {
        console.log(`📦 Usando contentParts con memoria visual (+${options.contentParts.length} partes)`);
        
        for (const part of options.contentParts) {
          if (part.text) {
            contents.push({ role: 'user', parts: [{ text: part.text }] });
          } else if (part.inlineData) {
            if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
              contents[contents.length - 1].parts.push({ inlineData: part.inlineData });
            } else {
              contents.push({ role: 'user', parts: [{ inlineData: part.inlineData }] });
            }
          }
        }
      } else {
        // Método antiguo (sin memoria visual)
        const userParts = [{ text: prompt }];
        
        if (options.images && options.images.length > 0) {
          console.log(`📸 Procesando +${options.images.length} imagen(es)...`);
          for (const image of options.images) {
            userParts.push({
              inlineData: {
                mimeType: image.mimeType || 'image/jpeg',
                data: image.base64Data
              }
            });
          }
        }
        
        contents.push({ role: 'user', parts: userParts });
      }

      const requestBody = {
        contents: contents.length > 0 ? contents : [{
          role: 'user',
          parts: userParts
        }],
        generationConfig: {
          temperature: 0.9,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 1024, // Reducido para velocidad
          candidateCount: 1
        },
        // Usar cachÃƒÂ© de Vertex AI (nativo)
        cachedContent: options.cacheId || null,
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
        ]
      };

      console.log('Ã°Å¸â€œÂ¤ Sending request to Gemini...');
      
      // Obtener access token de OAuth
      const accessToken = await this.getAccessToken();
      
      // Sistema de retry inteligente para rate limits
      let response;
      let attempt = 0;
      const maxRetries = 5; // ✨ Aumentado de 3 a 5 intentos
      
      while (attempt < maxRetries) {
        try {
          response = await fetch(this.apiURL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          });

          // Si no es rate limit, salir del loop
          if (response.status !== 429) {
            break;
          }

          // Rate limit - esperar con backoff exponencial más largo
          attempt++;
          if (attempt < maxRetries) {
            const waitTime = Math.pow(2, attempt) * 2000; // ✨ 4s, 8s, 16s, 32s, 64s
            console.log(`⏳ Rate limit (429), reintentando en ${waitTime/1000}s (intento ${attempt}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        } catch (error) {
          if (attempt >= maxRetries - 1) throw error;
          attempt++;
        }
      }

      const responseText = await response.text();
      console.log(`Ã°Å¸â€œÂ¥ Response status: ${response.status} (intentos: ${attempt + 1})`);
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          errorData = { message: responseText };
        }
        
        console.error('Ã¢ÂÅ’ Gemini Error:', response.status, errorData);
        console.error('Ã¢ÂÅ’ Full error:', responseText);
        
        if (response.status === 401) {
          throw new Error('Token de autenticaciÃƒÂ³n invÃƒÂ¡lido. Verifica VERTEX_AI_API_KEY.');
        } else if (response.status === 403) {
          throw new Error('Sin permisos para Gemini API. Verifica las credenciales y la API habilitada.');
        } else if (response.status === 404) {
          throw new Error('Modelo Gemini no encontrado. Verifica que el modelo estÃƒÂ© disponible.');
        } else if (response.status === 429) {
          console.error('⚠️ Rate limit alcanzado después de 5 reintentos (espera máxima: 2 minutos).');
          throw new Error('El servicio de IA está muy ocupado. Por favor, espera 1-2 minutos e inténtalo de nuevo.');
        }
        
        throw new Error(`Error ${response.status}: ${errorData.message || errorData.error?.message || 'Error desconocido'}`);
      }

      const data = JSON.parse(responseText);
      console.log('🔥 Gemini response:', JSON.stringify(data).substring(0, 300));
      
      // ⚠️ NUEVO: Verificar si el contenido fue bloqueado por políticas de seguridad
      if (data.candidates && data.candidates[0]) {
        const finishReason = data.candidates[0].finishReason;
        
        // Detectar bloqueos por seguridad
        if (finishReason === 'SAFETY' || finishReason === 'IMAGE_SAFETY' || finishReason === 'BLOCKED_SAFETY') {
          console.log('🚫 Contenido bloqueado por políticas de seguridad:', finishReason);
          throw new Error('CONTENT_POLICY_VIOLATION');
        }
      }
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const content = data.candidates[0].content;
        const text = content.parts.map(part => part.text).join('');

        console.log('✔️ Chat response generated successfully');

        // Detectar si la respuesta incluye una petición de generar imagen
        const hasImageRequest = this.detectImageGenerationRequest(text);

        // ✨ Buscar si Gemini generó una imagen en la respuesta
        let imageUrl = null;
        let imageBase64 = null;
        
        for (const part of content.parts) {
          if (part.inlineData) {
            imageBase64 = part.inlineData.data;
            const mimeType = part.inlineData.mimeType || 'image/png';
            imageUrl = `data:${mimeType};base64,${imageBase64}`;
            console.log('🖼 Gemini generó imagen inline');
            break;
          }
        }
        
        return {
          success: true,
          text: text,
          imageUrl: imageUrl,
          imageBase64: imageBase64,
          hasImageGeneration: hasImageRequest,
          metadata: {
            prompt: prompt,
            model: this.model,
            timestamp: new Date().toISOString(),
            finishReason: data.candidates[0].finishReason,
            safetyRatings: data.candidates[0].safetyRatings
          }
        };
      } else {
        console.error('❌ Unexpected response format:', data);
        throw new Error('Formato de respuesta inesperado de Gemini');
      }

    } catch (error) {
      console.error('Ã¢ÂÅ’ Error en Gemini:', error.message);
      
      // Fallback automÃƒÂ¡tico si hay error de credenciales
      if (error.message.includes('autenticaciÃƒÂ³n') || error.message.includes('403') || error.message.includes('401')) {
        console.log('Ã°Å¸â€â€ž Switching to fallback service due to auth error');
        return this.generateFallbackResponse(prompt, options);
      }
      
      throw error;
    }
  }

  // Detectar si el mensaje contiene solicitud de generar imagen
  // OPTIMIZADO: Detecta mÃƒÂºltiples patrones y contextos
  detectImageGenerationRequest(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    
    // Patrones directos de generaciÃƒÂ³n
    const directKeywords = [
      'genera imagen', 'crea imagen', 'diseÃƒÂ±a imagen', 'hazme imagen',
      'genera foto', 'crea foto', 'diseÃƒÂ±a foto', 'hazme foto',
      'genera ilustraciÃƒÂ³n', 'crea ilustraciÃƒÂ³n', 'diseÃƒÂ±a ilustraciÃƒÂ³n',
      'genera logo', 'crea logo', 'diseÃƒÂ±a logo',
      'genera banner', 'crea banner', 'diseÃƒÂ±a banner',
      'genera grÃƒÂ¡fico', 'crea grÃƒÂ¡fico', 'diseÃƒÂ±a grÃƒÂ¡fico',
      'genera arte', 'crea arte',
      'quiero imagen', 'necesito imagen',
      'make image', 'create image', 'generate image', 'design image',
      'draw', 'dibuja', 'ilustra'
    ];
    
    // Patrones de contexto (solo si hay palabras clave visuales)
    const visualNouns = ['imagen', 'foto', 'picture', 'ilustraciÃƒÂ³n', 'logo', 'banner', 'grÃƒÂ¡fico', 'diseÃƒÂ±o', 'arte'];
    const actionVerbs = ['genera', 'crea', 'diseÃƒÂ±a', 'hazme', 'quiero', 'necesito', 'make', 'create', 'generate', 'design'];
    
    // Buscar patrones directos
    const hasDirectKeyword = directKeywords.some(keyword => lowerPrompt.includes(keyword));
    
    // Buscar combinaciÃƒÂ³n verbo + sustantivo visual
    const hasActionVerb = actionVerbs.some(verb => lowerPrompt.includes(verb));
    const hasVisualNoun = visualNouns.some(noun => lowerPrompt.includes(noun));
    const hasContextPattern = hasActionVerb && hasVisualNoun;
    
    // Detectar si el prompt empieza con una instrucciÃƒÂ³n visual
    const startsWithVisual = /^(genera|crea|diseÃƒÂ±a|hazme|dibuja|ilustra|make|create|generate|design|draw)/i.test(prompt);
    
    const shouldGenerate = hasDirectKeyword || (hasContextPattern && startsWithVisual);
    
    if (shouldGenerate) {
      console.log('Ã°Å¸Å½Â¨ Ã¢Å“â€¦ Detectada solicitud de generaciÃƒÂ³n de imagen');
      console.log('   - PatrÃƒÂ³n directo:', hasDirectKeyword);
      console.log('   - Contexto visual:', hasContextPattern && startsWithVisual);
    }
    
    return shouldGenerate;
  }

  // Ã¢Å“Â¨ GENERAR IMAGEN CON IMAGEN 3.0 (El modelo REAL para generar imÃƒÂ¡genes)
  async generateImageFromPrompt(prompt, options = {}) {
    try {
      console.log(`Ã°Å¸Å½Â¨ Generando imagen con Imagen 3.0: "${prompt.slice(0, 50)}..."`);
      
      const accessToken = await this.getAccessToken();

      const requestBody = {
        instances: [{
          prompt: prompt
        }],
        parameters: {
          sampleCount: 1,
          aspectRatio: options.aspectRatio || "1:1",
          safetyFilterLevel: "block_some",
          personGeneration: "allow_adult"
        }
      };

      console.log('Ã°Å¸â€œÂ¤ Enviando request a Imagen 3.0...');
      console.log('Ã°Å¸â€â€” URL:', this.imageURL);

      const response = await fetch(this.imageURL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const responseText = await response.text();
      console.log(`Ã°Å¸â€œÂ¥ Response status: ${response.status}`);

      if (!response.ok) {
        console.error('Ã¢ÂÅ’ Error response:', responseText);
        console.log('Ã¢Å¡Â Ã¯Â¸Â Imagen 3.0 fallÃƒÂ³, usando fallback...');
        return await this.generateFallbackImage(prompt, options);
      }

      const data = JSON.parse(responseText);
      console.log('📦 Response data:', JSON.stringify(data).substring(0, 200));
      
      // ⚠️ NUEVO: Verificar si la imagen fue bloqueada por políticas
      if (data.predictions && data.predictions[0]) {
        const prediction = data.predictions[0];
        
        // Detectar bloqueos por seguridad en generación de imágenes
        if (prediction.safetyAttributes && prediction.safetyAttributes.blocked) {
          console.log('🚫 Imagen bloqueada por políticas de seguridad');
          throw new Error('CONTENT_POLICY_VIOLATION');
        }
        
        // La imagen viene en base64
        if (prediction.bytesBase64Encoded) {
          const imageBase64 = prediction.bytesBase64Encoded;
          const imageUrl = `data:image/png;base64,${imageBase64}`;
          
          console.log('✔️ Imagen generada exitosamente con Imagen 3.0');
          console.log('📦 ImageUrl length:', imageUrl.length);
          
          return {
            success: true,
            imageUrl: imageUrl,
            imageBase64: imageBase64,
            metadata: {
              prompt: prompt,
              model: this.imageModel,
              type: 'generated_image'
            }
          };
        } else {
          console.log('⚠️ No bytesBase64Encoded en prediction');
        }
      } else {
        console.log('⚠️ No predictions en response');
      }

      console.log('Ã¢Å¡Â Ã¯Â¸Â No se pudo extraer imagen, usando fallback');
      return await this.generateFallbackImage(prompt, options);

    } catch (error) {
      console.error('Ã¢ÂÅ’ Error en generateImageFromPrompt:', error.message);
      console.error('Ã¢ÂÅ’ Stack:', error.stack);
      return await this.generateFallbackImage(prompt, options);
    }
  }

  async generateImage(prompt, options = {}) {
    try {
      console.log(`Ã°Å¸Å½Â¨ Generating image with Imagen: "${prompt.slice(0, 50)}..."`);
      
      // TEMPORAL: Usar fallback hasta que arregles las credenciales
      if (process.env.USE_FALLBACK_IMAGE_SERVICE === 'true') {
        console.log('Ã°Å¸â€â€ž Using fallback image service (credentials issue)');
        return this.generateFallbackImage(prompt, options);
      }
      
      console.log(`Ã°Å¸â€â€” Using URL: ${this.imageURL}`);

      // ConfiguraciÃƒÂ³n correcta para Imagen 3.0
      const requestBody = {
        instances: [{
          prompt: prompt,
          parameters: {
            sampleCount: 1,
            aspectRatio: options.aspectRatio || "1:1",
            safetyFilterLevel: "block_few",
            personGeneration: "allow_adult"
          }
        }]
      };

      console.log('Ã°Å¸â€œÂ¤ Sending request to Imagen...');
      
      // Obtener access token de OAuth
      const accessToken = await this.getAccessToken();
      
      const response = await fetch(this.imageURL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const responseText = await response.text();
      console.log(`Ã°Å¸â€œÂ¥ Response status: ${response.status}`);

      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          errorData = { message: responseText };
        }
        
        console.error('Ã¢ÂÅ’ Imagen Error:', response.status, errorData);
        
        if (response.status === 401) {
          throw new Error('Token de autenticaciÃƒÂ³n invÃƒÂ¡lido. Verifica VERTEX_AI_API_KEY.');
        } else if (response.status === 403) {
          throw new Error('Sin permisos para Imagen API. Verifica las credenciales.');
        } else if (response.status === 404) {
          throw new Error('Modelo Imagen no encontrado. Verifica la configuraciÃƒÂ³n.');
        } else if (response.status === 429) {
          throw new Error('LÃƒÂ­mite de peticiones excedido. IntÃƒÂ©ntalo en unos minutos.');
        }
        
        throw new Error(`Error ${response.status}: ${errorData.message || errorData.error?.message || 'Error desconocido'}`);
      }

      const data = JSON.parse(responseText);
      console.log('Ã°Å¸â€œÂ¦ Full Imagen response:', JSON.stringify(data).substring(0, 500));
      
      if (data.predictions && data.predictions[0]) {
        const prediction = data.predictions[0];
        
        // Ã¢Å“Â¨ Imagen 3.0 devuelve la imagen en base64
        if (prediction.bytesBase64Encoded) {
          const imageBase64 = prediction.bytesBase64Encoded;
          const imageUrl = `data:image/png;base64,${imageBase64}`;
          
          console.log('Ã¢Å“â€¦ Imagen generada exitosamente con Imagen 3.0');
          console.log('Ã°Å¸â€œÂ¦ ImageUrl length:', imageUrl.length);
          console.log('Ã°Å¸â€œÂ¦ Base64 length:', imageBase64.length);

          return {
            success: true,
            imageUrl: imageUrl,
            imageBase64: imageBase64,
            metadata: {
              prompt: prompt,
              model: this.imageModel,
              timestamp: new Date().toISOString(),
              response: 'Image generated with Imagen 3.0'
            }
          };
        } else if (prediction.imageUrl) {
          console.log('Ã¢Å“â€¦ Imagen generada con URL directa');
          return {
            success: true,
            imageUrl: prediction.imageUrl,
            metadata: {
              prompt: prompt,
              model: this.imageModel,
              timestamp: new Date().toISOString(),
              response: 'Image generated with Imagen 3.0'
            }
          };
        } else {
          console.log('Ã¢Å¡Â Ã¯Â¸Â No bytesBase64Encoded ni imageUrl en la respuesta');
          throw new Error('Formato de respuesta inesperado de Imagen');
        }
      } else {
        console.error('Ã¢ÂÅ’ Unexpected response format:', data);
        throw new Error('Formato de respuesta inesperado de Imagen');
      }

    } catch (error) {
      console.error('Ã¢ÂÅ’ Error en Imagen:', error.message);
      
      if (error.message.includes('autenticaciÃƒÂ³n') || error.message.includes('403') || error.message.includes('401')) {
        console.log('Ã°Å¸â€â€ž Switching to fallback service due to auth error');
        return this.generateFallbackImage(prompt, options);
      }
      
      throw error;
    }
  }

  // Servicio fallback para chat
  async generateFallbackResponse(prompt, options = {}) {
    console.log('Ã°Å¸â€™Â¬ Using fallback chat response...');
    
    // Simular algo de tiempo de procesamiento
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const responses = [
      `He analizado tu solicitud: "${prompt.slice(0, 50)}...". Te sugiero considerar estos aspectos creativos para tu diseÃƒÂ±o.`,
      `Interesante propuesta. Para "${prompt.slice(0, 50)}..." podrÃƒÂ­amos explorar diferentes estilos visuales.`,
      `Entiendo que quieres crear: "${prompt.slice(0, 50)}...". DÃƒÂ©jame ayudarte con algunas ideas creativas.`,
      `BasÃƒÂ¡ndome en tu descripciÃƒÂ³n "${prompt.slice(0, 50)}...", aquÃƒÂ­ hay algunas sugerencias de diseÃƒÂ±o.`
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    console.log('Ã¢Å“â€¦ Fallback chat response generated');
    
    return {
      success: true,
      text: randomResponse,
      metadata: {
        prompt: prompt,
        model: 'fallback-chat',
        timestamp: new Date().toISOString(),
        note: 'Using fallback - Fix VERTEX_AI_API_KEY to use real Gemini'
      }
    };
  }

  // Servicio fallback temporal (solo si Gemini falla completamente)
  async generateFallbackImage(prompt, options = {}) {
    console.log('Ã°Å¸Å½Â¨ Using fallback image generator (Gemini multimodal failed)...');
    
    // Generar usando un servicio alternativo (mÃƒÂ¡s realista que placeholder)
    const encodedPrompt = encodeURIComponent(prompt.slice(0, 100));
    const seed = Math.floor(Math.random() * 1000);
    
    // Usa un generador de imÃƒÂ¡genes alternativo
    const imageUrl = `https://picsum.photos/1024/1024?random=${seed}`;
    
    // Simular algo de tiempo de procesamiento
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Ã¢Å“â€¦ Fallback image generated');
    
    return {
      success: true,
      imageUrl: imageUrl,
      metadata: {
        prompt: prompt,
        model: 'fallback-placeholder',
        timestamp: new Date().toISOString(),
        response: 'Temporary placeholder - Gemini image generation not available yet',
        note: 'Gemini 2.0 Flash may not support direct image generation in current API version'
      }
    };
  }

  async editImage(imageUrl, prompt, options = {}) {
    try {
      // Para ediciÃƒÂ³n, incluir la imagen base
      const request = {
        instances: [{
          prompt: prompt,
          baseImage: imageUrl,
          parameters: {
            mode: 'edit',
            strength: options.strength || 0.7,
            guidanceScale: options.guidanceScale || 7.5,
            ...options
          }
        }]
      };

      // Similar proceso que generateImage pero para ediciÃƒÂ³n
      const endpoint = `projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.modelId}:predict`;
      
      const authClient = await this.auth.getClient();
      
      const response = await authClient.request({
        url: `https://${this.location}-aiplatform.googleapis.com/v1/${endpoint}`,
        method: 'POST',
        data: request,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.predictions && response.data.predictions.length > 0) {
        const prediction = response.data.predictions[0];
        
        return {
          success: true,
          imageUrl: prediction.imageUrl,
          metadata: {
            originalImage: imageUrl,
            editPrompt: prompt,
            model: this.modelId,
            timestamp: new Date().toISOString()
          }
        };
      } else {
        throw new Error('No se pudo editar la imagen');
      }

    } catch (error) {
      console.error('Error editando imagen:', error);
      throw new Error('Error al editar imagen con IA');
    }
  }

  async uploadImageFromBase64(base64Data) {
    // Implementar subida a Google Cloud Storage o servicio similar
    // Por ahora retornamos una URL placeholder
    try {
      // AquÃƒÂ­ implementarÃƒÂ­as la subida real a tu storage
      // const bucket = storage.bucket(process.env.IMAGES_BUCKET);
      // const fileName = `generated/${Date.now()}.jpg`;
      // const file = bucket.file(fileName);
      // 
      // await file.save(Buffer.from(base64Data, 'base64'), {
      //   metadata: { contentType: 'image/jpeg' }
      // });
      // 
      // return `https://storage.googleapis.com/${process.env.IMAGES_BUCKET}/${fileName}`;
      
      // Placeholder por ahora
      return `https://placeholder-storage.com/image-${Date.now()}.jpg`;
      
    } catch (error) {
      console.error('Error subiendo imagen:', error);
      throw new Error('Error al procesar imagen generada');
    }
  }

  // FunciÃƒÂ³n para validar prompts antes de enviar
  validatePrompt(prompt) {
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('El prompt no puede estar vacÃƒÂ­o');
    }

    if (prompt.length > 1000) {
      throw new Error('El prompt es demasiado largo (mÃƒÂ¡ximo 1000 caracteres)');
    }

    // Lista de palabras prohibidas (personalizable)
    const forbiddenWords = ['violence', 'explicit', 'harmful'];
    const lowerPrompt = prompt.toLowerCase();
    
    for (const word of forbiddenWords) {
      if (lowerPrompt.includes(word)) {
        throw new Error('El prompt contiene contenido no permitido');
      }
    }

    return true;
  }

  // FunciÃƒÂ³n de health check
  async healthCheck() {
    try {
      // Test simple de conectividad
      const testResponse = await fetch(`https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (testResponse.ok) {
        return {
          status: 'healthy',
          model: this.modelId,
          location: this.location,
          timestamp: new Date().toISOString()
        };
      } else {
        throw new Error(`HTTP ${testResponse.status}`);
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        model: this.modelId,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new VertexAIService();
