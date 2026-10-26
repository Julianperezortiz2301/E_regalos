# Certificado público de Supabase

`supabase-ca.crt` permite verificar el servidor al conectar con PostgreSQL mediante TLS. Es un certificado público, no contiene contraseñas y se incluye también en Docker.

Se descargó de la distribución de Supabase y se comprobó que coincide con el certificado de su repositorio oficial:

- https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt
- https://github.com/supabase/cli/blob/develop/apps/cli-go/internal/gen/types/templates/prod-ca-2021.crt

Huella SHA-256: `80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`.

El código lee este archivo en `database.js` y mantiene activa la validación del certificado. Si Supabase cambia su autoridad certificadora, descarga el certificado actualizado desde Database Settings y reemplaza el archivo.
