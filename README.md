# MiniBlog API

API REST educativa en **Node.js + Express + PostgreSQL**, con SQL directo usando `pg`.
Incluye CRUD de autores y posts, comentarios, validaciones, tests con Supertest y documentación OpenAPI 3.0.

**Demo en Railway:** [Swagger UI](https://miniblog-api-production-5675.up.railway.app/docs/) · [Estado de la API](https://miniblog-api-production-5675.up.railway.app/health)

## Requisitos

- Node.js 22 o superior y npm.
- PostgreSQL 16 o superior. Como alternativa, Docker Desktop para levantar la base con Compose.
- Git y una cuenta GitHub para versionar; Railway para desplegar.

## Ejecutar localmente

Desde la carpeta del proyecto:

```bash
npm ci
cp .env.example .env
```

En Windows PowerShell, el segundo comando es `Copy-Item .env.example .env`.

Si tenés Docker Desktop:

```bash
docker compose up -d --wait
npm run db:setup
npm run db:seed
npm run dev
```

Si usás PostgreSQL instalado, creá una base `miniblog` con tu usuario y contraseña y ajustá `DATABASE_URL` en `.env` antes de ejecutar `db:setup`.

- API: http://localhost:3000
- Swagger UI: http://localhost:3000/docs/
- OpenAPI: http://localhost:3000/openapi.json
- Salud de API y conexión: http://localhost:3000/health

`npm start` ejecuta la aplicación sin reinicio automático; `npm run dev` observa cambios.
El setup y el seed son repetibles y no borran datos existentes. El seed es opcional y contiene datos ficticios.
El setup crea el esquema inicial: para cambios futuros de columnas se deben agregar migraciones explícitas; `IF NOT EXISTS` no modifica tablas existentes.

## Estructura

| Ubicación | Responsabilidad |
|---|---|
| `src/app.js` | Construcción de Express, documentación y middleware global |
| `src/server.js` | Arranque HTTP y apagado ordenado |
| `src/config/db.js` | Pool de conexiones PostgreSQL |
| `src/routes/index.js` | Endpoints y respuestas HTTP |
| `src/services/` | Consultas SQL parametrizadas |
| `src/middlewares/` | Validación y manejo centralizado de errores |
| `sql/setup.sql`, `sql/seed.sql` | Esquema y datos de ejemplo |
| `scripts/` | Comandos de base de datos y pruebas embebidas |
| `tests/` | Tests unitarios y de integración |
| `openapi.json` | Contrato completo de la API |
| `railway.json` | Configuración de despliegue |
| `.github/workflows/test.yml` | CI con PostgreSQL 16 |

## Modelo y decisiones

- `authors`: `id`, `name`, `email`, `bio`, `created_at`.
- `posts`: `id`, `author_id`, `title`, `content`, `published`, `created_at`.
- `comments`: `id`, `post_id`, `author_id`, `content`, `created_at`.

La consigna menciona `users.id` para la FK, pero define `authors`. Se interpreta como **`posts.author_id → authors.id`**. No hay una tabla `users` duplicada.

Un autor tiene muchos posts y comentarios. Un post tiene muchos comentarios. Todas las FKs usan `ON DELETE CASCADE`: al borrar un post desaparecen sus comentarios; al borrar un autor desaparecen sus posts, los comentarios de esos posts y los comentarios que escribió en otros posts. Los posts de otros autores se conservan.

Hay índices para las claves foráneas y un índice único de `lower(email)`. El email no distingue mayúsculas. La API normaliza espacios y email; la base protege NOT NULL, contenido no vacío, unicidad y relaciones.

Los IDs son enteros positivos de 32 bits. `author_id` y `post_id` en JSON deben ser números, no strings. `published` debe ser booleano.

`PUT` reemplaza los campos editables: requiere los campos obligatorios; si se omite `bio` se guarda `""`, y si se omite `published` se guarda `false`. No cambia `id` ni `created_at`. Los campos desconocidos se rechazan.

Los listados devuelven arrays ordenados por ID y `[]` cuando no hay elementos. Los endpoints relacionados devuelven 404 cuando el autor/post padre no existe.

## Endpoints

| Método | Ruta | Éxito |
|---|---|---|
| GET | `/authors` | 200, autores |
| GET | `/authors/:id` | 200, autor |
| POST | `/authors` | 201, autor creado + Location |
| PUT | `/authors/:id` | 200, autor actualizado |
| DELETE | `/authors/:id` | 204, sin cuerpo |
| GET | `/posts` | 200, posts |
| GET | `/posts/:id` | 200, post |
| GET | `/posts/author/:authorId` | 200, posts con objeto `author` completo |
| POST | `/posts` | 201, post creado + Location |
| PUT | `/posts/:id` | 200, post actualizado |
| DELETE | `/posts/:id` | 204, sin cuerpo |
| GET | `/comments` | 200, comentarios |
| POST | `/comments` | 201, comentario creado |
| GET | `/posts/:id/comments` | 200, comentarios del post |
| GET | `/health` | 200, base accesible |

Errores: `400` para validación, JSON malformado, email duplicado o FK inexistente; `404` para ruta/recurso ausente; `500` para fallos inesperados. Un cuerpo mayor a 100 KB devuelve `413`. Formato: `{"error":"Descripción"}`. Los errores internos no exponen consultas, credenciales ni stack traces.

## Probar con Swagger o curl

Swagger permite probar todos los endpoints desde `/docs/`. En PowerShell usá `curl.exe` o Swagger para evitar diferencias de comillas.

```bash
curl -X POST http://localhost:3000/authors \
  -H 'Content-Type: application/json' \
  -d '{"name":"Nico","email":"nico@example.com","bio":"Estudiante"}'

curl -X POST http://localhost:3000/posts \
  -H 'Content-Type: application/json' \
  -d '{"author_id":1,"title":"Mi primer post","content":"Hola MiniBlog","published":true}'

curl http://localhost:3000/posts/author/1

curl -X POST http://localhost:3000/comments \
  -H 'Content-Type: application/json' \
  -d '{"post_id":1,"author_id":1,"content":"Primer comentario"}'

curl -X PUT http://localhost:3000/posts/1 \
  -H 'Content-Type: application/json' \
  -d '{"author_id":1,"title":"Editado","content":"Texto actualizado","published":false}'

curl -i -X DELETE http://localhost:3000/posts/1
```

Reemplazá los IDs del ejemplo por los devueltos al crear los recursos. El seed puede haber ocupado los primeros IDs.

## Pruebas

```bash
npm test
npm run test:embedded
```

- `npm test`: tests unitarios de rutas/validaciones con servicios simulados, pruebas de parametrización de services y validación de OpenAPI. No requiere base de datos.
- `npm run test:embedded`: escenario completo con Supertest sobre PostgreSQL embebido en WASM (PGlite), sin Docker. Ejecuta realmente SQL, FKs, índice único, joins y cascadas. No verifica la conexión TCP de `pg`.
- `npm run test:integration`: el mismo escenario contra un servidor PostgreSQL real usando `pg` y `TEST_DATABASE_URL`. Falla explícitamente si falta esa variable.

Para integración nativa con Docker:

```bash
docker compose exec db createdb -U miniblog miniblog_test
npm run test:integration
```

Si la base de test ya existe, no repitas `createdb`. La URL de ejemplo está en `.env.example`. Usá una base dedicada a tests: la suite crea un esquema temporal independiente, lo elimina al finalizar y no trunca las tablas de la aplicación. Si el proceso se corta abruptamente, puede quedar un esquema `miniblog_test_*` para limpiar en esa base.

La suite cubre CRUD de autores/posts, comentarios, campos vacíos, tipos, IDs inválidos, email duplicado al crear/editar, FKs inexistentes, listas vacías, 404, 500, SQL parametrizado, joins, seed repetible y cascadas cruzadas entre autores. GitHub Actions ejecuta unitarios e integración con PostgreSQL 16 en cada push/PR.

## Despliegue en Railway

1. Subí este proyecto a un repositorio GitHub con `package.json` en la raíz.
2. Creá un proyecto Railway y agregá PostgreSQL desde la plantilla oficial.
3. Agregá un servicio desde el repositorio GitHub y seleccioná la rama `main`.
4. En **Variables** del servicio API, agregá `DATABASE_URL` como referencia a la variable del servicio PostgreSQL. Si el servicio se llama `Postgres`, la referencia es `${{Postgres.DATABASE_URL}}`.
5. Configurá `NODE_ENV=production`. Railway proporciona `PORT`; la API escucha en `0.0.0.0`.
6. En **Settings → Deploy** del servicio, guardá **Pre-deploy Command** = `npm run db:setup`, **Start Command** = `npm start` y **Healthcheck Path** = `/health`. Railway marcó `railway.json` como obsoleto durante este despliegue. El archivo conserva los valores de referencia. El pre-deploy corre dentro de la red privada; si falla el setup, el despliegue no continúa.
7. En **Settings → Networking**, generá un dominio público para la API y comprobá `/health`, `/docs/` y `/authors`.
8. Si querés datos de muestra, ejecutá `npm run db:seed` dentro del servicio con acceso a la red privada. No se ejecuta automáticamente en producción.

La URL interna de PostgreSQL (`*.railway.internal`) sirve entre servicios del mismo proyecto/entorno y no desde tu PC. Si necesitás conectar desde tu PC, utilizá la URL pública/TCP proxy provista por Railway, nunca la interna. No publiques ninguna de las URLs de conexión: contienen credenciales. El dominio público de la **API** sí es el que se entrega para probar el trabajo.

No desactives la verificación TLS para solucionar errores de conexión: usá la configuración SSL/CA que corresponda al proveedor. El driver respeta los parámetros SSL de la URL.

Documentación oficial: [pre-deploy](https://docs.railway.com/deployments/pre-deploy-command), [configuración](https://docs.railway.com/config-as-code/reference).

## Git y entrega

Si descargaste un ZIP sin historial:

```bash
git init -b main
git add .
git commit -m "feat: implement MiniBlog REST API with PostgreSQL, tests and docs"
git remote add origin URL_DE_TU_REPOSITORIO
git push -u origin main
```

`.gitignore` excluye `.env`, dependencias y logs; solamente `.env.example` se versiona. Las credenciales del ejemplo son exclusivamente para la base local de práctica.

Entrega el enlace al repositorio GitHub y la URL de Railway con `/docs/`. Verificá que el docente tenga acceso al repositorio si es privado.

## Alcance

Proyecto educativo sin autenticación, autorización ni paginación, según la consigna. Todos los endpoints son accesibles para quien conozca el dominio. `published` es un estado del post; no oculta borradores. Usar únicamente datos de práctica en el despliegue.

## Registro de uso de IA

Se utilizó ChatGPT/Codex para generar la estructura inicial, servicios SQL, validaciones, tests, contrato OpenAPI y documentación; también para ejecutar verificaciones y corregir errores encontrados. Las decisiones incluyen unificar la entidad como `authors`, usar consultas parametrizadas e implementar borrado en cascada. El estudiante debe revisar y comprender el código antes de presentarlo. El resultado de las verificaciones del entorno de desarrollo se registra en `VERIFICACION.md`.
