# Hackatec

Aplicacion React/Vite con funciones serverless de Vercel.

## Publicar vacantes como empresa

En Supabase, asegúrate de haber aplicado `SQL/migracion_empresas.sql` y `SQL/migracion_empleos.sql`, y ejecuta `SQL/migracion_registro_empresas.sql`. Esta última crea el registro de empresa al crear una cuenta empresarial y repara cuentas previas cuando sus datos están disponibles en los metadatos de Auth. Las cuentas anteriores sin esos datos podrán completar el perfil empresarial al iniciar sesión.

## Generar planes de estudio

1. Ejecuta `SQL/migracion_planes_estudio.sql` en el SQL Editor de Supabase.
2. Configura en Vercel `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `GEMINI_API_KEY`. La clave `SUPABASE_SERVICE_ROLE_KEY` se utiliza solo en las funciones serverless; no la expongas con prefijo `VITE_`.
3. El alumno guarda sus calificaciones para un periodo y pulsa **Generar plan de estudio**. `POST /api/study-plan` valida su token, consulta sus notas guardadas y el temario de su carrera, genera un plan y lo guarda en `planes_estudio`.

Se guarda un plan por alumno y periodo. Volver a generarlo para el mismo periodo actualiza ese plan.

Para habilitar planes de mejora asociados a vacantes, ejecuta también `SQL/migracion_planes_vacantes.sql` en el SQL Editor de Supabase.
