# Configuración de Variables de Entorno

Este proyecto **no incluye credenciales** en el repositorio. Todas las variables sensibles se gestionan mediante archivos `.env` locales que están ignorados por Git.

## Archivos

- `.env.example` — Plantilla con nombres de variables y valores ficticios.
- `.env` — Archivo local con credenciales reales. **Nunca se sube a Git**.
- `.env.production` — Archivo de despliegue local. **Nunca se sube a Git**.

## Variables requeridas

Copia `.env.example` a `.env` y completa los valores:

```bash
cp .env.example .env
```

Las variables obligatorias son:

- `DATABASE_URL`
- `JWT_SECRET` (mínimo 32 caracteres)
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CLOUD_PROJECT_ID`
- `STRIPE_SECRET_KEY`

## Credenciales de Google Cloud

Puedes usar una de estas dos opciones:

```env
# Opción A: ruta a archivo JSON
GOOGLE_APPLICATION_CREDENTIALS=./ruta-a-tu-service-account.json

# Opción B: JSON como string (Railway, producción)
GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account",...}'
```

## Reglas de seguridad

1. No commitees `.env`, `.env.production` ni archivos JSON de service account.
2. Rota cualquier credencial que haya podido exponerse.
3. En producción, inyecta las variables desde el panel de la plataforma de despliegue (Railway, etc.).
