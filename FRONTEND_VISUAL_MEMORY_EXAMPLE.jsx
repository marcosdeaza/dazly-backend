// EJEMPLO FRONTEND - Componente de Edición de Imágenes con Memoria Visual
// Usar en: dazly.art-studio-main/src/pages/ChatPage.tsx

import { useState } from 'react';

export function ChatWithVisualMemory() {
  const [messages, setMessages] = useState([]);
  const [currentImage, setCurrentImage] = useState(null);
  const [projectId] = useState('project-' + Date.now());

  // 🎨 GENERAR IMAGEN NUEVA
  const generateNewImage = async (prompt) => {
    const response = await fetch('http://localhost:3000/api/ai/generate', {
      method: 'POST',
      headers: {
        'Authorization': \Bearer \\,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: prompt,
        projectId: projectId,
        editMode: 'generate'  // Generar nueva
      })
    });

    const data = await response.json();
    setCurrentImage(data.imageUrl);
    
    console.log('✅ Imagen generada');
    console.log('   Modo: GENERACIÓN');
    
    return data;
  };

  // ✏️ EDITAR IMAGEN EXISTENTE (CON MEMORIA VISUAL)
  const editCurrentImage = async (editPrompt) => {
    if (!currentImage) {
      alert('Primero genera o sube una imagen');
      return;
    }

    // Convertir imagen actual a base64
    const base64Data = currentImage.includes('base64,') 
      ? currentImage.split('base64,')[1] 
      : currentImage;

    const response = await fetch('http://localhost:3000/api/ai/generate', {
      method: 'POST',
      headers: {
        'Authorization': \Bearer \\,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: editPrompt,
        projectId: projectId,
        images: [{
          base64Data: base64Data,
          mimeType: 'image/jpeg'
        }],
        editMode: 'edit'  // 🔑 CLAVE: Editar, no generar
      })
    });

    const data = await response.json();
    setCurrentImage(data.imageUrl);
    
    console.log('✅ Imagen editada con memoria visual');
    console.log('   Modo: EDICIÓN');
    console.log('   UsedVisualMemory:', data.editInfo?.usedVisualMemory);
    console.log('   ImagesInContext:', data.editInfo?.imagesInContext);
    
    return data;
  };

  // 🎯 EJEMPLO DE FLUJO COMPLETO
  const exampleWorkflow = async () => {
    // Paso 1: Generar imagen inicial
    console.log('📸 Paso 1: Generando logo inicial...');
    await generateNewImage('Crea un logo minimalista para cafetería');
    
    // Paso 2: Editar color (recuerda la imagen 1)
    setTimeout(async () => {
      console.log('🎨 Paso 2: Cambiando color (recuerda imagen 1)...');
      await editCurrentImage('Cambia SOLO el color a café oscuro, mantén todo lo demás');
    }, 3000);
    
    // Paso 3: Añadir texto (recuerda imágenes 1 y 2)
    setTimeout(async () => {
      console.log('✏️ Paso 3: Añadiendo texto (recuerda imágenes 1 y 2)...');
      await editCurrentImage('Añade el texto "Café Dazly" debajo del logo');
    }, 6000);
    
    // Paso 4: Comparar con original (usa memoria visual)
    setTimeout(async () => {
      console.log('👁️ Paso 4: Comparando con original (usa TODA la memoria)...');
      await editCurrentImage('Compara esta versión con la primera que generaste y dime cuál es mejor');
    }, 9000);
  };

  return (
    <div className="visual-memory-demo">
      <h1>🎨 Edición con Memoria Visual</h1>
      
      {/* Botones de prueba */}
      <div className="actions">
        <h2>Generar Nueva</h2>
        <button onClick={() => generateNewImage('Logo minimalista para cafetería')}>
          1️⃣ Generar logo
        </button>
        
        <h2>Editar Existente (con memoria)</h2>
        <button onClick={() => editCurrentImage('Cambia el color a café oscuro')}>
          2️⃣ Cambiar color ⚡
        </button>
        
        <button onClick={() => editCurrentImage('Añade el texto "Café Dazly"')}>
          3️⃣ Añadir texto ⚡
        </button>
        
        <button onClick={() => editCurrentImage('Hazlo más vintage')}>
          4️⃣ Aplicar estilo ⚡
        </button>
        
        <button onClick={() => editCurrentImage('Compara con la versión original')}>
          5️⃣ Comparar (usa memoria) 🧠
        </button>
        
        <hr />
        
        <button onClick={exampleWorkflow}>
          🚀 Ejecutar workflow completo
        </button>
      </div>

      {/* Mostrar imagen actual */}
      {currentImage && (
        <div className="current-image">
          <h3>Imagen Actual</h3>
          <img src={currentImage} alt="Current" style={{ maxWidth: '100%' }} />
        </div>
      )}

      {/* Historial de mensajes */}
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className="message">
            <strong>{msg.role}:</strong> {msg.content}
            {msg.imageUrl && <img src={msg.imageUrl} alt="Generated" />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// INTEGRACIÓN EN ChatPage.tsx EXISTENTE
// ============================================

// Modificar la función sendMessage en tu ChatPage.tsx:

const sendMessage = async (input: string) => {
  if (!input.trim()) return;
  
  setLoading(true);
  
  try {
    // Convertir imágenes adjuntas a base64
    const imagesBase64 = [];
    if (attachedImages.length > 0) {
      for (const img of attachedImages) {
        const base64 = await fileToBase64(img.file);
        imagesBase64.push({
          base64Data: base64.split(',')[1],
          mimeType: img.file.type
        });
      }
    }
    
    // 🔑 DETECTAR: ¿Es edición o generación?
    const hasImages = imagesBase64.length > 0;
    const isEditRequest = hasImages && (
      input.toLowerCase().includes('cambia') ||
      input.toLowerCase().includes('modifica') ||
      input.toLowerCase().includes('edita') ||
      input.toLowerCase().includes('añade') ||
      input.toLowerCase().includes('quita')
    );

    const response = await fetch('http://localhost:3000/api/ai/generate', {
      method: 'POST',
      headers: {
        'Authorization': \Bearer \\,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: input,
        projectId: projectId,
        images: imagesBase64,
        editMode: isEditRequest ? 'edit' : 'generate'  // 🔑 Auto-detectar modo
      })
    });

    const data = await response.json();
    
    // Mostrar info de memoria visual
    if (data.editInfo) {
      console.log('🧠 Memoria Visual Activa:', data.editInfo);
      console.log('   - UsedVisualMemory:', data.editInfo.usedVisualMemory);
      console.log('   - ImagesInContext:', data.editInfo.imagesInContext);
    }
    
    // Actualizar UI...
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: data.aiMessage.content,
      imageUrl: data.imageUrl
    }]);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    setLoading(false);
  }
};

