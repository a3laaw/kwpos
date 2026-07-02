import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: "ADMIN" | "SALES" | "WAREHOUSE"
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    role: "ADMIN" | "SALES" | "WAREHOUSE"
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: "ADMIN" | "SALES" | "WAREHOUSE"
  }
}
