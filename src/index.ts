import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
// --- IMPORTS PARA GOOGLE ---
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

// Importar servicios
const vertexAI = require('./services/vertexAI.js');
const visualMemory = require('./services/visualMemory.js');

// ✅ Importar Stripe
import Stripe from 'stripe';

// 🛡️ Rate Limiting para protección contra abuso
import rateLimit from 'express-rate-limit';

// --- CONFIGURACIÓN INICIAL ---
const app = express();

// ✅ PRISMA CON POOL DE CONEXIONES - Soporta múltiples usuarios simultáneos
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// ✅ Inicializar Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia' as any,
  typescript: true
});

// Mapeo de planes a Price IDs de Stripe
const STRIPE_PRICES: Record<string, string> = {
  'pulse': process.env.STRIPE_PRICE_PULSE || '',
  'flow': process.env.STRIPE_PRICE_FLOW || '',
  'summit': process.env.STRIPE_PRICE_SUMMIT || '',
  'peak': process.env.STRIPE_PRICE_PEAK || '',
  'infinity': process.env.STRIPE_PRICE_INFINITY || ''
};

// Mapeo de planes a créditos
const PLAN_CREDITS: Record<string, number> = {
  'free': 0,
  'pulse': 50,
  'flow': 200,
  'summit': 500,
  'peak': 2000,
  'infinity': 999999
};

// --- MIDDLEWARES ---
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true })); 

// 🛡️ Rate Limiting - Protección contra abuso
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por IP cada 15 min
  message: { error: 'Demasiadas peticiones. Por favor, intenta más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // 10 generaciones de IA por minuto
  message: { error: 'Límite de generaciones alcanzado. Espera 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Aplicar rate limiting general
app.use('/api/', apiLimiter);

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:8080',
    'https://dazly.art', // ✅ Dominio principal
    'https://www.dazly.art', // ✅ Con www
    'http://localhost:8080',
    'http://localhost:5173',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 📁 Servir archivos estáticos (dashboard)
app.use('/dashboard', express.static(path.join(__dirname, '../public')));
 

// --- INICIALIZAR Y CONFIGURAR PASSPORT ---
app.use(passport.initialize());

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!, // La llave del .env
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!, // La llave del .env
      
      // AHORA APUNTA A TU BACKEND (8081)
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:8081/api/auth/google/callback", 
    },
    async (_accessToken, _refreshToken, profile, done) => {
      // Esta funciÃƒÆ’Ã‚Â³n se llama cuando Google nos devuelve al usuario
      try {
        const email = profile.emails?.[0].value;
        if (!email) {
          return done(new Error("No se encontrÃƒÆ’Ã‚Â³ email en el perfil de Google"));
        }

        // 1. Buscar si el usuario ya existe en nuestra BD
        let user = await prisma.user.findUnique({
          where: { email: email },
        });

        if (user) {
          // Si existe pero se registrÃƒÆ’Ã‚Â³ con email, actualizamos su 'provider'
          if (user.provider === 'email') {
            user = await prisma.user.update({
              where: { id: user.id },
              data: { provider: 'google' }, // Marcamos que ahora tambiÃƒÆ’Ã‚Â©n usa Google
            });
          }
          // Si ya existe (con google o email), lo pasamos
          return done(null, user);
        }

        // 2. Si no existe, lo creamos
        const newUser = await prisma.user.create({
          data: {
            email: email,
            provider: 'google',
            plan: 'free',
            imagesRemaining: 3,
            imagesUsedThisMonth: 0,
            subscriptionStatus: 'active'
          },
        });

        return done(null, newUser); // Pasamos el usuario nuevo

      } catch (error) {
        return done(error as Error);
      }
    }
  )
);


// --- RUTA DE PRUEBA ---
app.get('/', (_req, res) => {
  res.send('Ãƒâ€šÃ‚Â¡El motor de Dazly API estÃƒÆ’Ã‚Â¡ encendido! ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â¥');
});

