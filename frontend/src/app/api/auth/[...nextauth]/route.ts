import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { NextRequest } from "next/server"
import { getBackendUrl } from "@/lib/api-config"

const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Username / Email", type: "text" },
        password: { label: "Password", type: "password" },
        action: { label: "Action", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const backendUrl = getBackendUrl();
          
          let endpoint = '/auth/login';
          let bodyPayload: any = {
            username: credentials.email,
            password: credentials.password
          };

          const res = await fetch(`${backendUrl}${endpoint}`, {
            method: 'POST',
            body: JSON.stringify(bodyPayload),
            headers: { 
              "Content-Type": "application/json",
              "x-api-key": process.env.NEXT_PUBLIC_API_KEY || 'siakad_secret_api_key_2026'
            }
          });
          
          const user = await res.json();
          
          if (res.ok && user) {
            return {
              id: user.user.id,
              name: user.user.name,
              email: user.user.email,
              username: user.user.username,
              nipNbm: user.user.nipNbm,
              role: user.user.role,
              subRole: user.user.subRole,
              subRole2: user.user.subRole2,
              subRole3: user.user.subRole3,
              token: user.access_token
            }
          }
          return null;
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, account }: any) {
      if (user) {
        token.sub = user.id;
        token.id = user.id;
        token.username = (user as any).username;
        token.nipNbm = (user as any).nipNbm;
        token.role = (user as any).role;
        token.subRole = (user as any).subRole;
        token.subRole2 = (user as any).subRole2;
        token.subRole3 = (user as any).subRole3;
        token.accessToken = (user as any).token;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session?.user) {
        ;(session.user as any).sub = (token as any).sub
        ;(session.user as any).id = (token as any).id
        ;(session.user as any).username = (token as any).username
        ;(session.user as any).nipNbm = (token as any).nipNbm
        ;(session.user as any).role = (token as any).role
        ;(session.user as any).subRole = (token as any).subRole
        ;(session.user as any).subRole2 = (token as any).subRole2
        ;(session.user as any).subRole3 = (token as any).subRole3
        ;(session as any).accessToken = (token as any).accessToken
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
  },
  trustHost: true
};

const handler = async (req: NextRequest, context: any) => {
  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host;
  const protoHeader = req.headers.get("x-forwarded-proto") || url.protocol.replace(':', '');
  const protocol = protoHeader.startsWith('http') ? protoHeader : 'http';
  
  // Update NEXTAUTH_URL dinamis sesuai asal request (IP jaringan lokal atau domain utama)
  process.env.NEXTAUTH_URL = `${protocol}://${host}`;
  
  const isHttps = protocol === 'https';
  
  const customAuthOptions: any = {
    ...authOptions,
    useSecureCookies: isHttps,
    cookies: isHttps ? undefined : {
      sessionToken: {
        name: "next-auth.session-token",
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: false
        }
      }
    }
  };

  return NextAuth(req as any, context as any, customAuthOptions);
};

export { handler as GET, handler as POST }
