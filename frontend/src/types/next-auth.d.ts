import "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    backendToken?: string; // This is the JWT for backend calls
    user: {
      id?: string;
      name?: string;
      email?: string;
      image?: string;
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
  }
}