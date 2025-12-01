// src/services/visualMemory.js
// 🧠 SISTEMA ULTRA INTELIGENTE DE MEMORIA VISUAL
// Version 2.0 - Detección automática, multiidioma, contexto predictivo

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class VisualMemoryService {
  
  /**
   * 🎯 MEMORIA VISUAL ULTRA INTELIGENTE
   * Siempre obtiene las últimas 5 imágenes del usuario + 1 de IA
   * NO es selectivo - SIEMPRE carga el contexto visual completo
   */
  async getVisualContext(projectId, maxImages = 5) {
    console.log('🧠 [Memoria Ultra] Obteniendo TODAS las imágenes del usuario...');
    console.log(`   Proyecto: ${projectId}`);

    const messages = await prisma.message.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 200 // Buscar en más mensajes para asegurar obtener todas las imágenes
    });

    console.log(`📚 [Memoria Ultra] ${messages.length} mensajes analizados`);

    const visualHistory = [];
    const seenHashes = new Set();

    // ⭐ PASO 1: Última imagen generada por IA (para edición)
    let lastAIImage = null;
    for (const msg of messages) {
      if (msg.role === 'assistant' && msg.imageUrl) {
        const base64Data = this.extractBase64(msg.imageUrl);
        if (base64Data) {
          lastAIImage = {
            type: 'ai_generated',
            url: msg.imageUrl,
            base64Data: base64Data,
            mimeType: 'image/png',
            prompt: msg.imagePrompt || msg.content,
            createdAt: msg.createdAt,
            messageId: msg.id,
            priority: 1,
            detectedElements: await this.analyzeImageContent(base64Data, msg.content)
          };
          console.log('🎨 [Memoria Ultra] Última imagen IA: detectados', lastAIImage.detectedElements);
          visualHistory.push(lastAIImage);
          break;
        }
      }
    }

    // ⭐ PASO 2: TODAS las últimas imágenes del usuario (hasta 5)
    const userImages = [];
    for (const msg of messages) {
      if (msg.role === 'user' && msg.uploadedImages) {
        try {
          const images = JSON.parse(msg.uploadedImages);
          if (Array.isArray(images)) {
            for (const img of images) {
              const hash = img.base64Data?.substring(0, 100);
              if (!seenHashes.has(hash) && img.base64Data) {
                seenHashes.add(hash);
                
                // Analizar contenido de la imagen
                const detectedElements = await this.analyzeImageContent(img.base64Data, msg.content);
                
                userImages.push({
                  type: 'user_uploaded',
                  base64Data: img.base64Data,
                  mimeType: img.mimeType || 'image/jpeg',
                  uploadedAt: msg.createdAt,
                  messageId: msg.id,
                  userPrompt: msg.content,
                  priority: 2,
                  fileName: img.name || `image_${userImages.length + 1}`,
                  detectedElements: detectedElements
                });
                
                console.log(`📸 [Memoria Ultra] Imagen usuario ${userImages.length}: ${detectedElements.join(', ')}`);
                
                if (userImages.length >= maxImages) break;
              }
            }
          }
        } catch (e) {
          console.warn('⚠️ Error parseando uploadedImages:', e.message);
        }
      }
      if (userImages.length >= maxImages) break;
    }

    visualHistory.push(...userImages);

    console.log(`✅ [Memoria Ultra] Contexto COMPLETO construido:`);
    console.log(`   - Total imágenes: ${visualHistory.length}`);
    console.log(`   - Imágenes IA: ${lastAIImage ? 1 : 0}`);
    console.log(`   - Imágenes Usuario: ${userImages.length}`);
    console.log(`   - Elementos detectados: ${this.getAllDetectedElements(visualHistory)}`);

    return {
      images: visualHistory,
      lastAIImage: lastAIImage,
      userImages: userImages,
      totalImages: visualHistory.length,
      hasAIImage: !!lastAIImage,
      hasUserImages: userImages.length > 0,
      detectedElements: this.getAllDetectedElements(visualHistory),
      contextSummary: this.buildContextSummary(visualHistory)
    };
  }

  /**
   * 🔍 ANÁLISIS AUTOMÁTICO DE CONTENIDO
   * Detecta: personas, productos, objetos, texto, estilo
   */
  async analyzeImageContent(base64Data, prompt = '') {
    const elements = new Set();
    const text = prompt.toLowerCase();

    // Detectar por palabras clave en el prompt
    const detectionRules = {
      'person': ['persona', 'chico', 'chica', 'hombre', 'mujer', 'niño', 'niña', 'gente', 'rostro', 'cara', 'people', 'person', 'man', 'woman', 'face', 'portrait'],
      'product': ['producto', 'café', 'bebida', 'comida', 'botella', 'taza', 'vaso', 'coche', 'auto', 'carro', 'zapato', 'ropa', 'vestido', 'camisa', 'product', 'coffee', 'drink', 'food', 'bottle', 'cup', 'car', 'shoe', 'dress', 'shirt'],
      'logo': ['logo', 'marca', 'brand', 'logotipo', 'icono', 'símbolo', 'icon', 'symbol'],
      'text': ['texto', 'letras', 'palabras', 'escrito', 'frase', 'text', 'letters', 'words', 'written'],
      'background': ['fondo', 'background', 'backdrop', 'escenario', 'ambiente'],
      'object': ['objeto', 'cosa', 'elemento', 'object', 'thing', 'item', 'furniture', 'mueble'],
      'animal': ['perro', 'gato', 'mascota', 'animal', 'dog', 'cat', 'pet'],
      'building': ['edificio', 'casa', 'construcción', 'arquitectura', 'building', 'house', 'architecture'],
      'nature': ['naturaleza', 'árbol', 'planta', 'flor', 'paisaje', 'montaña', 'nature', 'tree', 'plant', 'flower', 'landscape', 'mountain']
    };

    for (const [category, keywords] of Object.entries(detectionRules)) {
      if (keywords.some(kw => text.includes(kw))) {
        elements.add(category);
      }
    }

    // Si no detectamos nada, asumir que es imagen general
    if (elements.size === 0) {
      elements.add('general_image');
    }

    return Array.from(elements);
  }

  /**
   * 📊 OBTENER TODOS LOS ELEMENTOS DETECTADOS
   */
  getAllDetectedElements(visualHistory) {
    const allElements = new Set();
    visualHistory.forEach(img => {
      if (img.detectedElements) {
        img.detectedElements.forEach(el => allElements.add(el));
      }
    });
    return Array.from(allElements).join(', ');
  }

  /**
   * 📝 CONSTRUIR RESUMEN DEL CONTEXTO
   */
  buildContextSummary(visualHistory) {
    const summary = {
      totalImages: visualHistory.length,
      hasAI: visualHistory.some(img => img.type === 'ai_generated'),
      hasUser: visualHistory.some(img => img.type === 'user_uploaded'),
      elements: this.getAllDetectedElements(visualHistory),
      latestPrompt: visualHistory[0]?.userPrompt || visualHistory[0]?.prompt || ''
    };
    return summary;
  }

  /**
   * 🤖 DETECCIÓN ULTRA INTELIGENTE DE INTENCIÓN
   * Detecta edición aunque esté mal escrito o en otro idioma
   * SIEMPRE usa contexto si hay imágenes disponibles (80-90% edición)
   */
  shouldUseVisualContext(prompt, hasContext) {
    if (!hasContext) {
      console.log('❌ [Intención] Sin contexto disponible');
      return false;
    }

    const text = prompt.toLowerCase().trim();
    
    // 🔴 SOLO rechazar si es EXPLÍCITAMENTE nueva generación
    const explicitNewGeneration = [
      /^(genera|crea|diseña|make|create|design|generate)\s+(un|una|a|an)\s+(nuevo|nueva|new)/i,
      /^(genera|crea|diseña|make|create|design|generate)\s+(un|una|a|an)\s+(?!la|el|las|los|the|this|that)/i,
      /from scratch/i,
      /desde cero/i,
      /completamente nuevo/i,
      /brand new/i,
      /nueva imagen/i,
      /new image/i
    ];

    const isExplicitNew = explicitNewGeneration.some(regex => regex.test(text));
    
    if (isExplicitNew) {
      console.log('🆕 [Intención] Nueva generación EXPLÍCITA detectada');
      return false;
    }

    // ✅ TODO LO DEMÁS es edición (80-90% de los casos)
    const editIndicators = [
      // Español
      'anterior', 'ultima', 'misma', 'imagen', 'foto', 'esta', 'ese', 'esa',
      'cambia', 'modifica', 'edita', 'ajusta', 'mejora', 'arregla', 'corrige',
      'añade', 'agrega', 'pon', 'ponle', 'ponlo', 'ponla', 'pon', 'añadele',
      'quita', 'elimina', 'remueve', 'borra', 'saca',
      'ahora', 'pero', 'también', 'además', 'y ahora', 'y también',
      'mantén', 'conserva', 'preserva', 'deja', 'guarda',
      'español', 'inglés', 'traduce', 'traducelo', 'traducir',
      'fondo', 'persona', 'producto', 'objeto', 'texto', 'logo', 'color',
      'más', 'menos', 'mejor', 'peor', 'diferente', 'otro', 'otra',
      'sin', 'con', 'que tenga', 'que no tenga',
      'hazlo', 'hazla', 'haz que', 'has que', 'haz lo',
      'solo', 'solamente', 'únicamente', 'nada más',
      // English
      'previous', 'last', 'same', 'that', 'this', 'the image', 'the photo',
      'change', 'modify', 'edit', 'adjust', 'improve', 'fix', 'correct',
      'add', 'put', 'insert', 'include',
      'remove', 'delete', 'erase', 'take out',
      'now', 'but', 'also', 'and now', 'and also',
      'keep', 'maintain', 'preserve', 'leave',
      'spanish', 'english', 'translate',
      'background', 'person', 'product', 'object', 'text', 'logo', 'color',
      'more', 'less', 'better', 'worse', 'different', 'other', 'another',
      'without', 'with',
      'make it', 'make that', 'do it',
      'only', 'just',
      // Mal escritos comunes
      'cambialo', 'ponlo', 'quitalo', 'agregale', 'mejoralo',
      'hazlo', 'dejalo', 'modificalo', 'traducelo',
      // Otros idiomas básicos
      'changer', 'modifier', 'ajouter', 'supprimer', // Francés
      'ändern', 'hinzufügen', 'entfernen', // Alemán
      'mudar', 'adicionar', 'remover', // Portugués
    ];

    const hasEditIndicator = editIndicators.some(keyword => text.includes(keyword));
    
    // Si hay cualquier indicador de edición, usar contexto
    if (hasEditIndicator) {
      console.log('✅ [Intención] EDICIÓN detectada - Usando contexto visual');
      return true;
    }

    // Si es muy corto y hay contexto, probablemente quiere editar
    if (text.length < 30 && hasContext) {
      console.log('✅ [Intención] Prompt corto + contexto = EDICIÓN');
      return true;
    }

    // Por defecto, si hay contexto, USARLO (filosofía 80-90% edición)
    console.log('✅ [Intención] Contexto disponible - Modo EDICIÓN por defecto');
    return true;
  }

  /**
   * 📦 PREPARAR CONTENIDO ULTRA INTELIGENTE PARA GEMINI
   * Siempre incluye TODAS las imágenes del usuario (máximo 5)
   */
  prepareGeminiContent(prompt, newImages, visualContext, useContext) {
    const parts = [];

    console.log('🚀 [Preparación] Construyendo contenido inteligente...');
    console.log(`   - Imágenes nuevas: ${newImages?.length || 0}`);
    console.log(`   - Contexto visual: ${visualContext.totalImages}`);
    console.log(`   - Usar contexto: ${useContext ? 'SÍ' : 'NO'}`);

    // 🔹 SIEMPRE incluir contexto si existe (no ser selectivo)
    if (visualContext.totalImages > 0) {
      console.log('📸 [Preparación] Incluyendo TODO el contexto visual...');

      // A) Última imagen IA (si existe)
      if (visualContext.lastAIImage) {
        parts.push({
          text: `[CONTEXTO IA] Esta es tu última imagen generada. Elementos detectados: ${visualContext.lastAIImage.detectedElements.join(', ')}. Si el usuario pide cambios, SÉ COMPLETAMENTE FIEL a todo lo que NO mencione.`
        });
        parts.push({
          inlineData: { 
            mimeType: visualContext.lastAIImage.mimeType, 
            data: visualContext.lastAIImage.base64Data 
          }
        });
        console.log('   ✅ Imagen IA incluida');
      }

      // B) TODAS las imágenes del usuario (hasta 5)
      visualContext.userImages.forEach((img, i) => {
        parts.push({
          text: `[CONTEXTO USUARIO ${i+1}] Imagen del usuario. Elementos: ${img.detectedElements.join(', ')}. Prompt original: "${img.userPrompt}". Usa esto como referencia de estilo, objetos y composición.`
        });
        parts.push({
          inlineData: { 
            mimeType: img.mimeType, 
            data: img.base64Data 
          }
        });
        console.log(`   ✅ Imagen usuario ${i+1} incluida`);
      });
    }

    // 🔹 Nuevas imágenes del request actual (prioridad máxima)
    if (newImages && newImages.length > 0) {
      console.log(`📤 [Preparación] ${newImages.length} imágenes NUEVAS`);
      newImages.forEach((img, i) => {
        parts.push({ 
          text: `[NUEVA ${i+1}] Imagen recién subida. ESTA tiene prioridad MÁXIMA sobre el contexto.` 
        });
        parts.push({
          inlineData: { 
            mimeType: img.mimeType || 'image/jpeg', 
            data: img.base64Data 
          }
        });
        console.log(`   ✅ Nueva imagen ${i+1} incluida`);
      });
    }

    // 🔹 Prompt del usuario con contexto predictivo
    const enhancedPrompt = this.enhancePromptWithContext(prompt, visualContext);
    parts.push({ text: enhancedPrompt });

    console.log(`✅ [Preparación] ${parts.length} partes preparadas`);
    return parts;
  }

  /**
   * 🔮 MEJORAR PROMPT CON CONTEXTO PREDICTIVO
   */
  enhancePromptWithContext(prompt, visualContext) {
    if (!visualContext || visualContext.totalImages === 0) {
      return prompt;
    }

    const contextInfo = `\n\n[CONTEXTO PREDICTIVO]: Has trabajado con imágenes que contienen: ${visualContext.detectedElements}. El usuario probablemente quiere mantener estos elementos intactos a menos que lo mencione explícitamente.\n\n` + prompt;
    
    return contextInfo;
  }

  /**
   * 🧠 SYSTEM PROMPT ULTRA ESPECIALIZADO
   * Enfocado en EDICIÓN (80-90%) más que generación
   */
  buildEnhancedSystemPrompt(hasContext) {
    let prompt = `Eres Dazly, IA ULTRA ESPECIALIZADA en EDICIÓN y DISEÑO de imágenes.

## ⚠️ FILOSOFÍA CORE (CRÍTICO):
🎯 **80-90% de tu trabajo es EDICIÓN, NO generación desde cero**
🎯 **Usa SIEMPRE los recursos visuales previos del usuario**
🎯 **Sé QUIRÚRGICO: solo toca lo que te piden**
🎯 **FIDELIDAD ABSOLUTA a elementos no mencionados**

## TUS CAPACIDADES:
✅ Edición QUIRÚRGICA ultra precisa
✅ Detección automática de personas, productos, objetos
✅ Mantener identidad visual absoluta
✅ Comprender intención aunque esté mal escrito
✅ Multiidioma (español, inglés, etc.)
✅ Análisis profesional de composición
✅ Diseño de branding y marketing

## ESTILOS:
🎨 Fotorrealismo, Ilustración, Arte digital, Cartoon, Anime
🎨 Minimalismo, Vintage, Moderno, Corporate, Elegante
🎨 Cyberpunk, Steampunk, Art Deco, Retro, Futurista

`;

    if (hasContext) {
      prompt += `## 🧠 MEMORIA VISUAL ULTRA INTELIGENTE ACTIVA

⚠️ **REGLAS ABSOLUTAS DE FIDELIDAD**:

### 1. DETECCIÓN AUTOMÁTICA Y FIDELIDAD:
   🔍 **PERSONAS**: 
      - Mantén: rostro, expresión, rasgos faciales, identidad, pose, proporciones, ropa, accesorios
      - Solo cambia si se menciona EXPLÍCITAMENTE
      - Ejemplo: "cambia el fondo" → Persona 100% idéntica, solo fondo nuevo
   
   🔍 **PRODUCTOS** (café, bebidas, coches, ropa, zapatos, etc.):
      - Mantén: forma, marca, logo, color, textura, diseño, posición
      - Son el ELEMENTO PRINCIPAL - nunca los modifiques sin permiso
      - Ejemplo: "en español" → Producto IDÉNTICO, solo traduce texto
   
   🔍 **OBJETOS**:
      - Mantén: forma, tamaño, color, textura, posición, cantidad
      - Solo cambia lo mencionado explícitamente
   
   🔍 **TEXTO/LOGOS**:
      - Mantén: tipografía, posición, tamaño, estilo
      - Solo modifica contenido si se pide traducción/cambio
   
   🔍 **COMPOSICIÓN**:
      - Mantén: encuadre, perspectiva, ángulo, distribución espacial
      - Mantén: iluminación (dirección, intensidad, tipo)
      - Mantén: paleta de colores general (a menos que se pida cambio)

### 2. EJEMPLOS DE EDICIÓN QUIRÚRGICA:

   ✅ **"cambia el fondo"**
      → Mantén TODO (persona/producto 100% idéntico)
      → Solo cambia el fondo
   
   ✅ **"en español" / "traducelo"**
      → Mantén TODO (imagen, diseño, colores, layout 100% idéntico)
      → Solo traduce el texto
   
   ✅ **"añade un logo"**
      → Mantén TODO tal cual
      → Solo añade el logo en posición apropiada
   
   ✅ **"quita el objeto X"**
      → Mantén TODO excepto objeto X
      → Rellena el espacio de forma natural
   
   ✅ **"cambia el color del vestido a rojo"**
      → Mantén TODO (persona, pose, fondo, iluminación)
      → Solo cambia color del vestido
   
   ✅ **"mejora la iluminación"**
      → Mantén TODO (composición, personas, objetos)
      → Solo ajusta la iluminación

### 3. COMPRENSIÓN MULTIIDIOMA Y MAL ESCRITO:
   - Entiende "cambialo", "ponlo", "quitalo", "mejoralo"
   - Entiende "change it", "make it", "do it"
   - Entiende español, inglés, y mezclas
   - Interpreta intención aunque tenga errores ortográficos

### 4. JERARQUÍA DE PRIORIDAD:
   - **Prioridad 0 (MÁXIMA)**: Nuevas imágenes del request actual
   - **Prioridad 1**: Última imagen generada por ti (para editar)
   - **Prioridad 2**: Imágenes del usuario (referencia de estilo/objetos)

### 5. CONTEXTO PREDICTIVO:
   - Analiza elementos detectados en imágenes previas
   - Anticipa qué quiere mantener el usuario
   - Genera contexto para futuras conversaciones
   - Aprende del historial del proyecto

### 6. REGLA DE ORO:
   🚨 **SI NO SE MENCIONA, NO SE TOCA** 🚨
   - Usuario dice "cambia X" → Solo X cambia, TODO lo demás idéntico
   - Si hay duda, pregunta antes de modificar
   - Es mejor ser conservador que creativo sin permiso

`;
    } else {
      prompt += `## 💡 SIN MEMORIA VISUAL ACTIVA
- Puedes generar imágenes nuevas desde cero
- Sigue siendo experto en diseño y composición
- Da sugerencias profesionales

`;
    }

    prompt += `## FORMATO DE RESPUESTA:
- Usa Markdown: **negritas**, *cursivas*, listas, títulos
- Sé profesional pero cercano
- Da feedback constructivo
- Explica qué cambiaste y qué mantuviste
- Si editaste, confirma fidelidad a elementos no mencionados

## IDIOMA:
- Responde en el idioma del usuario
- Por defecto español
- Detecta automáticamente inglés, francés, etc.

Recuerda: Eres un EDITOR QUIRÚRGICO, no un generador aleatorio. Tu trabajo es respetar la visión del usuario al 100%.`;

    return prompt;
  }

  /**
   * 🔧 EXTRAE BASE64 DE URL
   */
  extractBase64(imageUrl) {
    if (!imageUrl) return null;
    if (imageUrl.includes('base64,')) {
      return imageUrl.split('base64,')[1];
    }
    return imageUrl;
  }
}

module.exports = new VisualMemoryService();