// --- RUTA DE REGISTRO (Email/Pass) ---
app.post('/api/auth/register', async (req, res): Promise<any> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseÃƒÆ’Ã‚Â±a son requeridos' });
    }
    const existingUser = await prisma.user.findUnique({
      where: { email: email },
    });
    if (existingUser) {
      return res.status(400).json({ error: 'Ese email ya estÃƒÆ’Ã‚Â¡ en uso' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        email: email,
        password: hashedPassword,
        provider: 'email',
        plan: 'free',
        imagesRemaining: 3,
        imagesUsedThisMonth: 0,
        subscriptionStatus: 'active'
      },
    });
    const jwtSecret = process.env.JWT_SECRET || "MI_PALABRA_SECRETA_PROVISIONAL";
    const token = jwt.sign(
      { 
        userId: newUser.id, 
        email: newUser.email,
        plan: newUser.plan,
        imagesRemaining: newUser.imagesRemaining,
        imagesUsedThisMonth: newUser.imagesUsedThisMonth,
        subscriptionStatus: newUser.subscriptionStatus
      },
      jwtSecret,
      { expiresIn: '7d' }
    );
    console.log(`Nuevo usuario registrado: ${newUser.email}`);
    return res.status(201).json({
      message: 'Usuario registrado correctamente',
      token: token,
      user: {
        id: newUser.id,
        email: newUser.email,
        plan: newUser.plan,
        imagesRemaining: newUser.imagesRemaining,
        imagesUsedThisMonth: newUser.imagesUsedThisMonth,
        subscriptionStatus: newUser.subscriptionStatus
      }
    });
  } catch (error) {
    console.error("Error en /api/auth/register:", error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// --- RUTA DE LOGIN (Email/Pass) ---
app.post('/api/auth/login', async (req, res): Promise<any> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseÃƒÆ’Ã‚Â±a son requeridos' });
    }
    const user = await prisma.user.findUnique({
      where: { email: email },
    });
    if (!user || !user.password) {
      // Si el email no existe O no tiene contraseÃƒÆ’Ã‚Â±a (es de Google)
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }
    const jwtSecret = process.env.JWT_SECRET || "MI_PALABRA_SECRETA_PROVISIONAL";
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        plan: user.plan,
        imagesRemaining: user.imagesRemaining,
        imagesUsedThisMonth: user.imagesUsedThisMonth,
        subscriptionStatus: user.subscriptionStatus
      },
      jwtSecret,
      { expiresIn: '7d' }
    );
    console.log(`Usuario logueado: ${user.email}`);
    res.status(200).json({
      message: 'Login correcto',
      token: token,
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        imagesRemaining: user.imagesRemaining,
        imagesUsedThisMonth: user.imagesUsedThisMonth,
        subscriptionStatus: user.subscriptionStatus
      }
    });
  } catch (error) {
    console.error("Error en /api/auth/login:", error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});


// --- NUEVAS RUTAS PARA EL LOGIN CON GOOGLE ---

// Esta es la ruta a la que el botÃƒÆ’Ã‚Â³n del frontend llamarÃƒÆ’Ã‚Â¡
app.get(
  '/api/auth/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'], 
    session: false 
  })
);

// Esta es la ruta a la que Google nos redirige (el "callback")
app.get(
  '/api/auth/google/callback',
  passport.authenticate('google', { 
    // AHORA APUNTA A TU FRONTEND (8080)
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=true`, 
    session: false 
  }),
  (req, res) => {
    // Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Â°XITO!
    const user: any = req.user;

    // 1. Creamos nuestro propio "Pase VIP" (JWT Token) para Dazly
    const jwtSecret = process.env.JWT_SECRET || "MI_PALABRA_SECRETA_PROVISIONAL";
    
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        plan: user.plan,
        imagesRemaining: user.imagesRemaining,
        imagesUsedThisMonth: user.imagesUsedThisMonth,
        subscriptionStatus: user.subscriptionStatus
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    // 2. Redirigimos al usuario DE VUELTA AL FRONTEND
    console.log(`Usuario logueado con Google: ${user.email}`);
    
    // AHORA APUNTA A TU FRONTEND (8080)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/login/callback?token=${token}`);
  }
);

