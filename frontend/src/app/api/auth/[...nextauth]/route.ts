import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { jwtVerify, SignJWT } from 'jose';

// Environment variables should be properly set in .env file
const jwtSecret = process.env.NEXTAUTH_SECRET;
const secretKey = new TextEncoder().encode(jwtSecret);
const algorithm = "HS256";

if (!jwtSecret) {
  console.error("FATAL ERROR: NEXTAUTH_SECRET environment variable is not set.");
}

// 1. Configure NextAuth options
export const authOptions: NextAuthOptions = {
  secret: jwtSecret, // Use the same secret here
  debug: process.env.NEXTAUTH_DEBUG === "true",
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      // Called when a JWT is created or updated
      // Persist standard OAuth profile info to the token after signin
      if (account && profile) {
        token.id = profile.sub; // Google ID
        token.name = profile.name;
        token.email = profile.email;
        token.picture = profile.picture;
        // We DON'T need the Google access token in the JWT for backend auth
        // token.accessToken = account.access_token;
      }
      return token; // This is the NextAuth JWT payload
    },
    async session({ session, token }) {
      // Called when a session is accessed client-side
      // `token` here is the decoded NextAuth JWT payload from the jwt callback

      if (token && jwtSecret) {
        // **Create a new JWT specifically for the backend**
        // Include claims the backend expects (sub, name, email, picture)
        const backendPayload = {
          sub: token.id || token.sub, // Ensure sub (user ID) is present
          name: token.name,
          email: token.email,
          picture: token.picture,
          // Add other claims if needed by the backend
        };

        try {
           // Use the 'exp' from the original NextAuth token if available
          const expirationTime = typeof token.exp === 'number' ? token.exp : Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // Fallback: 30 days exp

          const backendJwt = await new SignJWT(backendPayload)
            .setProtectedHeader({ alg: algorithm })
            .setIssuedAt()
            .setExpirationTime(expirationTime)
            .sign(secretKey);

          // Add this backend-specific JWT to the session object
          session.backendToken = backendJwt; // Use this token for backend calls

        } catch (error) {
             console.error("Error signing backend JWT:", error);
             // Handle error: maybe return session without backendToken?
        }


        // Also add user details to the session object for client-side use
        if (session.user) {
          session.user.id = typeof token.id === 'string' ? token.id : typeof token.sub === 'string' ? token.sub : undefined;
          session.user.name = typeof token.name === 'string' ? token.name : undefined;
          session.user.email = typeof token.email === 'string' ? token.email : undefined;
          session.user.image = typeof token.picture === 'string' ? token.picture : undefined;
        }
      }
      // **Important:** Do NOT send the Google access token to the client session
      // session.accessToken = token.accessToken as string; // ONLY USE FOR DEBUGGING if needed

      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