// ============================================
// UTILIDADES
// ============================================

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ============================================
// EJEMPLOS DE PROMPTS DE EDICIÓN
// ============================================

const editPrompts = {
  // Cambios de color
  color: "Cambia SOLO el color del fondo a azul, mantén todo lo demás igual",
  
  // Añadir elementos
  addText: "Añade el texto 'Dazly Studio' en la parte superior",
  addLogo: "Añade un pequeño logo en la esquina",
  
  // Quitar elementos
  remove: "Quita el fondo, déjalo transparente",
  removeObject: "Elimina la persona del lado derecho",
  
  // Cambios de estilo
  style: "Aplica un filtro vintage pero mantén los colores",
  blur: "Desenfoca el fondo pero mantén el primer plano nítido",
  
  // Comparaciones (usa memoria visual)
  compare: "Compara esta imagen con la primera que generaste",
  feedback: "Dame feedback comparando con las versiones anteriores"
};

// ============================================
// DEBUGGING
// ============================================

// Para verificar que la memoria visual funciona:
console.log('Verificando memoria visual...');

// En el response, busca:
response.editInfo = {
  usedVisualMemory: true,      // ✅ Debe ser true
  imagesInContext: 5,          // ✅ Número de imágenes en caché
  cacheId: "projects/.../abc", // ✅ ID del caché
  analysis: "Para editar..."   // ✅ Análisis con contexto
}

// Si usedVisualMemory es false:
// 1. Verifica que editMode: 'edit' está en el request
// 2. Verifica que el proyecto tiene visualCacheId en la BD
// 3. Revisa los logs del servidor