// --- MIDDLEWARE DE AUTENTICACIÃƒÆ’Ã¢â‚¬Å“N PARA OTRAS RUTAS ---
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET || "MI_PALABRA_SECRETA_PROVISIONAL", (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- RUTA PROTEGIDA DE EJEMPLO ---
app.get('/api/user/profile', authenticateToken, async (req: any, res): Promise<any> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    console.log('📋 Usuario cargando perfil:', user.email);
    console.log('   Plan:', user.plan);
    console.log('   Créditos:', user.imagesRemaining);
    
    return res.json({
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
    return res.status(500).json({ error: 'Error obteniendo perfil' });
  }
});

// --- ACTUALIZAR SUSCRIPCIÓN ---
app.post('/api/user/update-subscription', authenticateToken, async (req: any, res): Promise<any> => {
  try {
    const { plan, credits, subscriptionEnd } = req.body;
    const userId = req.user.userId;

    if (!plan) {
      return res.status(400).json({ error: 'Plan es requerido' });
    }

    // Mapeo de planes a créditos
    const planCredits: Record<string, number> = {
      'free': 0,
      'pulse': 50,
      'flow': 200,
      'summit': 500,
      'peak': 2000,
      'infinity': 999999
    };

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        plan: plan,
        imagesRemaining: credits || planCredits[plan] || 0,
        subscriptionStatus: 'active',
        subscriptionEndDate: subscriptionEnd ? new Date(subscriptionEnd) : null
      }
    });

    console.log(`✅ Plan actualizado: ${updatedUser.email} -> ${plan} (${updatedUser.imagesRemaining} créditos)`);

    return res.json({
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
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// --- VERIFICAR SESIÓN DE STRIPE Y ACTUALIZAR PLAN ---
app.post('/api/stripe/verify-session', authenticateToken, async (req: any, res): Promise<any> => {
  try {
    const { sessionId } = req.body;
    const userId = req.user.userId;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID requerido' });
    }

    console.log('🔍 Verificando sesión de Stripe:', sessionId);

    // Obtener sesión de Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ 
        error: 'Pago no completado',
        status: session.payment_status 
      });
    }

    // Verificar que la sesión pertenece al usuario
    if (session.client_reference_id !== userId && session.metadata?.userId !== userId) {
      return res.status(403).json({ error: 'Esta sesión no te pertenece' });
    }

    const planId = session.metadata?.planId;
    const credits = parseInt(session.metadata?.credits || '0');

    if (!planId) {
      return res.status(400).json({ error: 'No se encontró información del plan' });
    }

    // Actualizar usuario
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        plan: planId,
        imagesRemaining: credits,
        subscriptionStatus: 'active',
        subscriptionStartDate: new Date(),
        subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string
      }
    });

    console.log('✅ Plan actualizado manualmente:', planId, 'Créditos:', credits);

    return res.json({
      success: true,
      message: 'Plan actualizado correctamente',
      user: {
        plan: updatedUser.plan,
        imagesRemaining: updatedUser.imagesRemaining,
        subscriptionStatus: updatedUser.subscriptionStatus
      }
    });

  } catch (error: any) {
    console.error('❌ Error verificando sesión:', error);
    return res.status(500).json({ error: 'Error verificando sesión' });
  }
});

