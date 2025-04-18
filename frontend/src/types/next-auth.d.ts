import "next-auth";
// Importing JWT type for reference
// The JWT import is used to modify the module declaration below
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
  }
}
