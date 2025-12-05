// src/middleware/auth.ts

import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: any;
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    // Verificar y decodificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Obtener datos actualizados del usuario
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        plan: true,
        imagesRemaining: true,
        imagesUsedThisMonth: true,
        subscriptionStatus: true,
        stripeCustomerId: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    // Agregar usuario a la request
    req.user = user;
    next();

  } catch (error) {
    console.error('Error en autenticación:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expirado' });
    }

    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const generateToken = (user: any): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET no está configurado');
  }
  
  const payload = {
    userId: user.id,
    email: user.email,
    plan: user.plan,
    imagesRemaining: user.imagesRemaining,
    imagesUsedThisMonth: user.imagesUsedThisMonth,
    subscriptionStatus: user.subscriptionStatus
  };
  
  // @ts-ignore - TypeScript tiene problemas con los overloads de jwt.sign
  return jwt.sign(payload, process.env.JWT_SECRET, { 
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};