#!/bin/sh

echo "Running database migrations..."
npx tsx src/lib/db/migrate.ts

echo "Starting Next.js..."
exec node server.js
