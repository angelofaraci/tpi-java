# D&D Character Manager

D&D Character Manager is a full-stack application for running tabletop campaigns. Authenticated users can create and manage D&D character sheets, create or join campaigns, view public campaigns, and upload an optional character portrait. Campaign creators become Dungeon Masters, while administrators can manage users, characters, campaigns, races, and classes.

## Quick start

### Prerequisites

- Java 21 (required by the backend Maven build)
- Node.js and npm (the repository does not declare a Node.js version)
- Docker Engine with the Docker Compose plugin, for PostgreSQL

From the repository root, start the database:

```bash
docker compose up -d
```

In a second terminal, start the backend:

```bash
cd backend
./mvnw spring-boot:run
```

In a third terminal, install and start the frontend:

```bash
cd frontend
npm ci
npm run dev
```

Open the URL printed by Vite. The development configuration is designed for `http://localhost:5173` and calls the backend at `http://localhost:8080`.

On first backend startup, a default administrator is seeded:

| Username | Password |
| --- | --- |
| `admin` | `admin123` |

These are development defaults, overridable via the `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `ADMIN_EMAIL` environment variables (see `backend/src/main/resources/application.properties`). A `.env` file in `backend/` is picked up automatically at startup and is git-ignored. Use the default account only for local development. The application also provides registration from its login screen.

## What the application supports

- User registration and JWT-based login.
- Campaign creation, private/public visibility, Dungeon Master ownership, join codes, and player campaign views.
- Character creation and editing with race, class level, ability scores, proficiencies, progression values, and campaign assignment.
- Optional character portrait uploads in JPEG, PNG, WebP, or GIF format, up to 5 MB.
- Administrator-only management of users, characters, campaigns, races, and D&D classes.

## Architecture

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Frontend | React, TypeScript, Vite | Single-page interface and API client |
| Backend | Spring Boot 3, Spring Security, Spring Data JPA | REST API, JWT authentication, authorization, business logic, and file uploads |
| Database | PostgreSQL | Application data persisted through JPA |
| Local services | Docker Compose | PostgreSQL container exposed on host port `55443` |

The frontend API client uses the fixed base URL `http://localhost:8080`. The backend accepts browser requests only from `http://localhost:5173` and `http://127.0.0.1:5173`.

## Local configuration

The committed backend configuration is in `backend/src/main/resources/application.properties`:

| Setting | Configured value |
| --- | --- |
| JDBC URL | `jdbc:postgresql://localhost:55443/postgres?options=-c%20TimeZone%3DUTC` |
| Database user | `myuser` |
| Database password | `secret` |
| Hibernate schema mode | `update` |
| Portrait directory | `./uploads` relative to the backend working directory |
| Upload limits | 5 MB per file, 10 MB per request |

The root `compose.yaml` starts PostgreSQL with the same user and password and maps container port `5432` to host port `55443`. No environment-variable template or production configuration is included in the repository.

## Available commands

Run frontend commands from `frontend/`:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Type-check and create a production frontend build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run the Vitest test suite once |
| `npm run preview` | Serve the built frontend locally |

Run backend commands from `backend/`:

| Command | Purpose |
| --- | --- |
| `./mvnw spring-boot:run` | Start the Spring Boot API |
| `./mvnw test` | Run the backend test suite, which uses an in-memory H2 database |
| `./mvnw package` | Build the backend artifact and run its tests |

On Windows, use `mvnw.cmd` in place of `./mvnw`.

To stop the local database from the repository root:

```bash
docker compose down
```

## Repository layout

```text
backend/    Spring Boot API, database mappings, security, and tests
frontend/   React/Vite application, styles, API client, and tests
compose.yaml PostgreSQL service for local development
```

## Current limitations

- The frontend backend URL and backend CORS origins are hard-coded for local development; they are not configurable through checked-in environment files.
- Database credentials are development defaults committed in source configuration. The seeded administrator account also defaults to `admin`/`admin123` but is overridable via `ADMIN_USERNAME`/`ADMIN_PASSWORD`/`ADMIN_EMAIL`.
- The Compose definition does not declare a persistent database volume.
- The repository contains no deployment, production configuration, or CI workflow documentation.
