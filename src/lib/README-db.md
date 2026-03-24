Node (server-side) helper for MS SQL Server

Install:

```bash
npm install mssql
# or
yarn add mssql
```

Notes:
- The helper in `mssqlClient.ts` is intended for Node (server-side) usage only (do not import from browser bundles).

Basic usage:

```ts
import { initDb, queryToDataset, closeDb } from './mssqlClient';

async function run() {
  await initDb({
    user: 'sa',
    password: 'yourPassword',
    server: '127.0.0.1',
    database: 'YourDb',
    options: { trustServerCertificate: true }
  });

  const result = await queryToDataset('SELECT TOP 10 * FROM Products');
  // result.recordset => array of rows
  console.log(result.recordset);

  await closeDb();
}

run().catch(console.error);
```

Suggested integration:
- Use in a Node API route (Express, Next.js API route, or serverless function). Accept query string from client, validate/parameterize it, then call `queryToDataset` and return `result.recordset` as JSON.
