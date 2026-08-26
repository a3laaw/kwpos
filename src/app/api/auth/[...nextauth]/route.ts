import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

// NextAuth handler — exports both GET and POST.
// Rate limiting on the login endpoint is temporarily disabled to
// isolate a 500 error in production. Once the root cause is fixed,
// we'll re-add the rate-limit wrapper.
const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
