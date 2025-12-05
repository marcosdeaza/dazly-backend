// src/routes/stripe.js

const express = require('express');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const router = express.Router();
const prisma = new PrismaClient();

// Plan mapping to Stripe Price IDs
const STRIPE_PRICE_IDS = {
<<<<<<< HEAD
  xmas: process.env.STRIPE_XMAS_PRICE_ID || 'price_xmas_placeholder', // 🎄 Plan Navidad
=======
>>>>>>> ea0ff45c4b33188167c89bc8f299ff27870f41d1
  pulse: process.env.STRIPE_PULSE_PRICE_ID || 'price_pulse_placeholder',
  flow: process.env.STRIPE_FLOW_PRICE_ID || 'price_flow_placeholder',
  summit: process.env.STRIPE_SUMMIT_PRICE_ID || 'price_summit_placeholder',
  peak: process.env.STRIPE_PEAK_PRICE_ID || 'price_peak_placeholder',
  infinity: process.env.STRIPE_INFINITY_PRICE_ID || 'price_infinity_placeholder'
};

// Plan images mapping
const PLAN_IMAGES = {
<<<<<<< HEAD
  free: 5, // 🎁 Actualizado: 5 imágenes gratis al mes
  xmas: 25, // 🎄 Plan especial Navidad
=======
  free: 3,
>>>>>>> ea0ff45c4b33188167c89bc8f299ff27870f41d1
  pulse: 50,
  flow: 150,
  summit: 350,
  peak: 700,
  infinity: 1500
};

// Middleware de autenticación
const authenticateToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// Create Checkout Session
router.post('/create-session', authenticateToken, async (req, res) => {
  try {
    const { planId } = req.body;
    const user = req.user;

    if (!planId || !STRIPE_PRICE_IDS[planId]) {
      return res.status(400).json({ error: 'Plan inválido' });
    }

    // Crear o obtener customer de Stripe
    let customerId = user.stripeCustomerId;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id
        }
      });
      
      customerId = customer.id;
      
      // Actualizar usuario con el customer ID
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId }
      });
    }

    // Crear sesión de checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: STRIPE_PRICE_IDS[planId],
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/account?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/plans`,
      metadata: {
        userId: user.id,
        planId: planId
      }
    });

    res.json({
      sessionId: session.id,
      sessionUrl: session.url
    });

  } catch (error) {
    console.error('Error creando sesión de Stripe:', error);
    res.status(500).json({ error: 'Error al crear sesión de pago' });
  }
});

// Customer Portal
router.post('/customer-portal', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    if (!user.stripeCustomerId) {
      return res.status(400).json({ error: 'No tienes una suscripción activa' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/account`,
    });

    res.json({
      portalUrl: session.url
    });

  } catch (error) {
    console.error('Error creando portal del cliente:', error);
    res.status(500).json({ error: 'Error al acceder al portal de facturación' });
  }
});

// Webhook para manejar eventos de Stripe
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Manejar eventos
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      await handleSuccessfulPayment(session);
      break;

    case 'invoice.payment_succeeded':
      const invoice = event.data.object;
      await handleInvoicePayment(invoice);
      break;

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      const subscription = event.data.object;
      await handleSubscriptionChange(subscription);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// Funciones auxiliares para manejar webhooks
async function handleSuccessfulPayment(session) {
  try {
    const userId = session.metadata.userId;
    const planId = session.metadata.planId;

    await prisma.user.update({
      where: { id: userId },
      data: {
        plan: planId,
        imagesRemaining: PLAN_IMAGES[planId],
        imagesUsedThisMonth: 0,
        subscriptionStatus: 'active',
        stripeSubscriptionId: session.subscription
      }
    });

    console.log(`Plan actualizado para usuario ${userId} a ${planId}`);
  } catch (error) {
    console.error('Error actualizando plan:', error);
  }
}

async function handleInvoicePayment(invoice) {
  try {
    const customerId = invoice.customer;
    
    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: customerId }
    });

    if (user && invoice.status === 'paid') {
      // Renovar créditos mensuales
      await prisma.user.update({
        where: { id: user.id },
        data: {
          imagesRemaining: PLAN_IMAGES[user.plan] || PLAN_IMAGES.free,
          imagesUsedThisMonth: 0
        }
      });

      console.log(`Créditos renovados para usuario ${user.id}`);
    }
  } catch (error) {
    console.error('Error renovando créditos:', error);
  }
}

async function handleSubscriptionChange(subscription) {
  try {
    const customerId = subscription.customer;
    
    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: customerId }
    });

    if (user) {
      const subscriptionStatus = subscription.status === 'active' ? 'active' : 'inactive';
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionStatus,
          ...(subscriptionStatus === 'inactive' && {
            plan: 'free',
            imagesRemaining: PLAN_IMAGES.free
          })
        }
      });

      console.log(`Suscripción actualizada para usuario ${user.id}: ${subscriptionStatus}`);
    }
  } catch (error) {
    console.error('Error actualizando suscripción:', error);
  }
}

module.exports = router;