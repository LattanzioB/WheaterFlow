# E-05: API Documentation & Database

**Status:** In Review
**Priority:** Medium
**Depends On:** E-04

**Description:** Integrate Swagger/OpenAPI for auto-generated API documentation and produce the database entity-relationship diagram showing all MongoDB collections, their fields, types, relationships, and the split between notification preferences and delivery settings.

## Acceptance Criteria

- [x] Swagger UI accessible at `/api/docs` with all endpoints documented
- [x] DTOs decorated with `@ApiProperty` including descriptions and examples
- [x] API responses documented with status codes (200, 201, 400, 401, 404)
- [x] Database diagram (ER diagram) showing all collections, fields, types, indexes, references, notification preferences, and delivery settings
- [x] Database diagram exported as image and included in `docs/`

## Stories

| ID | Title | Description | Estimate | Status |
|---|---|---|---|---|
| S-05.1 | Swagger setup | Install `@nestjs/swagger`, configure `DocumentBuilder` in `main.ts`, enable Swagger UI at `/api/docs` | 1h | Done |
| S-05.2 | DTO and endpoint documentation | Add `@ApiProperty`, `@ApiTags`, `@ApiOperation`, `@ApiResponse` decorators to all DTOs and controllers, including notification preference endpoints | 3h | Done |
| S-05.3 | Authentication in Swagger | Configure Bearer JWT auth scheme in Swagger so protected endpoints can be tested from the UI | 1h | Done |
| S-05.4 | Database diagram | Create ER diagram of MongoDB collections (users, stations, measurements) with field types, indexes, references, alert preferences, and channel settings | 2h | Done |

## Dependencies

E-04 (adapters and controllers implemented)

## Completion Notes

- Extracted Swagger bootstrap into a shared `setupApp` helper, keeping `/api/docs` and `/api/docs-json` mounted and covered by unit plus e2e checks.
- Documented request DTOs, response DTOs, controller tags, operations, parameters, and response codes across auth, users, stations, and measurements.
- Added JWT bearer authentication metadata to Swagger so protected routes can be authorized directly from the UI.
- Produced a MongoDB database diagram as an exported SVG in `docs/database-diagram.svg` and documented the model in `docs/database-diagram.md`.
- Added schema-focused tests to keep the database diagram aligned with collection names, nested fields, and declared indexes.
- Refreshed the graph snapshot with `graphify update .` using the project-pinned Python runtime in `graphify-out/.graphify_python`.

## Deliverables Covered

- APIs documented (Swagger)
- Database diagram
