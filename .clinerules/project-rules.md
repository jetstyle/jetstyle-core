# Project Structure

This monorepo hosts all npm packages prefixed with `@project-name/` or `@jetstyle/` locally; they are not installed from a registry but are sourced from within this repository.

## Main Directories
- `apps/` — Houses all applications including backend and frontend services, microservices, or single-page applications (SPA).
  - Examples:
    - `apps/task-tracker/` Example basic Task Tracker API implementation with OpenAPI + Hono + Drizzle ORM
    - `apps/auth-svc/` (authentication service)
    - `apps/core-hub/` (Next.js application to demonstrate capabilities of the platform)
- `libs/` — Shared libraries, utilities, components, hooks, and types used across multiple applications.

## Code Organization Principles
- Place each service/application in its own folder under `apps/`. Services/applications must not depend on one another.
- Place shared components, hooks, types, and functions in `libs/` and import by name via `package.json` (e.g., `@jetstyle/utils`). Always specify version `^1.0.0` for all newly created packages and applications.
- Use kebab-case for file and directory names; use camelCase for types and variables.
- Store UI components (e.g., shadcn/ui) in `apps/web/src/components/ui` or equivalent.

## Post-Change Verification
- After implementing code changes, run `npm run build` from the project root to ensure the code compiles. Do not attempt to start or run applications — the user will run and review code changes separately.
- After building, confirm that there are no compilation errors or warnings before considering the change complete.

# Technology Stack

## Frontend Stack
- Frameworks: Vite + React + TypeScript + Tailwind; Next.js (with TypeScript + Tailwind) for server rendering as required
- Styling/UI: Tailwind CSS, shadcn/ui
- Icons: Lucide
- Animation: Motion
- Fonts: San Serif, Inter, Geist, Mona Sans, IBM Plex Sans, Manrope

## Backend Stack
- Node.js
- Drizzle ORM
- Hono + Zod + OpenAPI
- Backend project structure should follow `apps/api` or `apps/task-tracker` for consistency

# Frontend Rules

## shadcn/ui Components Usage
- Compose and customize shadcn components through props; do not modify their source directly.
- Use shadcn/ui for all UI components unless there is a significant reason otherwise.
- Install shadcn components with the CLI: `cd apps/web && npx shadcn@latest add <component-name>` from the correct directory.
- Never manually copy shadcn components; always use the CLI for consistency and convenient updates.
- Place UI library components from shadcn in `apps/web/src/components/ui`.
- Before new installs, check if the component already exists in `src/components/ui`.

## Localization
- By default, create new applications with localization support; omit only if the user explicitly requests so.
- For Next.js, use `next-intl`. For Vite, adopt a popular equivalent, following best practices.
- Extract all texts from components into translation files, even for single-language projects.
- Plan to segment translation texts into multiple manageable files, rather than one large collection.

## Working with React Components
- Store all shared/reusable React components in `apps/web/src/components`.
- Always use path aliases: `@/components/...` or `@/components/ui/...`.
- Component filenames must use kebab-case (e.g., `course-card.tsx`).

## API Handling
- Place all API request functions in `apps/web/src/api.ts` or domain-specific subfiles: `apps/web/src/api/<resource-name>.ts`.
- Keep data fetching and mutation logic centralized in the API module; do not mix with components.
- Always use exported API functions; never call `fetch` or `axios` directly in components.
  - Example: Use `fetchOrganizations(search)` — do not write custom fetch logic.
- Use `@jetstyle/requests` from `core/libs/requests` for API requests unless otherwise specified.
- API functions handle error and success. Always check `err === null` before accessing `.value`.
- When extending API endpoints, update the client API layer, following existing function signatures and error-handling patterns.
- Before implementing API-related changes, provide a concise checklist of the planned tasks, including any module splits, function updates, or endpoint extensions.

