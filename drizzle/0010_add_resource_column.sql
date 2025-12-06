-- Migration: Add resource column for RFC 8707 support
-- Date: 2025-12-06
-- Description: Adds optional 'resource' column to oauth_authorization_codes and oauth_connections
--              to support RFC 8707 Resource Indicators for OAuth 2.0 token audience binding

-- Add resource column to oauth_authorization_codes
ALTER TABLE "oauth_authorization_codes" ADD COLUMN "resource" text;

-- Add resource column to oauth_connections
ALTER TABLE "oauth_connections" ADD COLUMN "resource" text;

-- Add comments for documentation
COMMENT ON COLUMN "oauth_authorization_codes"."resource" IS 'RFC 8707: Target resource URI for which the authorization code was issued';
COMMENT ON COLUMN "oauth_connections"."resource" IS 'RFC 8707: Target resource URI for which the access token was issued';
