/**
 * Vercel serverless entry: handles all /api/* requests with the Hono app.
 * Zero-config: Vercel detects the default export and runs it as the handler.
 */
import app from "../src/server/app";
export default app;