### API Module Structure (Updated)
- Prefer a folder-based structure over a single `api.ts`; split by domain: `src/api/projects.ts`, `src/api/threads.ts`, etc.
- Each module exports domain-specific functions.
- Naming: File names use kebab-case by domain (`projects.ts`). Functions use verbs and (where helpful) domain prefixes (`fetchProjects`, `patchProject`).
- From components/pages, import only required functions from the specific API module, not from a barrel — unless it does not create monolithic or circular dependencies.
- Handle all possible runtime errors in API functions, returning `TResult` for reliable error handling.

## Working with C* Types
- C-prefixed types (e.g., `CUser`, `CProject`, `CTask`) define client-side structures/props.
  - Do not redefine or duplicate C* types within components or hooks.
- Always use the correct property names as defined in each C* type.

### Types Module Structure
- Organize C* types by domain under `src/types/` (e.g., `src/types/projects.ts`). Avoid monolithic files.
- If types are sourced from a shared package (e.g., `@jetstyle/utils`), favor re-exporting to keep import paths stable.
- Naming: Files in kebab-case by domain; types in PascalCase, prefixed with `C`.
- Keep backend and frontend schemas aligned: update domain files and adjust imports as backend changes occur.

## Other Guidelines
- Keep business logic outside UI components; use hooks or utilities as appropriate.
- Maintain a clear separation of data fetching, types, and UI logic for maintainability and testability.
- Use path aliases such as `@/api/projects` or `@/types` for imports; avoid deep relative paths.

# Backend Rules

## Entity Schema Creation
- Every entity must have: `id`, `uuid`, `createdAt`, `updatedAt`, and `tenant` fields.
- Define schemas using Drizzle's `pgTable` in a single file (`src/schema.ts`).
- For each table, create `InsertSchema`, `SelectSchema`, and `PatchSchema` (`PatchSchema` via `.partial()` from `InsertSchema`).
- For enums, use `varchar` with enum restrictions, not `text`.
- Do not use ORM relations; use explicit reference fields (e.g., `learningModuleId`).

## CRUD Endpoint Organization
- Each resource has its own CRUD route file in `routes/`, named in kebab-case and plural (e.g., `learning-module-practices.ts`).
- All paths inside a CRUD file are relative; prefix added during router assembly in `index.ts`.
- Each CRUD file must export the default router (e.g., `export default app`).
- Attach routers in `index.ts` via `.route('/api/resource-name', app)`.
- Limit each file to a single resource's CRUD operations; never mix resources.

## Code Style and Structure
- Follow structure and naming conventions of existing examples.
- Use camelCase for variable, schema, and type names and kebab-case for file names.
- Only standard operations (list, create, get by uuid, update, delete) in each CRUD file; no custom endpoints.

## JSONB Column Declaration in Drizzle (pgTable)
- Declare JSONB columns using `$type<...>` for full type-safety in Drizzle:
  - Example: `createdBy: jsonb('created_by').$type<CallMessageCreatedBy | null>().default(null)`
- Default to `null` for JSONB columns unless a non-null object is required, preventing TypeScript and OpenAPI inconsistencies.
- Database columns use snake_case; TypeScript fields use camelCase.
- Define nearby TypeScript types for complex JSONB structures, reuse in `$type`.

### Zod Schemas for JSONB
- Create and re-use dedicated zod schemas for each JSONB field, reflecting nullability/optionality.
  - Example: `const createdBySchema = z.object({...}).nullable().optional()`
- Extend insert/select schemas with JSONB schemas; do not inline object shapes in routes.
- Patch schemas should be derived from insert schemas with `.partial()`.

### CRUD and OpenAPI Integration
- Import and use exported insert/select schemas for route definitions.
- For PATCH operations, always derive from insert using `.partial()` to maintain JSONB typing.

### Examples
- Table column: `createdBy: jsonb('created_by').$type<{...} | null>().default(null)`
- Zod:
  - `const createdBySchema = z.object({...}).nullable().optional()`
  - `export const SomeInsertSchema = createInsertSchema(TableSome).omit({...}).extend({ createdBy: createdBySchema })`
  - `export const SomeSelectSchema = createSelectSchema(TableSome).extend({ createdBy: createdBySchema })`

