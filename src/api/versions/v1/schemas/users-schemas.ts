import { z } from "@hono/zod-openapi";

const GitHubHandleSchema = z
  .string()
  .min(1)
  .max(39)
  .regex(/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i, {
    message: "Invalid GitHub handle",
  })
  .describe("GitHub username handle (1-39 chars, alphanumeric and hyphens)")
  .openapi({ example: "octocat" });

const DisplayNameValueSchema = z
  .string()
  .min(1)
  .max(128)
  .describe("User display name (1-128 chars)")
  .openapi({ example: "The Octocat" });

export const CreateUserRequestSchema = z.object({
  githubHandle: GitHubHandleSchema.describe(
    "GitHub username handle for the new user"
  ),
  displayName: DisplayNameValueSchema.optional().describe(
    "Optional display name for the new user"
  ),
});

export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;

export const UserIdParamSchema = z.object({
  id: z
    .string()
    .uuid()
    .describe("Unique user identifier (UUID)")
    .openapi({ example: "8c4719f0-7336-4415-9aa5-8a2dce12d2f4" }),
});

export type UserIdParams = z.infer<typeof UserIdParamSchema>;

export const UpdateUserRequestSchema = z
  .object({
    githubHandle: GitHubHandleSchema.optional().describe(
      "Optional new GitHub handle for the user"
    ),
    displayName: DisplayNameValueSchema.nullable()
      .optional()
      .describe("Optional new display name for the user"),
  })
  .refine(
    (value) =>
      value.githubHandle !== undefined || value.displayName !== undefined,
    {
      message: "At least one field must be provided",
      path: [],
    }
  );

export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;

export const UserResponseSchema = z.object({
  id: z
    .string()
    .uuid()
    .describe("Unique user identifier (UUID)")
    .openapi({ example: "8c4719f0-7336-4415-9aa5-8a2dce12d2f4" }),
  githubHandle: GitHubHandleSchema.describe(
    "GitHub username handle for the user"
  ),
  displayName: DisplayNameValueSchema.nullable()
    .describe("User display name, or null if not set")
    .openapi({
      example: "The Octocat",
    }),
  createdAt: z
    .string()
    .datetime({ offset: true })
    .describe("ISO 8601 creation timestamp (with timezone offset)")
    .openapi({ example: "2025-03-14T12:00:00.000Z" }),
  updatedAt: z
    .string()
    .datetime({ offset: true })
    .describe("ISO 8601 last update timestamp (with timezone offset)")
    .openapi({ example: "2025-04-01T09:30:00.000Z" }),
});

export type UserResponse = z.infer<typeof UserResponseSchema>;

export const CreateUserResponseSchema = UserResponseSchema;
export type CreateUserResponse = z.infer<typeof CreateUserResponseSchema>;

export const UpdateUserResponseSchema = UserResponseSchema;
export type UpdateUserResponse = z.infer<typeof UpdateUserResponseSchema>;
