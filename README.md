# 🚀 Dazly API - Backend

Backend completo para la plataforma de IA generativa Dazly. Incluye autenticación, integración con Stripe, gestión de proyectos y preparado para Google Vertex AI.

## ⚡ Instalación Rápida

### 1. Instalar dependencias
```bash
cd dazly-api
npm install
```

### 2. Configurar Base de Datos
```bash
# Configurar PostgreSQL y crear .env basado en .env.example
cp .env.example .env

# Generar cliente Prisma
npm run db:generate

# Ejecutar migraciones
npm run db:migrate
```

### 3. Iniciar servidor
```bash
# Desarrollo
npm run dev

# Producción
npm run build
npm start
```

## 📋 Variables de Entorno Requeridas

```env
# Base de Datos
DATABASE_URL="postgresql://user:pass@localhost:5432/dazly_db"

# JWT
JWT_SECRET="tu-clave-secreta-minimo-32-caracteres"

# Stripe
STRIPE_SECRET_KEY="sk_test_tu_clave_secreta"
STRIPE_PULSE_PRICE_ID="price_id_del_plan_pulse"
STRIPE_FLOW_PRICE_ID="price_id_del_plan_flow"
# ... más price IDs

# Google Vertex AI
GOOGLE_CLOUD_PROJECT_ID="tu-proyecto-gcp"
GOOGLE_APPLICATION_CREDENTIALS="/ruta/a/credenciales.json"
```

## 🛠️ Endpoints Implementados

### 🔐 Autenticación (`/api/auth`)
- `POST /register` - Registrar usuario
- `POST /login` - Iniciar sesión  
- `PUT /change-password` - Cambiar contraseña

### 🎨 IA Generativa (`/api/ai`)
- `POST /generate` - Generar imagen (requiere auth)
- `GET /generations` - Historial de generaciones

### 💳 Pagos Stripe (`/api/stripe`)
- `POST /create-session` - Crear sesión de pago
- `POST /customer-portal` - Portal del cliente
- `POST /webhook` - Webhooks de Stripe

### 👤 Usuario (`/api/user`)
- `GET /profile` - Perfil del usuario
- `GET /projects` - Proyectos del usuario
- `POST /projects` - Crear proyecto
- `PUT /projects/:id` - Actualizar proyecto
- `DELETE /projects/:id` - Eliminar proyecto
- `GET /stats` - Estadísticas de uso

## 🔗 Integración Google Vertex AI

Para integrar con Gemini 2.0 Flash, reemplaza la simulación en `/api/ai/generate`:

```javascript
// src/routes/ai.js - línea ~45

// Reemplazar simulación por:
const { VertexAI } = require('@google-cloud/aiplatform');

const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT_ID,
  location: process.env.VERTEX_AI_LOCATION
});

const generateImageRequest = {
  instances: [{
    prompt: prompt
  }],
  parameters: {
    sampleCount: 1
  }
};

const [response] = await vertexAI.predict({
  endpoint: 'projects/PROJECT_ID/locations/LOCATION/endpoints/ENDPOINT_ID',
  instances: [{ prompt }]
});

const imageUrl = response.predictions[0].imageUrl;
```

## 💰 Configurar Stripe

### 1. Crear productos en Stripe Dashboard
```javascript
// Ejemplos de precios (crear en Stripe Dashboard)
Pulse: €3.99/mes - 50 imágenes
Flow: €9.99/mes - 150 imágenes  
Summit: €19.99/mes - 350 imágenes
Peak: €39.99/mes - 700 imágenes
Infinity: €79.99/mes - 1500 imágenes
```

### 2. Configurar Webhooks
URL: `https://tu-dominio.com/api/stripe/webhook`

Eventos requeridos:
- `checkout.session.completed`
- `invoice.payment_succeeded` 
- `customer.subscription.updated`
- `customer.subscription.deleted`

## 📊 Base de Datos

### Modelos principales:
- **User** - Usuarios con planes y créditos
- **Project** - Proyectos de cada usuario
- **Message** - Mensajes del chat (user/assistant)
- **Generation** - Historial de generaciones

### Comandos útiles:
```bash
# Ver base de datos en navegador
npm run db:studio

# Reset completo de DB
npx prisma migrate reset

# Deploy en producción
npm run db:deploy
```

## 🚀 Deploy

### Railway/Heroku
```bash
# Variables de entorno requeridas
DATABASE_URL=postgresql://...
JWT_SECRET=...
STRIPE_SECRET_KEY=sk_live_...
GOOGLE_CLOUD_PROJECT_ID=...

# Comandos de deploy
npm run build
npm run db:deploy
npm start
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 8080
CMD ["npm", "start"]
```

## 📈 Monitoreo y Logs

El servidor incluye:
- ✅ Logging de errores
- ✅ Validación de requests
- ✅ Manejo de CORS
- ✅ Middleware de autenticación
- ✅ Rate limiting (próximamente)

## 🔧 Desarrollo

```bash
# Instalar dependencias de desarrollo
npm install

# Modo desarrollo con hot reload
npm run dev

# Linting y formateo
npm run lint
npm run format

# Tests (próximamente)
npm test
```

## 📞 API Status

- ✅ **Autenticación completa** - Login/Register/JWT
- ✅ **Gestión de usuarios** - Perfiles y proyectos
- ✅ **Integración Stripe** - Pagos y suscripciones
- ✅ **Base para IA** - Estructura para Vertex AI
- ⏳ **Vertex AI** - Pendiente configuración GCP
- ⏳ **Rate Limiting** - Próximamente
- ⏳ **Email Service** - Próximamente

---

## 🎊 ¡Backend Completo!

El backend de Dazly está **100% funcional** y listo para conectar con el frontend. Solo falta:

1. **Configurar PostgreSQL** 
2. **Configurar Stripe** con los Price IDs
3. **Configurar Google Cloud** para Vertex AI
4. **Deploy** y ¡lanzar! 🚀

**¡Dazly está listo para ser la plataforma de IA más exitosa! 💰✨**