### Common Pitfalls
- Omitting `$type<...>` causes loss of types and OpenAPI schema generation problems.
- Using `default({})` with nullable/optional zod results in mismatches. Prefer `default(null)` and `nullable().optional()` unless an object is always present.
- Failing to extend insert/select schemas with JSONB fields causes TypeScript errors in CRUD/OpenAPI.

## Other Backend Recommendations
- Before creating a new entity, review and follow existing examples closely.
- Do not write migrations manually. Run `npm run create-migration` in the application's folder when changing models.

## Project Permissions
- Use permission checks from `apps/auth-svc` and `libs/server-auth`. Install via `package.json` names.
- Global permissions (e.g., `users:admin`, `tenants:admin`) are implemented in the User entity's `scopes` field, granting unrestricted access.
- For SaaS, per-tenant permissions are managed with the `PermissionBind` entity (user/tenant link).
- If a user has no global permissions but is part of a tenant, access is limited to that tenant.
- Permission checks are centralized via the `getPermissions` function from `@jetstyle/server-auth`, used as required. Implement custom checks explicitly within endpoints when necessary.
- All new services/endpoints must utilize the centralized permissions mechanism via `getPermissions` unless stated otherwise in the requirements.

# Frontend-Backend Connection Rules

## Overview
- C* entities (e.g., CTask, CProject, CUser) on the frontend must mirror backend schema structure exactly.
- Use the generic `TListResponse` for all list API responses involving C* types.

## C* Entity Structure Verification
- When creating or editing a C* type for frontend, always verify against the backend entity in `schema.ts`.
- Only include fields present in the backend table/entity type. Do not add frontend-only fields even if useful.
- Mark frontend fields as optional only if they are optional in the backend.
- Example: If `TableProjects` has `uuid`, `createdAt`, `updatedAt`, `tenant`, `title`, then `CProject` has only these fields.

## TListResponse Usage for Lists of C* Entities
- Always type list API responses using `TListResponse<CEntity>`.
- Never define custom list types (e.g., `CProjectListResp`); always use `TListResponse`:
  ```ts
  export type TListResponse<T> = {
    result: T[]
    total: number
    limit: number
    offset: number
  }
  ```
- Example: API fetching a project list returns `TListResponse<CProject>`.

## Other Recommendations
- When unsure, check `schema.ts` for field validation.

# Code Style Guidelines

## Import Statements
- Always place import statements at the very top of files, before any other code.
- Never use `require` alongside `import` in the same file.
- Use dynamic `import()` only if necessary (e.g., for circular dependency avoidance), and only after confirming the need.
- Example:
  ```ts
  import { foo } from './foo'
  // ...rest of the code
  ```

## Non-Null Assertion Ban
- Avoid the `!` operator (non-null assertion). Use explicit type guards and runtime checks instead.
- Example (not allowed): `array!.push(item)`
- Preferred: `if (Array.isArray(array)) { array.push(item) }`

## TypeScript
- Prefer to write type safe typescript code, don't use `as any` until you totally sure this is the only or most efficient way to solve the problem

## TResult Error Handling Principles
- Functions returning `TResult` must never throw; they always return `{ err: null, value }` for success or `{ err: string }` for error.
- Never wrap calls to `TResult`-returning functions in try/catch; check `result.err` directly.
- Usage pattern:
  ```ts
  const res = await someApiCall();
  if (res.err == null) {
    // Success: use res.value
  } else {
    // Error: handle res.err (and optionally res.errDescription)
  }
  ```
- If required, handle exceptions separately for cases not covered by `TResult` (e.g., network failures), but do not expect `TResult` to throw.
- When adding new APIs/utilities, prefer returning `TResult` for consistent error handling.
