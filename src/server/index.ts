import "dotenv/config";
import { serve } from "@hono/node-server";
import app from "./app";

console.log("Server is running on port 4000");

serve({
  fetch: app.fetch,
  port: 4000,
});
