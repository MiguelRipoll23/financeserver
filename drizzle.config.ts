import { defineConfig } from "drizzle-kit";
import { ENV_DATABASE_URL } from "./src/api/versions/v1/constants/environment-constants.ts";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url:
      Deno.env.get(ENV_DATABASE_URL) ??
      (() => {
        throw new Error("DATABASE_URL environment variable is required");
      })(),
  },
});
