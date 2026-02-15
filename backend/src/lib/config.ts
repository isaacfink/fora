import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z
    .string()
    .default("3000")
    .transform((val) => parseInt(val, 10)),
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_PLACES_API_KEY: z.string(),
  REDIS_URL: z.string().url(),
});

type Env = z.infer<typeof envSchema>;

const parseEnv = (): Env => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("Invalid environment variables:");
    console.error(z.treeifyError(result.error).properties);
    throw new Error("Invalid environment variables");
  }

  return result.data;
};

export const config = parseEnv();
