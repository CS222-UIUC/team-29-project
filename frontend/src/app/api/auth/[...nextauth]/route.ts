import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// 1. Configure NextAuth options
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET, // Required in production
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
};

// 2. Create the NextAuth handler
const handler = NextAuth(authOptions);

// 3. Export as GET and POST for the App Router
export { handler as GET, handler as POST };