// --- SINCRONIZAR CRÉDITOS Y VERIFICAR EXPIRACIÓN ---
app.get('/api/user/sync-credits', authenticateToken, async (req: any, res): Promise<any> => {
  try {
    const userId = req.user.userId;
    
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    let updatedUser = user;
    
    // ✅ Verificar si el plan expiró (después de 30 días)
    if (user.subscriptionEndDate && new Date(user.subscriptionEndDate) < new Date()) {
      console.log('⚠️ Plan expirado, bajando a Free:', user.email);
      console.log('   Fecha de expiración:', user.subscriptionEndDate);
      console.log('   Fecha actual:', new Date());
      
      updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          plan: 'free',
          imagesRemaining: 0,
          subscriptionStatus: 'expired'
        }
      });
      
      console.log('✅ Usuario bajado a plan Free con 0 créditos');
    }

    return res.json({
      success: true,
      credits: {
        imagesRemaining: updatedUser.imagesRemaining,
        plan: updatedUser.plan,
        subscriptionStatus: updatedUser.subscriptionStatus,
        subscriptionEnd: updatedUser.subscriptionEndDate
      }
    });

  } catch (error) {
    console.error('Error sincronizando créditos:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ========================================
// STRIPE ENDPOINTS
// ========================================

// --- CREAR SESIÓN DE CHECKOUT DE STRIPE ---
app.post('/api/stripe/create-checkout', authenticateToken, async (req: any, res): Promise<any> => {
  try {
    const { planId } = req.body;
    const userId = req.user.userId;

    if (!planId || !STRIPE_PRICES[planId]) {
      return res.status(400).json({ error: 'Plan inválido' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    console.log(`💳 Creando sesión de Stripe para: ${user.email}, Plan: ${planId}`);

    // Crear sesión de Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: STRIPE_PRICES[planId],
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/plans?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/plans?canceled=true`,
      customer_email: user.email,
      client_reference_id: userId,
      metadata: {
        userId: userId,
        planId: planId,
        credits: PLAN_CREDITS[planId].toString()
      }
      // ❌ Códigos promocionales deshabilitados
      // allow_promotion_codes: true
    });

    console.log('✅ Sesión de Stripe creada:', session.id);

    return res.json({
      success: true,
      sessionId: session.id,
      url: session.url
    });

  } catch (error: any) {
    console.error('❌ Error creando sesión de Stripe:', error);
    return res.status(500).json({ error: error.message });
  }
});

// --- WEBHOOK DE STRIPE ---
app.post('/api/stripe/webhook', express.raw({type: 'application/json'}), async (req: any, res): Promise<any> => {
  const sig = req.headers['stripe-signature'];

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('⚠️ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('🔔 Webhook recibido:', event.type);

  // Manejar el evento
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        console.log('💳 Pago completado:', session.id);
        console.log('   Usuario ID:', session.metadata?.userId);
        console.log('   Plan:', session.metadata?.planId);

        if (session.metadata?.userId && session.metadata?.planId) {
          const planId = session.metadata.planId;
          const credits = parseInt(session.metadata.credits || '0');

          // Actualizar usuario en DB
          await prisma.user.update({
            where: { id: session.metadata.userId },
            data: {
              plan: planId,
              imagesRemaining: credits,
              subscriptionStatus: 'active',
              subscriptionStartDate: new Date(),
              subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string
            }
          });

          console.log('✅ Usuario actualizado con plan:', planId, 'Créditos:', credits);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('🔄 Suscripción actualizada:', subscription.id);
        // Aquí puedes manejar cambios de plan, renovaciones, etc.
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('❌ Suscripción cancelada:', subscription.id);
        
        // Buscar usuario por stripeCustomerId
        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: subscription.customer as string }
        });

        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              plan: 'free',
              imagesRemaining: 0,
              subscriptionStatus: 'canceled'
            }
          });
          console.log('✅ Usuario bajado a plan Free:', user.email);
        }
        break;
      }

      default:
        console.log(`ℹ️ Evento no manejado: ${event.type}`);
    }

    return res.json({ received: true });

  } catch (error: any) {
    console.error('❌ Error procesando webhook:', error);
    return res.status(500).json({ error: error.message });
  }
});

// --- RUTA PARA CAMBIAR CONTRASEÑA ---
app.put('/api/auth/change-password', authenticateToken, async (req: any, res): Promise<any> => {
  try {
    const { currentPassword, newPassword } = req.body;

    console.log('ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â Solicitud de cambio de contraseÃƒÆ’Ã‚Â±a recibida para usuario:', req.user.userId);

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'ContraseÃƒÆ’Ã‚Â±a actual y nueva contraseÃƒÆ’Ã‚Â±a son requeridas' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseÃƒÆ’Ã‚Â±a debe tener al menos 6 caracteres' });
    }

    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar que el usuario tenga contraseÃƒÆ’Ã‚Â±a (no OAuth)
    if (!user.password) {
      return res.status(400).json({ error: 'Este usuario no tiene contraseÃƒÆ’Ã‚Â±a. Usa el login de Google.' });
    }

    console.log('ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å“ Verificando contraseÃƒÆ’Ã‚Â±a actual...');

    // Verificar contraseÃƒÆ’Ã‚Â±a actual
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);

    if (!isValidPassword) {
      console.log('ÃƒÂ¢Ã‚ÂÃ…â€™ ContraseÃƒÆ’Ã‚Â±a actual incorrecta');
      return res.status(401).json({ error: 'La contraseÃƒÆ’Ã‚Â±a actual es incorrecta' });
    }

    console.log('ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ ContraseÃƒÆ’Ã‚Â±a actual vÃƒÆ’Ã‚Â¡lida, actualizando...');

    // Hashear nueva contraseÃƒÆ’Ã‚Â±a
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseÃƒÆ’Ã‚Â±a
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { password: hashedNewPassword }
    });

    console.log('ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ ContraseÃƒÆ’Ã‚Â±a actualizada exitosamente para:', user.email);
    res.json({ message: 'ContraseÃƒÆ’Ã‚Â±a actualizada exitosamente' });

  } catch (error: any) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ Error al cambiar contraseÃƒÆ’Ã‚Â±a:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token invÃƒÆ’Ã‚Â¡lido' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================
// RUTAS DE PROYECTOS
// ============================================

// Obtener proyectos del usuario
app.get('/api/projects', authenticateToken, async (req: any, res): Promise<any> => {
  try {
    let projects = await prisma.project.findMany({
      where: { userId: req.user.userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // ✅ NO crear proyectos automáticamente - dejar que el frontend lo haga
    // El frontend tiene la lógica para crear un proyecto inicial cuando sea necesario

    // Log para debug: contar mensajes con imÃƒÆ’Ã‚Â¡genes
    const totalMessagesWithImages = projects.reduce((acc, p) => 
      acc + p.messages.filter(m => m.imageUrl).length, 0
    );
    console.log(`ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã…Â  GET /api/projects - Mensajes con imageUrl: ${totalMessagesWithImages}`);

    return res.json({ projects });
  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ Error obteniendo proyectos:', error);
    return res.status(500).json({ error: 'Error obteniendo proyectos' });
  }
});

// Crear nuevo proyecto
app.post('/api/projects', authenticateToken, async (req: any, res): Promise<any> => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nombre del proyecto requerido' });
    }

    const project = await prisma.project.create({
      data: {
        name,
        description: description || '',
        userId: req.user.userId
      }
    });

    console.log(`ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Proyecto creado: ${project.name} (ID: ${project.id})`);
    return res.status(201).json({ project });
  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ Error creando proyecto:', error);
    return res.status(500).json({ error: 'Error creando proyecto' });
  }
});

// Actualizar proyecto
app.put('/api/projects/:id', authenticateToken, async (req: any, res): Promise<any> => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    // Verificar que el proyecto pertenece al usuario
    const existingProject = await prisma.project.findFirst({
      where: {
        id: id,
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
        description: description !== undefined ? description : existingProject.description,
        updatedAt: new Date()
      }
    });

    return res.json({ project });
  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ Error actualizando proyecto:', error);
    return res.status(500).json({ error: 'Error actualizando proyecto' });
  }
});

// Eliminar proyecto
app.delete('/api/projects/:id', authenticateToken, async (req: any, res): Promise<any> => {
  try {
    const { id } = req.params;

    // Verificar que el proyecto pertenece al usuario
    const existingProject = await prisma.project.findFirst({
      where: {
        id: id,
        userId: req.user.userId
      }
    });

    if (!existingProject) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    await prisma.project.delete({
      where: { id }
    });

    return res.json({ message: 'Proyecto eliminado correctamente' });
  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ Error eliminando proyecto:', error);
    return res.status(500).json({ error: 'Error eliminando proyecto' });
  }
});

// Obtener mensajes de un proyecto
app.get('/api/projects/:id/messages', authenticateToken, async (req: any, res): Promise<any> => {
  try {
    const { id } = req.params;

    // Verificar que el proyecto pertenece al usuario
    const project = await prisma.project.findFirst({
      where: {
        id: id,
        userId: req.user.userId
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    return res.json({ messages: project.messages });
  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ Error obteniendo mensajes:', error);
    return res.status(500).json({ error: 'Error obteniendo mensajes' });
  }
});

// Agregar mensaje a un proyecto
app.post('/api/projects/:id/messages', authenticateToken, async (req: any, res): Promise<any> => {
  try {
    const { id } = req.params;
    const { role, content, imageUrl, imagePrompt } = req.body;

    // Verificar que el proyecto pertenece al usuario
    const project = await prisma.project.findFirst({
      where: {
        id: id,
        userId: req.user.userId
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    const message = await prisma.message.create({
      data: {
        projectId: id,
        role: role,
        content: content,
        imageUrl: imageUrl || null,
        imagePrompt: imagePrompt || null
      }
    });

    // Actualizar updatedAt del proyecto
    await prisma.project.update({
      where: { id },
      data: { updatedAt: new Date() }
    });

    console.log(`ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Mensaje agregado al proyecto ${project.name}`);
    return res.status(201).json({ message });
  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ Error agregando mensaje:', error);
    return res.status(500).json({ error: 'Error agregando mensaje' });
  }
});

console.log('ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Rutas de proyectos registradas');

// ============================================
// RUTA DE IA CON GEMINI REAL

app.post('/api/ai/generate', aiLimiter, authenticateToken, async (req: any, res): Promise<any> => {
  try {
    console.log('ÃƒÂ°Ã…Â¸Ã‚Â¤Ã¢â‚¬â€œ PeticiÃƒÆ’Ã‚Â³n recibida en /api/ai/generate');
    console.log('ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â Prompt:', req.body.prompt);
    console.log('ÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ‚Â¤ Usuario:', req.user.email);
    console.log('ÃƒÂ°Ã…Â¸Ã¢â‚¬Â Ã¢â‚¬Â ProjectId recibido:', req.body.projectId);
    console.log('ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â¦ Body completo:', JSON.stringify(req.body));
    
    const { prompt, projectId } = req.body;
    
    if (!prompt || !projectId) {
      return res.status(400).json({ error: 'Prompt y projectId requeridos' });
    }

    // Obtener usuario actualizado de la BD
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    console.log(`ÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ‚Â¤ Usuario: ${user.email} - Plan: ${user.plan} - CrÃƒÆ’Ã‚Â©ditos: ${user.imagesRemaining}`);

    // NO validar crÃƒÆ’Ã‚Â©ditos aquÃƒÆ’Ã‚Â­ - solo validamos despuÃƒÆ’Ã‚Â©s si va a generar imagen
    // El chat normal y anÃƒÆ’Ã‚Â¡lisis de imÃƒÆ’Ã‚Â¡genes son GRATIS

    // Verificar que el proyecto existe y pertenece al usuario
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.id
      }
    });

    if (!project) {
      console.log(`ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Proyecto no encontrado. ProjectId: ${projectId}, UserId: ${user.id}`);
      
      // Listar proyectos del usuario para debugging
      const userProjects = await prisma.project.findMany({
        where: { userId: user.id },
        select: { id: true, name: true }
      });
      
      console.log(`ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã¢â‚¬Â¹ Proyectos del usuario:`, userProjects);
      
      return res.status(404).json({ 
        error: 'Proyecto no encontrado',
        details: 'El proyecto no existe o no pertenece a tu usuario',
        availableProjects: userProjects
      });
    }

    console.log('ÃƒÂ°Ã…Â¸Ã…Â¡Ã¢â€šÂ¬ Llamando a Gemini...');

    // Procesar imágenes del usuario
    let images = [];
    if (req.body.images && req.body.images.length > 0) {
      console.log(`📸 Usuario envió ${images.length} imagen(es)`);
      images = req.body.images;
    }

    // 🧠 MEMORIA VISUAL - Sistema inteligente
    console.log('🧠 Obteniendo memoria visual del proyecto...');
    const visualContext = await visualMemory.getVisualContext(projectId, 5);
    const useContext = visualMemory.shouldUseVisualContext(prompt, visualContext.totalImages > 0);
    const systemPrompt = visualMemory.buildEnhancedSystemPrompt(useContext);
    const contentParts = visualMemory.prepareGeminiContent(prompt, images, visualContext, useContext);

    console.log('🚀 Llamando a Gemini con memoria visual...');

    // Cargar últimos 5 mensajes para contexto conversacional
    const conversationHistory = await prisma.message.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { role: true, content: true }
    });

    conversationHistory.reverse();
    console.log(`🧠 Contexto: ${conversationHistory.length} mensajes`);
    
    // Llamar a Gemini con memoria visual + contexto
    const geminiResponse = await vertexAI.generateChatResponse(prompt, {
      temperature: 0.9,
      maxTokens: 2048,
      images: images,
      conversationHistory: conversationHistory,
      systemPrompt: systemPrompt,
      contentParts: contentParts
    });

    if (!geminiResponse.success) {
      throw new Error(geminiResponse.error || 'Error generando respuesta de IA');
    }

    const aiResponseText = geminiResponse.text;
    console.log('ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Respuesta de Gemini recibida:', aiResponseText.slice(0, 100) + '...');

    // ÃƒÂ¢Ã…â€œÃ‚Â¨ SIMPLIFICADO: Extraer imagen directamente de la respuesta de Gemini (si la generÃƒÆ’Ã‚Â³)
    let generatedImageUrl = geminiResponse.imageUrl || null;
    let imageBase64 = geminiResponse.imageBase64 || null;
    
    // Detectar si el prompt querÃƒÆ’Ã‚Â­a generar una imagen
    const promptWantsImage = !!generatedImageUrl;
    
    if (generatedImageUrl) {
      console.log('ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¨ Gemini generÃƒÆ’Ã‚Â³ una imagen');
    }

    // Guardar mensaje del usuario CON imágenes en BD
    await prisma.message.create({
      data: {
        projectId: project.id,
        role: 'user',
        content: prompt,
        uploadedImages: images.length > 0 ? JSON.stringify(images) : null
      }
    });
    
    console.log(`✅ Mensaje usuario guardado con ${images.length} imágenes en BD`);

    // Guardar mensaje de la IA en BD (con imagen si se generÃƒÆ’Ã‚Â³)
    const aiMessage = await prisma.message.create({
      data: {
        projectId: project.id,
        role: 'assistant',
        content: aiResponseText,
        imageUrl: generatedImageUrl, // URL de la imagen si se generÃƒÆ’Ã‚Â³
        imagePrompt: promptWantsImage ? prompt : null
      }
    });

    // ✅ SISTEMA COMERCIAL - Descontar créditos si genera imagen
    let updatedUser = user;
    let creditUsed = false;

    // 🔍 DEBUG - Ver qué está pasando
    console.log('🔍 DEBUG - promptWantsImage:', promptWantsImage);
    console.log('🔍 DEBUG - generatedImageUrl:', generatedImageUrl);
    console.log('🔍 DEBUG - generatedImageUrl length:', generatedImageUrl?.length || 0);
    console.log('🔍 DEBUG - Entrar en bloque de cobro?', !!(promptWantsImage && generatedImageUrl));

    if (promptWantsImage && generatedImageUrl) {
      // ✅ Verificar que el usuario tenga créditos
      if (user.imagesRemaining <= 0) {
        return res.status(400).json({ 
          error: 'Sin créditos disponibles',
          message: 'Actualiza tu plan para seguir generando imágenes',
          imagesRemaining: 0
        });
      }

      console.log('💳 Imagen generada - Decrementando crédito');
      console.log(`   Créditos antes: ${user.imagesRemaining}`);
      
      // ✅ Descontar crédito
      updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          imagesRemaining: user.imagesRemaining - 1,
          imagesUsedThisMonth: user.imagesUsedThisMonth + 1
        }
      });

      console.log(`   Créditos después: ${updatedUser.imagesRemaining}`);
      
      // Guardar generación en el historial
      await prisma.generation.create({
        data: {
          userId: user.id,
          prompt: prompt,
          imageUrl: generatedImageUrl || 'data:image/png;base64,...',
          cost: 1 // ✅ Costo real: 1 crédito
        }
      });

      creditUsed = true; // ✅ Crédito cobrado
    } else {
      console.log('💬 Solo texto, chat normal (sin cobro)');
    }

    // Actualizar updatedAt del proyecto
    await prisma.project.update({
      where: { id: project.id },
      data: { updatedAt: new Date() }
    });

    console.log('ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Respuesta procesada y guardada en BD');
    console.log('ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â¤ Enviando al frontend - imageUrl:', generatedImageUrl ? 'SÃƒÆ’Ã‚Â' : 'NO');
    console.log('ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â¤ ImageUrl length:', generatedImageUrl?.length || 0);

    return res.json({
      success: true,
      imageUrl: generatedImageUrl, // URL de la imagen generada (si existe)
      imageBase64: imageBase64, // Base64 de la imagen (si existe)
      imagesRemaining: updatedUser.imagesRemaining,
      creditUsed: creditUsed,
      aiMessage: {
        id: aiMessage.id,
        role: 'assistant',
        content: aiResponseText,
        imageUrl: generatedImageUrl, // Incluir la imagen en el mensaje
        imagePrompt: promptWantsImage ? prompt : null,
        createdAt: aiMessage.createdAt
      },
      metadata: {
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
        modelType: 'unified',
        tokensUsed: geminiResponse.metadata?.tokensUsed || 0,
        hasImage: !!generatedImageUrl,
        imagesReceived: images.length,
        contextMessages: conversationHistory.length,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error: any) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ Error en /api/ai/generate:', error);
    return res.status(500).json({ 
      error: 'Error generando respuesta de IA',
      details: error.message 
    });
  }
});

console.log('ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Ruta /api/ai/generate registrada con Gemini REAL');

// ✨ NUEVO: Endpoint para mejorar prompts con Gemini Flash (rápido y barato)
app.post('/api/ai/enhance-prompt', authenticateToken, async (req: any, res): Promise<any> => {
  try {
    const { prompt } = req.body;
    
    if (!prompt || prompt.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: 'Prompt muy corto para mejorar'
      });
    }
    
    console.log('✨ Mejorando prompt:', prompt.slice(0, 100));
    
    // System prompt ultra-especializado para Dazly
    const enhancerSystemPrompt = `Eres un experto en prompts de generación de imágenes con IA para Dazly.

TU MISIÓN:
Transformar prompts simples en prompts PROFESIONALES y DETALLADOS para generación de imágenes.

REGLAS IMPORTANTES:
1. SOLO devuelve el prompt mejorado, SIN explicaciones adicionales
2. NO uses comillas ni formato especial
3. El prompt debe ser directo y listo para usar
4. Mantén el idioma original (español/inglés)
5. Sé específico en colores, estilos, composición y mood

ESTRUCTURA DE UN BUEN PROMPT:
- Sujeto principal (qué es)
- Estilo visual (fotorrealismo, ilustración, 3D, minimalista, etc.)
- Colores dominantes y paleta
- Composición y encuadre
- Iluminación y atmósfera
- Detalles técnicos (resolución, calidad)
- Mood o emoción que transmite

EJEMPLOS DE TRANSFORMACIÓN:

Input: "logo para cafetería"
Output: Logo minimalista para cafetería moderna, icono de taza de café estilizada con vapor, paleta de colores tierra (marrón cálido #8B4513, beige cremoso #F5DEB3), tipografía sans-serif limpia, diseño vectorial flat, fondo blanco limpio, composición centrada, estilo contemporáneo y acogedor

Input: "banner de venta"
Output: Banner publicitario de venta de verano, diseño vibrante y llamativo, gran texto "SALE 50% OFF" en tipografía bold moderna, colores neón (rosa #FF1493, amarillo #FFD700, azul eléctrico #00BFFF), elementos gráficos de rayos y estrellas, composición dinámica diagonal, fondo degradado colorido, estilo pop art moderno, alta energía visual

Input: "paisaje montañas"
Output: Paisaje épico de montañas nevadas al atardecer, picos majestuosos con nieve brillante, cielo dramático con nubes rosadas y naranjas, luz dorada del sol poniente, lago cristalino en primer plano reflejando las montañas, composición panorámica wide-angle, profundidad de campo amplia, estilo fotorrealista, atmósfera serena y majestuosa, colores cálidos y fríos balanceados

CAMPOS DE DISEÑO QUE DOMINAS:
- Marketing y publicidad (banners, ads, CTA)
- Branding (logos, identidad corporativa)
- Social media (posts, stories, covers)
- Ilustración (digital, tradicional, conceptual)
- Diseño web (heroes, backgrounds, UI elements)
- Editorial (portadas, posters, flyers)
- Packaging (productos, etiquetas)
- Arte digital (3D, fantasy, sci-fi)

VOCABULARIO PROFESIONAL:
- Estilos: minimalista, maximalista, flat design, material design, glassmorphism, neumorphism, retro, vintage, cyberpunk, art deco, bauhaus
- Técnicas: fotorrealismo, ilustración vectorial, render 3D, acuarela digital, línea limpia, double exposure, collage
- Composición: regla de tercios, simetría, asimetría, espacio negativo, punto focal, jerarquía visual
- Iluminación: luz natural, golden hour, luz dramática, contraluz, rim light, soft light, hard light
- Mood: elegante, enérgico, sereno, dramático, lúdico, profesional, acogedor, futurista

¡Ahora mejora el siguiente prompt!`;

    // Llamar a Gemini Flash (modelo rápido y económico)
    const response = await vertexAI.generateChatResponse(enhancerSystemPrompt + '\n\nPrompt original: ' + prompt, {
      temperature: 0.8,
      maxTokens: 300,
      conversationHistory: []
    });
    
    if (response.success && response.text) {
      const enhancedPrompt = response.text.trim();
      
      console.log('✅ Prompt mejorado:', enhancedPrompt.slice(0, 100));
      
      return res.json({
        success: true,
        originalPrompt: prompt,
        enhancedPrompt: enhancedPrompt
      });
    } else {
      throw new Error('No se pudo mejorar el prompt');
    }
    
  } catch (error: any) {
    console.error('❌ Error mejorando prompt:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error al mejorar el prompt',
      details: error.message
    });
  }
});

// Health check
// 📊 Endpoint para ver estadísticas del sistema optimizado (solo admins o dev)
app.get('/api/system/stats', (_req, res) => {
  try {
    // Verificar si vertexAI tiene método getStats (solo en versión optimizada)
    if (typeof vertexAI.getStats === 'function') {
      const stats = vertexAI.getStats();
      res.json({
        success: true,
        optimized: true,
        timestamp: new Date().toISOString(),
        stats: stats
      });
    } else {
      // Versión no optimizada
      res.json({
        success: true,
        optimized: false,
        message: 'Sistema no optimizado. Usa SWITCH_TO_OPTIMIZED.bat para activar el sistema optimizado.',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ✅ GRACEFUL SHUTDOWN - Cerrar conexiones correctamente
process.on('SIGINT', async () => {
  console.log('🛑 Cerrando servidor gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Cerrando servidor gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// --- ARRANCAR EL SERVIDOR ---
const PORT = process.env.PORT || 8081;
app.listen(PORT, async () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:8080'}`);
  console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? 'Configured' : 'Missing'}`);
  console.log(`🔑 Google OAuth: ${process.env.GOOGLE_CLIENT_ID ? 'Configured' : 'Missing'}`);
  
  // ✅ Test de conexión a la base de datos
  try {
    await prisma.$connect();
    console.log('✅ Base de datos conectada correctamente');
    console.log('💡 Pool de conexiones Prisma configurado para concurrencia');
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error);
  }
});
