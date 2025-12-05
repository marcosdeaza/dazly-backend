# 📋 CONFIGURACIÓN DE VARIABLES DE ENTORNO

## 🎯 Archivos de Configuración

### `.env.production` ⭐ (NUEVO)
**Archivo con TODOS los datos reales de producción**

Este archivo contiene todas las credenciales reales:
- ✅ Base de datos Neon PostgreSQL
- ✅ JWT Secret real
- ✅ Google OAuth configurado
- ✅ Stripe LIVE keys (producción)
- ✅ Stripe Price IDs reales
- ✅ Vertex AI configurado
- ✅ CORS con dazly.art

**Railway lo usará automáticamente desde GitHub**

---

### `.env.example`
**Plantilla para desarrolladores**

Archivo de ejemplo con placeholders para desarrollo local.

---

### `.env.example.OLD`
**Backup del archivo antiguo**

Guardado como referencia histórica.

---

## 🚀 USO EN RAILWAY

Railway detectará automáticamente el archivo `.env.production` y cargará todas las variables desde ahí.

**NO necesitas configurar variables manualmente en Railway Dashboard** (excepto `GOOGLE_APPLICATION_CREDENTIALS_JSON` que es muy largo).

---

## 🔐 ÚNICA VARIABLE QUE FALTA

Solo necesitas configurar en **Railway Dashboard → Variables**:

```env
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"dazly-84a82",...}
```

Esta es el JSON completo del service account de Google Cloud.

---

## ✅ VENTAJAS DE ESTE SISTEMA

1. ✅ **Un solo lugar:** Todas las variables en `.env.production`
2. ✅ **Automático:** Railway las carga desde GitHub
3. ✅ **Sin errores:** No hay que copiar/pegar manualmente
4. ✅ **Actualizable:** Cambias el archivo y haces push
5. ✅ **Versionado:** Git guarda historial de cambios

---

## 🎯 SIGUIENTE PASO

Solo haz:

```bash
git add .
git commit -m "Add: .env.production con todos los datos reales"
git push
```

Railway detectará el archivo y cargará automáticamente todas las variables.

---

## ⚠️ IMPORTANTE

El archivo `.env.production` contiene credenciales reales. Asegúrate de que:

1. ✅ **Está en tu repositorio PRIVADO**
2. ✅ **NO lo compartas públicamente**
3. ✅ **Solo tu equipo tiene acceso**

---

**¡Listo para deploy con esteroides!** 🚀
