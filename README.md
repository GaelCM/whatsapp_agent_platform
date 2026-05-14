# Agente de WhatsApp (Meta Cloud API)

Un agente de WhatsApp completo construido en **Next.js 16**, usando la **API Oficial de WhatsApp (Cloud API)** de Meta, almacenamiento persistente en **SQLite**, y un modelo de lenguaje vía **OpenRouter** para respuestas automáticas.

## Requisitos Previos

- Node.js >= 20.9 (Recomendado 22)
- Cuenta en [Meta for Developers](https://developers.facebook.com/)
- Cuenta en [OpenRouter](https://openrouter.ai/) para la IA

## Instalación y Desarrollo Local

1. Instala las dependencias:
   ```bash
   npm install
   ```

2. Inicia el servidor de desarrollo en background o en una terminal:
   ```bash
   npm run dev
   ```

3. Como Meta exige HTTPS para los webhooks, necesitas exponer tu puerto 3000. Abre otra terminal y usa ngrok:
   ```bash
   ngrok http 3000
   ```
   > Copia la URL HTTPS que te da ngrok (ej: `https://abc1234.ngrok-free.app`).

4. Abre tu navegador en `http://localhost:3000`. Al no tener las credenciales configuradas todavía, verás la **Pantalla de Configuración**.

## Configuración en Meta for Developers

Sigue estos pasos cuidadosamente:

1. Ve a [Meta for Developers](https://developers.facebook.com/) y crea una app.
2. Agrega el producto **WhatsApp** a tu app.
3. En el menú izquierdo, ve a **App Dashboard → Settings → Basic** y copia tu **App Secret** (`META_APP_SECRET`).
4. Ve a **WhatsApp → API Setup** y copia el **Phone Number ID** y el **WhatsApp Business Account ID** (`META_PHONE_NUMBER_ID` y `META_WABA_ID`).
5. **CRÍTICO:** Los tokens de prueba expiran en 24h. Para evitar que el bot se rompa en producción, ve a **Business Settings → System Users** y genera un **System User Token permanente** con permisos para `whatsapp_business_messaging` y `whatsapp_business_management`. Ese es tu `META_ACCESS_TOKEN`.
6. En el dashboard de Meta, ve a **WhatsApp → Configuration** y haz clic en **Edit** bajo Webhook.
   - Pega la URL de ngrok agregando `/api/webhook` al final (ej: `https://abc1234.ngrok-free.app/api/webhook`).
   - Escribe un Token de Verificación (inventa una palabra clave o contraseña). Ese será tu `META_VERIFY_TOKEN`.
7. Suscribe el webhook al campo `messages` de tu número.

## Variables de Entorno

Una vez que tengas los datos, renombra `.env.example` a `.env.local` y complétalo:

```env
# Meta WhatsApp Cloud API
META_ACCESS_TOKEN=TU_SYSTEM_USER_TOKEN
META_PHONE_NUMBER_ID=TU_PHONE_ID
META_WABA_ID=TU_WABA_ID
META_APP_SECRET=TU_APP_SECRET
META_VERIFY_TOKEN=TU_PALABRA_CLAVE_ELEGIDA
META_GRAPH_VERSION=v21.0

# OpenRouter
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=openai/gpt-4o-mini
```

Vuelve a la pestaña de `http://localhost:3000` y recarga. Si los datos son correctos, entrarás al Dashboard directamente.

## Personalización del Agente (System Prompt)

El comportamiento de la IA se define en `src/lib/system-prompt.ts`. Edita este archivo para configurar las instrucciones, tono, nombre de la empresa y restricciones del asistente.

## Limitaciones Conocidas (Regla de 24 horas)

La API Cloud de WhatsApp prohíbe a los negocios enviar mensajes de texto libre si han pasado más de 24 horas desde que el usuario interactuó por última vez.
Si intentas responder manualmente desde el Dashboard a un usuario cuya última interacción fue hace más de 24h, recibirás un error indicando que estás fuera de la ventana permitida. En esos casos, es obligatorio usar plantillas preaprobadas por Meta (no incluidas en esta v1).

## Despliegue en Producción (EasyPanel)

El proyecto incluye los archivos `Procfile` y `nixpacks.toml` listos para ser desplegado en servicios como EasyPanel.
El sistema almacena la base de datos SQLite de forma local en la carpeta `data/messages.db`. Asegúrate de usar un **volumen persistente** mapeado a `/app/data` para no perder el historial de chats en los reinicios.
