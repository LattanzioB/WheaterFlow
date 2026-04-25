# E-05: API Documentation & Database

**Status:** Not Started
**Priority:** Medium
**Depends On:** E-04

**Description:** Integrate Swagger/OpenAPI for auto-generated API documentation and produce the database entity-relationship diagram showing all MongoDB collections, their fields, types, relationships, and the split between notification preferences and delivery settings.

## Acceptance Criteria

- [ ] Swagger UI accessible at `/api/docs` with all endpoints documented
- [ ] DTOs decorated with `@ApiProperty` including descriptions and examples
- [ ] API responses documented with status codes (200, 201, 400, 401, 404)
- [ ] Database diagram (ER diagram) showing all collections, fields, types, indexes, references, notification preferences, and delivery settings
- [ ] Database diagram exported as image and included in `docs/`

## Stories

| ID | Title | Description | Estimate |
|---|---|---|---|
| S-05.1 | Swagger setup | Install `@nestjs/swagger`, configure `DocumentBuilder` in `main.ts`, enable Swagger UI at `/api/docs` | 1h |
| S-05.2 | DTO and endpoint documentation | Add `@ApiProperty`, `@ApiTags`, `@ApiOperation`, `@ApiResponse` decorators to all DTOs and controllers, including notification preference endpoints | 3h |
| S-05.3 | Authentication in Swagger | Configure Bearer JWT auth scheme in Swagger so protected endpoints can be tested from the UI | 1h |
| S-05.4 | Database diagram | Create ER diagram of MongoDB collections (users, stations, measurements) with field types, indexes, references, alert preferences, and channel settings | 2h |

## Dependencies

E-04 (adapters and controllers implemented)

## Deliverables Covered

- ✅ APIs documented (Swagger)
- ✅ Database diagram
