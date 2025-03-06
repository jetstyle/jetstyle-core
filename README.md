# Local development

```
npm i
npm run core:dev
```

## Local ENV

Create a `.env` file

```
AUTH__ADMIN_PASSWORD=<your password>
AUTH__ADMIN_TENANT=platform

AUTH_SVC__PRIVATE_KEY=<your private key as base64>
AUTH_SVC__PUBLIC_KEY=<your public key as base64>

CONTAINER_PG_DATA=<path to folder with db>
AUTH_SVC__MIGRATIONS=<put absolute path>apps/auth-svc/drizzle
TASK_TRACKER__MIGRATIONS=<put absolute path>apps/task-tracker/drizzle

PG__PORT=5445
PG__DATABASE=<your db name>
PG__USERNAME=<your db user>
PG__PASSWORD=<your password>
NEXT_PUBLIC_CONFIG_PATH=/config

AUTH_SVC=http://localhost:8091/auth
AUTH__PUBLIC_KEY_URL=http://localhost:8091/auth/core/public-key
AUTH__TENANT_PERMISSIONS=enabled
```

To create AUTH_SVC__PRIVATE_KEY and AUTH__ADMIN_TENANT, run
`tsx apps/auth-svc/src/tools/keys.ts` and copy-paste the output privateKeyBase64 and publicKeyBase64 into your `.env` file.

Requirements:
1. Docker
2. Run `npm i -g turbo@1.12.4`

Dependencies

```
# In the project root
npm i
npm run build
```

It is recommended to run locally in two terminals:
```
# In the first:
npm run build:watch

# In the second:
npm run core:dev
```

`npm run core:dev` will automatically start Postgres in a Docker container and create a database with a user. On the first run, pulling the container may take some time, and services might fail to connect to Postgres and exit with an error. Simply restart `npm run core:dev` once.

Once running locally, Swagger UI is available at `http://localhost:8092/swagger`.

Admin UI is available at `http://localhost:3000/ru/tenant/tracker/login`

## Migrations

Migrations are performed in `apps/<service name>` using drizzle kit. To enable this, create a copy of the `.env` file inside `apps/<service name>/.env` with only the database settings:

```
PG__PORT=5445
PG__DATABASE=<your db name>
PG__USERNAME=<your db user>
PG__PASSWORD=<your password>
```

Migration creation process:
1. Stop `npm run dev` in the root, as migrations are applied automatically.
2. Make changes to schema.ts.
3. Run `npm run create-migration`.
4. Verify that the migration was created.
5. Restart `npm run dev` in the root; the migration will be applied automatically.
