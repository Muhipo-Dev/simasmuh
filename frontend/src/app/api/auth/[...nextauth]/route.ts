import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { NextRequest } from "next/server"
import { getBackendUrl } from "@/lib/api-config"

async function fetchConfiguredPublicDomain(): Promise<string | null> {
  try {
    const backendUrl = getBackendUrl();
    const res = await fetch(`${backendUrl}/settings/public`, {
      headers: {
        'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'siakad_secret_api_key_2026',
      },
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.publicDomainUrl && typeof data.publicDomainUrl === 'string') {
        return data.publicDomainUrl.trim().replace(/\/+$/, '');
      }
    }
  } catch {}
  return null;
}

async function getAuthOptions(req?: NextRequest) {
  let hostUrl = '';

  if (req) {
    const proto = req.headers.get('x-forwarded-proto') || (req.nextUrl.protocol ? req.nextUrl.protocol.replace(':', '') : 'http');
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host;
    if (host) {
      hostUrl = `${proto}://${host}`;
    }
  }

  // Ambil URL domain publik resmi yang diinputkan di Pengaturan Sistem
  const systemConfiguredDomain = await fetchConfiguredPublicDomain();

  return {
    secret: process.env.NEXTAUTH_SECRET || "simasmuh-secret-key-2026-muhipo-dev",
    providers: [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      }),
      CredentialsProvider({
        name: 'Credentials',
        credentials: {
          email: { label: "Username / Email", type: "text" },
          password: { label: "Password", type: "password" },
          action: { label: "Action", type: "text" }
        },
        async authorize(credentials, authReq) {
          if (!credentials?.email || !credentials?.password) return null;

          try {
            const backendUrl = getBackendUrl(authReq);
            
            let endpoint = '/auth/login';
            let bodyPayload: any = {
              username: credentials.email,
              password: credentials.password
            };

            const getHeader = (key: string): string => {
              if (!authReq?.headers) return '';
              if (typeof (authReq.headers as any).get === 'function') {
                return (authReq.headers as any).get(key) || '';
              }
              return (authReq.headers as any)[key] || (authReq.headers as any)[key.toLowerCase()] || '';
            };

            const rawForwarded = getHeader('cf-connecting-ip') || getHeader('x-real-ip') || getHeader('x-forwarded-for') || getHeader('true-client-ip') || getHeader('x-client-ip') || '';
            const clientIp = rawForwarded.split(',')[0].trim();
            const userAgent = getHeader('user-agent') || '';

            const res = await fetch(`${backendUrl}${endpoint}`, {
              method: 'POST',
              body: JSON.stringify(bodyPayload),
              headers: { 
                "Content-Type": "application/json",
                "x-api-key": process.env.NEXT_PUBLIC_API_KEY || 'siakad_secret_api_key_2026',
                ...(clientIp ? { "x-forwarded-for": clientIp, "x-real-ip": clientIp } : {}),
                ...(userAgent ? { "user-agent": userAgent } : {})
              }
            });
            
            const user = await res.json();
            
            if (res.ok && user && user.user) {
              return {
                id: user.user.id,
                name: user.user.name,
                email: user.user.email,
                username: user.user.username,
                nipNbm: user.user.nipNbm,
                role: user.user.role,
                isActive: user.user.isActive !== false,
                subRole: user.user.subRole,
                subRole2: user.user.subRole2,
                subRole3: user.user.subRole3,
                subRole4: user.user.subRole4,
                subRole5: user.user.subRole5,
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
      async signIn({ user, account, profile }: any) {
        if (account?.provider === 'google') {
          try {
            const backendUrl = getBackendUrl();
            const res = await fetch(`${backendUrl}/auth/google`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'siakad_secret_api_key_2026',
              },
              body: JSON.stringify({
                email: user.email,
                name: user.name,
                image: user.image,
                googleId: account.providerAccountId,
              }),
            });

            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              console.error('Google OAuth backend rejection:', errData);
              return `/login?error=GoogleUnregistered&email=${encodeURIComponent(user.email || '')}`;
            }

            const authData = await res.json();
            if (authData && authData.user) {
              user.id = authData.user.id;
              user.username = authData.user.username;
              user.nipNbm = authData.user.nipNbm;
              user.role = authData.user.role;
              user.isActive = authData.user.isActive !== false;
              user.subRole = authData.user.subRole;
              user.subRole2 = authData.user.subRole2;
              user.subRole3 = authData.user.subRole3;
              user.subRole4 = authData.user.subRole4;
              user.subRole5 = authData.user.subRole5;
              user.token = authData.access_token;
              return true;
            }
            return false;
          } catch (error) {
            console.error('Error during Google sign-in:', error);
            return false;
          }
        }
        return true;
      },
      async jwt({ token, user, account }: any) {
        if (user) {
          token.sub = user.id;
          token.id = user.id;
          token.username = (user as any).username;
          token.nipNbm = (user as any).nipNbm;
          token.role = (user as any).role;
          token.isActive = (user as any).isActive !== false;
          token.subRole = (user as any).subRole;
          token.subRole2 = (user as any).subRole2;
          token.subRole3 = (user as any).subRole3;
          token.subRole4 = (user as any).subRole4;
          token.subRole5 = (user as any).subRole5;
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
          ;(session.user as any).isActive = (token as any).isActive !== false
          ;(session.user as any).subRole = (token as any).subRole
          ;(session.user as any).subRole2 = (token as any).subRole2
          ;(session.user as any).subRole3 = (token as any).subRole3
          ;(session.user as any).subRole4 = (token as any).subRole4
          ;(session.user as any).subRole5 = (token as any).subRole5
          ;(session as any).accessToken = (token as any).accessToken

          if ((token as any).accessToken) {
            try {
              const backendUrl = getBackendUrl();
              const verifyRes = await fetch(`${backendUrl}/users/${(token as any).id}/profile`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${(token as any).accessToken}`,
                  'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'siakad_secret_api_key_2026'
                },
                cache: 'no-store'
              });

              if (verifyRes.status === 401) {
                (session as any).error = 'SessionExpired';
              }
            } catch (e) {
              // Abaikan kesalahan jaringan sementara
            }
          }
        }
        return session
      },
      async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
        // Prioritas penentuan base URL yang terpercaya:
        // 1. Host aktif request saat ini (jika client mengakses IP / tunnel tertentu)
        // 2. Domain publik resmi yang diinputkan di Pengaturan Sistem
        // 3. baseUrl NextAuth bawaan
        const effectiveBase = hostUrl || systemConfiguredDomain || baseUrl;

        // Path relatif selalu diarahkan dengan aman ke effectiveBase
        if (url.startsWith('/')) {
          return `${effectiveBase}${url}`;
        }

        try {
          const targetUrl = new URL(url);
          // Daftar origin yang wajib dipercayai secara absolut
          const trustedOrigins = new Set([
            baseUrl,
            effectiveBase,
            hostUrl,
            systemConfiguredDomain,
          ].filter(Boolean));

          const isLocalhost = targetUrl.hostname === 'localhost' || targetUrl.hostname === '127.0.0.1';

          // Jika URL berada di origin terpercaya atau localhost yang harus dipetakan ke effectiveBase
          if (trustedOrigins.has(targetUrl.origin) || isLocalhost) {
            return `${effectiveBase}${targetUrl.pathname}${targetUrl.search}`;
          }

          // Jika URL eksternal namun hostnya cocok dengan domain terkonfigurasi sistem
          if (systemConfiguredDomain) {
            try {
              const confUrl = new URL(systemConfiguredDomain);
              if (confUrl.hostname === targetUrl.hostname) {
                return `${effectiveBase}${targetUrl.pathname}${targetUrl.search}`;
              }
            } catch {}
          }

          return url;
        } catch {}
        
        return `${effectiveBase}/dashboard`;
      }
    },
    pages: {
      signIn: '/login',
      signOut: '/login',
      error: '/login',
    },
    session: {
      strategy: "jwt" as const,
      maxAge: 365 * 24 * 60 * 60, // 365 hari (1 Tahun)
      updateAge: 24 * 60 * 60, // Perbarui token setiap 24 jam di background
    },
    trustHost: true
  };
}

const handler = async (req: NextRequest, ctx: any) => {
  const options = await getAuthOptions(req);
  return NextAuth(req, ctx, options as any);
};

export { handler as GET, handler as POST }

