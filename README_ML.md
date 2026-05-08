# Mercado Libre OAuth - Recuperacion de conexion

Si la conexion con Mercado Libre falla (por ejemplo, refresh token invalido), segui estos pasos:

1. Verificar estado actual
   - Abri `GET /api/status` y `GET /api/test-meli`.
   - Si `mercadolibre.valid` es `false`, continua con la reautorizacion.

2. Reautorizar desde la app
   - Ingresar a `https://www.mejoria.com.ar/profile`.
   - Click en **Conectar Mercado Libre** (o **Renovar conexion**).
   - Completar autorizacion en Mercado Libre y volver al callback.

3. Confirmar recuperacion
   - Revisar logs de Railway buscando:
     - `🔄 Refreshing Token...`
     - `✅ Token Refreshed`
   - Ejecutar nuevamente `GET /api/test-meli`.
   - Esperado: `ok: true` y `connected: true`.

4. Si sigue fallando
   - Confirmar variables en Railway:
     - `MERCADOLIBRE_APP_ID`
     - `MERCADOLIBRE_SECRET_KEY`
     - `MERCADOLIBRE_REDIRECT_URI`
     - `JWT_SECRET`
     - `MONGODB_URI`
   - Validar que la Redirect URI registrada en Mercado Libre coincida exactamente con:
     - `https://www.mejoria.com.ar/auth/callback`
