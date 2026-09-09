/**
 * Auth0 client singleton — server-side only.
 *
 * Uses @auth0/nextjs-auth0 v4 (Auth0Client).
 * Environment variables required:
 *   AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_SECRET
 * Optional:
 *   APP_BASE_URL (inferred from request host if omitted)
 *
 * Auth0 Dashboard setup:
 *   Allowed Callback URLs: {APP_BASE_URL}/auth/callback
 *   Allowed Logout URLs:   {APP_BASE_URL}
 */
import { Auth0Client } from "@auth0/nextjs-auth0/server";

export const auth0 = new Auth0Client();
