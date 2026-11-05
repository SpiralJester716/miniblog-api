# Verificación de la entrega

Fecha: 5 de noviembre de 2026.

- `npm install`: dependencias instaladas y lockfile generado.
- `npm test`: **48 tests aprobados, 0 fallos**. Incluye validación estructural de OpenAPI.
- `npm run test:embedded`: **1 escenario completo aprobado** con múltiples comprobaciones HTTP y SQL sobre PGlite (PostgreSQL WASM).
- El escenario verifica todos los endpoints funcionales, setup/seed repetibles, índices únicos, claves foráneas y borrados en cascada.

Las pruebas embebidas no comprueban conexiones TCP ni equivalen a un despliegue en Railway. La integración con PostgreSQL nativo está configurada para GitHub Actions y para `npm run test:integration` usando una base de tests.
