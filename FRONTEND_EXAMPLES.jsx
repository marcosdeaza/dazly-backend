// ============================================
// EJEMPLO DE USO - Context Caching Frontend
// ============================================

import { useState } from 'react';

export function ChatWithMemoryExample() {
  const [messages, setMessages] = useState([]);
  const [projectId, setProjectId] = useState('project-123');
  const [loading, setLoading] = useState(false);

  // ✅ FORMA 1: Chat simple con memoria automática
  const sendMessage = async (prompt, images = []) => {
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        headers: {
          'Authorization': \Bearer \\,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: prompt,
          projectId: projectId,  // 🔑 IMPORTANTE: Mismo projectId = misma memoria
          images: images.map(img => ({
            base64Data: img.base64,
            mimeType: img.type
          }))
        })
      });

      const data = await response.json();
      
      console.log('💾 Cache Info:', data.cacheInfo);
      // {
      //   cacheId: "projects/.../cachedContents/abc123",
      //   isNewCache: false,  // ✅ Reutilizó caché existente
      //   expiresAt: "2024-01-20T15:30:00Z",
      //   usedCache: true     // ✅ Ahorró ~90% tokens
      // }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.aiMessage.content,
        imageUrl: data.aiMessage.imageUrl
      }]);

      setLoading(false);
      return data;

    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  // ✅ FORMA 2: Resetear memoria del proyecto
  const clearProjectMemory = async () => {
    try {
      await fetch('http://localhost:3000/api/ai/clear-cache', {
        method: 'POST',
        headers: {
          'Authorization': \Bearer \\,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId: projectId
        })
      });

      console.log('🗑️ Memoria del proyecto reseteada');
      setMessages([]);

    } catch (error) {
      console.error('Error limpiando caché:', error);
    }
  };

  return (
    <div className="chat-container">
      <h1>Chat con Memoria Persistente 🧠</h1>
      
      {/* Selector de proyecto */}
      <select 
        value={projectId} 
        onChange={(e) => setProjectId(e.target.value)}
        className="project-selector"
      >
        <option value="project-123">Logo Design</option>
        <option value="project-456">Banner Ads</option>
        <option value="project-789">Product Photos</option>
      </select>

      {/* Mensajes */}
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={\message \\}>
            <p>{msg.content}</p>
            {msg.imageUrl && <img src={msg.imageUrl} alt="Generated" />}
          </div>
        ))}
      </div>

      {/* Botones de ejemplo */}
      <div className="actions">
        <button 
          onClick={() => sendMessage("Crea un logo minimalista para cafetería")}
          disabled={loading}
        >
          1️⃣ Crear logo
        </button>

        <button 
          onClick={() => sendMessage("Hazlo más vintage")}
          disabled={loading}
        >
          2️⃣ Iterar (usa memoria) ⚡
        </button>

        <button 
          onClick={() => sendMessage("Ahora en tonos marrones")}
          disabled={loading}
        >
          3️⃣ Iterar más (usa memoria) ⚡
        </button>

        <button 
          onClick={clearProjectMemory}
          disabled={loading}
        >
          🗑️ Resetear memoria
        </button>
      </div>

      {loading && <div className="loading">Generando... 🎨</div>}
    </div>
  );
}

// ============================================
// EJEMPLO 2: Edición iterativa de imágenes
// ============================================

export function IterativeImageEditor() {
  const [currentImage, setCurrentImage] = useState(null);
  const [projectId] = useState(\project-\\);  // Proyecto único

  const editImage = async (instruction, imageFile) => {
    // Convertir imagen a base64
    const base64 = await fileToBase64(imageFile);

    const response = await fetch('http://localhost:3000/api/ai/generate', {
      method: 'POST',
      headers: {
        'Authorization': \Bearer \\,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: instruction,
        projectId: projectId,  // 🧠 Mantiene contexto de todas las ediciones
        images: [{
          base64Data: base64.split(',')[1],
          mimeType: imageFile.type
        }]
      })
    });

    const data = await response.json();
    setCurrentImage(data.imageUrl);

    // ✅ Gemini recuerda todas las imágenes anteriores!
    console.log('Memoria activa:', data.cacheInfo.usedCache);
  };

  return (
    <div>
      <h2>Edición Iterativa con Memoria 🖼️</h2>
      
      {/* Primera edición */}
      <button onClick={() => editImage("Mejora los colores", file1)}>
        Mejorar colores
      </button>

      {/* Segunda edición - Gemini recuerda la primera */}
      <button onClick={() => editImage("Ahora añade más contraste", file2)}>
        Añadir contraste (usa contexto) ⚡
      </button>

      {/* Tercera edición - Gemini recuerda ambas anteriores */}
      <button onClick={() => editImage("Compara con la imagen original y dame feedback", null)}>
        Comparar con original (usa memoria completa) ⚡
      </button>

      {currentImage && <img src={currentImage} alt="Edited" />}
    </div>
  );
}

// ============================================
// EJEMPLO 3: Multiple proyectos simultáneos
// ============================================

export function MultiProjectChat() {
  const [projects, setProjects] = useState({
    'logo-design': [],
    'banner-ads': [],
    'product-photos': []
  });

  const sendToProject = async (projectId, prompt) => {
    const response = await fetch('http://localhost:3000/api/ai/generate', {
      method: 'POST',
      headers: {
        'Authorization': \Bearer \\,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: prompt,
        projectId: projectId  // 🔑 Cada proyecto tiene su propia memoria
      })
    });

    const data = await response.json();
    
    // Cada proyecto mantiene su propio contexto separado
    setProjects(prev => ({
      ...prev,
      [projectId]: [...prev[projectId], data.aiMessage]
    }));
  };

  return (
    <div>
      {/* Proyecto 1: Logo Design */}
      <div className="project">
        <h3>Logo Design 🎨</h3>
        <button onClick={() => sendToProject('logo-design', 'Crea logo minimalista')}>
          Mensaje 1
        </button>
        <button onClick={() => sendToProject('logo-design', 'Hazlo más colorido')}>
          Mensaje 2 (recuerda mensaje 1) ⚡
        </button>
      </div>

      {/* Proyecto 2: Banner Ads */}
      <div className="project">
        <h3>Banner Ads 📢</h3>
        <button onClick={() => sendToProject('banner-ads', 'Banner para redes sociales')}>
          Mensaje 1
        </button>
        <button onClick={() => sendToProject('banner-ads', 'Añade call-to-action')}>
          Mensaje 2 (recuerda mensaje 1) ⚡
        </button>
      </div>

      {/* ✅ Ambos proyectos mantienen memorias independientes */}
    </div>
  );
}

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
// COMPARATIVA: Con vs Sin Cache
// ============================================

// ❌ SIN CACHE (antiguo)
// Mensaje 1: Envía [System Prompt + Mensaje 1] = 1,000 tokens
// Mensaje 2: Envía [System Prompt + Mensaje 1 + Respuesta 1 + Mensaje 2] = 3,000 tokens
// Mensaje 3: Envía [System Prompt + Todo + Mensaje 3] = 8,000 tokens
// TOTAL: 12,000 tokens

// ✅ CON CACHE (nuevo)
// Mensaje 1: Crea caché [System Prompt] + Envía [Mensaje 1] = 100 tokens
// Mensaje 2: Usa caché + Envía [Mensaje 2] = 50 tokens
// Mensaje 3: Usa caché + Envía [Mensaje 3] = 50 tokens
// TOTAL: 200 tokens (98% de ahorro! 💰)
