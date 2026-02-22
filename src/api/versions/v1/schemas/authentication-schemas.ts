import { z } from "@hono/zod-openapi";

export const GetAuthenticationOptionsRequestSchema = z.object({
  transactionId: z
    .uuid()
    .describe("The transaction ID for the authentication request")
    .openapi({
      example: "00000000-0000-0000-0000-000000000000",
    }),
});

export type GetAuthenticationOptionsRequest = z.infer<
  typeof GetAuthenticationOptionsRequestSchema
>;

export const GetAuthenticationOptionsResponseSchema = z
  .looseObject({})
  .describe("The authentication options required by the server")
  .openapi({
    example: {
      rpId: "…",
      challenge: "…",
      timeout: 60000,
      userVerification: "preferred",
    },
  });

export type GetAuthenticationOptionsResponse = z.infer<
  typeof GetAuthenticationOptionsResponseSchema
>;

export const VerifyAuthenticationRequestSchema = z.object({
  transactionId: z
    .uuid()
    .describe("The transaction ID for the authentication request")
    .openapi({
      example: "00000000-0000-0000-0000-000000000000",
    }),
  authenticationResponse: z
    .looseObject({})
    .describe("The authentication response from the authenticator"),
});

export type VerifyAuthenticationRequest = z.infer<
  typeof VerifyAuthenticationRequestSchema
>;

export const VerifyAuthenticationResponseSchema = z.object({
  token: z.string().describe("The JWT to authenticate with the server"),
});

export type VerifyAuthenticationResponse = z.infer<
  typeof VerifyAuthenticationResponseSchema
>;
