import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

// NextAuth handler — exports both GET and POST directly.
//
// Rate limiting on the login endpoint is handled INSIDE the authorize()
// function in src/lib/auth.ts, not as a wrapper here. A wrapper here
// caused a 500 error in production (NextAuth couldn't read the body
// stream). By keeping the handler direct, NextAuth receives the
// request exactly as Next.js passes it.
const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
