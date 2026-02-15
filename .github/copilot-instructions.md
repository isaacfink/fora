# Copilot guidelines for coding in this project

### Typescript

- Never use as any or any sort of casting, if you absolutely need to use it, don't cast and leave a comment so I can clean it up
- Prefer a single object argument for functions with more than 2 parameters, for example instead of 
  ```ts
  function createUser(name: string, age: number, email: string) {
    // ...
  }
  ```
  use
  ```ts
  interface CreateUserOptions {
    name: string;
    age: number;
    email: string;
  }
  function createUser(options: CreateUserOptions) {
    const { name, age, email } = options;
    // ...
  }
  ```
- Split up nested types into their own types, for example instead of 
  ```ts
  interface User {
    name: string;
    age: number;
    email: string;
    address: {
      street: string;
      city: string;
      country: string;
    };
  }
  ```
  use
  ```ts
  interface Address {
    street: string;
    city: string;
    country: string;
  }
  interface User {
    name: string;
    age: number;
    email: string;
    address: Address;
  }
  ```
- Use type aliases for union types, for example instead of
  ```ts
  function getUser(id: string | number) {
    // ...
  }
  ```
  use
  ```ts
  type UserId = string | number;
  function getUser(id: UserId) {
    // ...
  }
  ```

### Hono

- Always chain routes, intead of
  ```ts
  app.get('/users', getUsers);
  app.post('/users', createUser);
  ```
  use
  ```ts
  app
    .get('/users', getUsers)
    .post('/users', createUser);
  ```

### Drizzle ORM
- Use the new callback style for table definitions, for example instead of
  ```ts
  export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    createdAt: timestamp('created_at').defaultNow(),
  });
  ```
  use
  ```ts
  export const users = pgTable('users', (t) => ({
    id: t.serial('id').primaryKey(),
    name: t.varchar('name', { length: 255 }).notNull(),
    email: t.varchar('email', { length: 255 }).notNull().unique(),
    createdAt: t.timestamp('created_at').defaultNow(),
  }));
  ```
- Prefer select over query, unless it is a very complex query that cannot be expressed properly with simple select statements, for example instead of
  ```ts
  db.query.users.findMany({
    where: (users, { eq }) => eq(users.name, 'John'),
  });
  ```
  use
  ```ts
  db.select().from(users).where(eq(users.name, 'John'));
  ```


Always use bun for everything, for a package manager, running scripts, testing, and runtime

Prefer CLI tools instead of editing sensitive files, for example to bootstrap the project, instead of editing a `package.json` file, use the appropriate bun commands

### Project structure - backend

- All backend application code goes in `src` folder, scripts go in `scripts`
- Features go in their own folder under `src/modules`, each feature can expose a router, schemas, service etc..., here is an example structure for an auth schema
  ```
  src
  ├── modules
  │   ├── auth
  │   │   ├── auth.router.ts
  │   │   ├── auth.service.ts
  │   │   ├── auth.realtime.ts
  │   │   ├── auth.workers.ts
  │   │   ├── schemas
  │   │   │   ├── accounts.schema.ts
  │   │   │   ├── sessions.schema.ts
  ```
- shared code that is not specific to any feature goes in `src/lib`, for example database client, utilities, logging, etc...


Do not create any markdown explainer files unless asked to