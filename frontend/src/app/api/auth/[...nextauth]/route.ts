import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { decode as nextAuthDecode } from "next-auth/jwt"
import { NextRequest } from "next/server"
import { getBackendUrl } from "@/lib/api-config"

async function fetchConfiguredPublicDomain(): Promise<string | null> {
  try {
    const backendUrl = getBackendUrl();
    const res = await fetch(`${backendUrl}/settings/public`, {
      headers: {
        'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'nailar-muhipo55',
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
    const forwardedProto = req.headers.get('x-forwarded-proto');
    const proto = forwardedProto || (req.nextUrl?.protocol ? req.nextUrl.protocol.replace(':', '') : 'http');
    const forwardedHost = req.headers.get('x-forwarded-host');
    const headerHost = req.headers.get('host');
    const host = forwardedHost || headerHost || req.nextUrl?.host;
    if (host) {
      hostUrl = `${proto}://${host}`.replace(/\/+$/, '');
    }
  }

  // Sesuai Standar AGENTS.md Aturan 10:
  // Prioritas Penentuan Origin:
  // 1) Host client aktif (hostUrl dari header request/window origin)
  // 2) Domain publik terkonfigurasi sistem di basis data
  // 3) BaseUrl / Loopback bawaan (http://localhost:3000)
  const systemConfiguredDomain = (await fetchConfiguredPublicDomain()) || process.env.NEXT_PUBLIC_APP_URL || '';
  const effectiveOrigin = (hostUrl || systemConfiguredDomain || 'http://localhost:3000').replace(/\/+$/, '');

  // Perbarui environment variable NEXTAUTH_URL untuk instance request ini
  process.env.NEXTAUTH_URL = effectiveOrigin;
  const isHttps = effectiveOrigin.startsWith('https://');

  return {
    secret: process.env.NEXTAUTH_SECRET || "nailar-muhipo55",
    useSecureCookies: isHttps,
    jwt: {
      decode: async (params: any) => {
        try {
          const secrets = [
            params?.secret,
            process.env.NEXTAUTH_SECRET,
            process.env.AUTH_SECRET,
            "nailar-muhipo55",
          ].filter(Boolean) as string[];

          for (const sec of Array.from(new Set(secrets))) {
            try {
              const res = await nextAuthDecode({ ...params, secret: sec });
              if (res) return res;
            } catch {}
          }
          return null;
        } catch {
          return null;
        }
      },
    },
    logger: {
      error(code: string, metadata: any) {
        if (code === 'JWT_SESSION_ERROR') {
          // Tangani secara graceful: cookie sesi lama/tidak valid dibersihkan otomatis oleh NextAuth (sessionStore.clean)
          // tanpa mencemari terminal dengan exception stack trace.
          return;
        }
        if (code === 'CLIENT_FETCH_ERROR') {
          // Tangani secara graceful: log transient kegagalan fetch dari browser saat server sedang restart/jeda koneksi
          return;
        }
        console.error(`[next-auth][error][${code}]`, metadata);
      },
      warn(code: any) {
        console.warn(`[next-auth][warn][${code}]`);
      },
      debug(code: string, metadata: any) {
        // Abaikan debug log rutin
      },
    },
    providers: [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        checks: ["none"],
        authorization: {
          params: {
            prompt: "select_account",
          },
        },
      }),
      CredentialsProvider({
        name: 'Credentials',
        credentials: {
          email: { label: "Username / Email", type: "text" },
          password: { label: "Password", type: "password" },
          action: { label: "Action", type: "text" },
          overrideData: { label: "Override Data", type: "text" }
        },
        async authorize(credentials, authReq) {
          // Dukungan pemulihan sesi admin asli (Keluar dari Mode Override / Spectator)
          if (credentials?.action === 'restore_admin_login' && credentials?.overrideData) {
            try {
              const parsed = JSON.parse(credentials.overrideData);
              const u = parsed.user || parsed;
              const token = parsed.access_token || parsed.token || u.token;
              if (u && u.id && token) {
                return {
                  id: u.id,
                  name: u.name,
                  email: u.email,
                  username: u.username,
                  nipNbm: u.nipNbm,
                  role: u.role,
                  isActive: u.isActive !== false,
                  subRole: u.subRole,
                  subRole2: u.subRole2,
                  subRole3: u.subRole3,
                  subRole4: u.subRole4,
                  subRole5: u.subRole5,
                  token: token,
                  isOverrideSession: false,
                  overrideMode: null,
                  isReadOnly: false,
                  overrideByAdminId: null,
                  overrideByAdminName: null,
                  overrideByAdminRole: null,
                };
              }
            } catch (err) {
              console.error("Restore admin session parse error:", err);
              return null;
            }
          }

          // Dukungan login instant melalui Override / Spectator session
          if (credentials?.action === 'override_login' && credentials?.overrideData) {
            try {
              const parsed = JSON.parse(credentials.overrideData);
              if (parsed && parsed.user && parsed.access_token) {
                return {
                  id: parsed.user.id,
                  name: parsed.user.name,
                  email: parsed.user.email,
                  username: parsed.user.username,
                  nipNbm: parsed.user.nipNbm,
                  role: parsed.user.role,
                  isActive: parsed.user.isActive !== false,
                  subRole: parsed.user.subRole,
                  subRole2: parsed.user.subRole2,
                  subRole3: parsed.user.subRole3,
                  subRole4: parsed.user.subRole4,
                  subRole5: parsed.user.subRole5,
                  token: parsed.access_token,
                  isOverrideSession: true,
                  overrideMode: parsed.mode || parsed.user.overrideMode || 'override',
                  isReadOnly: parsed.isReadOnly === true || parsed.mode === 'spectator',
                  overrideByAdminId: parsed.user.overrideByAdminId,
                  overrideByAdminName: parsed.user.overrideByAdminName,
                  overrideByAdminRole: parsed.user.overrideByAdminRole,
                };
              }
            } catch (err) {
              console.error("Override session parse error:", err);
              return null;
            }
          }

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
                "x-api-key": process.env.NEXT_PUBLIC_API_KEY || 'nailar-muhipo55',
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
                'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'nailar-muhipo55',
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
              if (errData?.message && typeof errData.message === 'string' && errData.message.startsWith('MAINTENANCE:')) {
                const msg = errData.message.replace('MAINTENANCE:', '');
                return `/login?error=MaintenanceMode&msg=${encodeURIComponent(msg)}`;
              }
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

          // Override metadata (Pastikan reset total jika isOverrideSession false atau tidak ada)
          const isOverride = (user as any).isOverrideSession === true;
          token.isOverrideSession = isOverride;
          token.overrideMode = isOverride ? ((user as any).overrideMode || 'override') : null;
          token.isReadOnly = isOverride ? Boolean((user as any).isReadOnly) : false;
          token.overrideByAdminId = isOverride ? ((user as any).overrideByAdminId || null) : null;
          token.overrideByAdminName = isOverride ? ((user as any).overrideByAdminName || null) : null;
          token.overrideByAdminRole = isOverride ? ((user as any).overrideByAdminRole || null) : null;
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

          // Override & Spectator metadata on session (Hanya aktif jika benar-benar sesi override)
          const isOverride = (token as any).isOverrideSession === true && (token as any).overrideByAdminId && (token as any).id !== (token as any).overrideByAdminId;
          ;(session.user as any).isOverrideSession = isOverride
          ;(session.user as any).overrideMode = isOverride ? ((token as any).overrideMode || null) : null
          ;(session.user as any).isReadOnly = isOverride ? Boolean((token as any).isReadOnly) : false
          ;(session.user as any).overrideByAdminId = isOverride ? ((token as any).overrideByAdminId || null) : null
          ;(session.user as any).overrideByAdminName = isOverride ? ((token as any).overrideByAdminName || null) : null
          ;(session.user as any).overrideByAdminRole = isOverride ? ((token as any).overrideByAdminRole || null) : null

          if ((token as any).accessToken) {
            try {
              const backendUrl = getBackendUrl();
              const verifyRes = await fetch(`${backendUrl}/users/${(token as any).id}/profile`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${(token as any).accessToken}`,
                  'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'nailar-muhipo55'
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
        // Sesuai Standar AGENTS.md Aturan 10:
        // Prioritas Penentuan Origin: 1) hostUrl aktif, 2) systemConfiguredDomain, 3) baseUrl, 4) http://localhost:3000
        const effectiveBase = (hostUrl || systemConfiguredDomain || baseUrl || 'http://localhost:3000').replace(/\/+$/, '');

        // Path relatif selalu diarahkan ke effectiveBase
        if (url.startsWith('/')) {
          return `${effectiveBase}${url}`;
        }

        try {
          const targetUrl = new URL(url);
          // Selalu pertahankan origin akses client aktif (effectiveBase)
          // dan teruskan path serta parameter pencarian tujuan
          return `${effectiveBase}${targetUrl.pathname}${targetUrl.search}`;
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
    cookies: {
      sessionToken: {
        name: `${isHttps ? '__Secure-' : ''}next-auth.session-token`,
        options: {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          secure: isHttps,
        },
      },
      callbackUrl: {
        name: `${isHttps ? '__Secure-' : ''}next-auth.callback-url`,
        options: {
          sameSite: 'lax',
          path: '/',
          secure: isHttps,
        },
      },
      csrfToken: {
        name: `${isHttps ? '__Host-' : ''}next-auth.csrf-token`,
        options: {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          secure: isHttps,
        },
      },
      pkceCodeVerifier: {
        name: `${isHttps ? '__Secure-' : ''}next-auth.pkce.code_verifier`,
        options: {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          secure: isHttps,
          maxAge: 900,
        },
      },
      state: {
        name: `${isHttps ? '__Secure-' : ''}next-auth.state`,
        options: {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          secure: isHttps,
          maxAge: 900,
        },
      },
    },
    trustHost: true
  };
}

const handler = async (req: NextRequest, ctx: any) => {
  const forwardedProto = req.headers.get('x-forwarded-proto');
  const proto = forwardedProto || (req.nextUrl?.protocol ? req.nextUrl.protocol.replace(':', '') : 'http');
  const forwardedHost = req.headers.get('x-forwarded-host');
  const headerHost = req.headers.get('host');
  const host = forwardedHost || headerHost || req.nextUrl?.host;
  
  if (host) {
    const origin = `${proto}://${host}`.replace(/\/+$/, '');
    process.env.NEXTAUTH_URL = origin;
  }

  const options = await getAuthOptions(req);
  return NextAuth(req, ctx, options as any);
};

export { handler as GET, handler as POST }

