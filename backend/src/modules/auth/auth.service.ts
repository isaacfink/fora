import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin, organization } from 'better-auth/plugins';
import { db } from '../../lib/db.js';
import { config } from '../../lib/config.js';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: config.GOOGLE_CLIENT_ID || '',
      clientSecret: config.GOOGLE_CLIENT_SECRET || '',
      enabled: !!(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET),
    },
  },
  plugins: [
    organization({
      sendInvitationEmail: async (data) => {
        // TODO: Implement email sending
        console.log('Invitation email:', data);
      },
    }),
    admin(),
  ],
  secret: config.BETTER_AUTH_SECRET,
  baseURL: config.BETTER_AUTH_URL,
});
