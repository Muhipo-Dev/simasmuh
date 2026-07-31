<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This is **Next.js 16** running on **Turbopack**, optimized for speed and performance.

## 🛠 Project Setup & Rules

### 1. Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Run the development server
npm run dev
```

### 2. Code Standards

All code must follow these rules:

- All components must be written as **React Server Components** by default
- Only use `'use client'` when necessary (state, effects, event handlers)
- All API routes must be in `app/api-backend/` and use **Server Actions**
- Follow **TypeScript** type safety strictly
- Use **Tailwind CSS** for styling (no custom CSS files)
- All data fetching must use **React Server Components** fetching (no client-side `fetch` unless necessary)
- **Keep components small and focused** - break down complex UIs into smaller components
- **Use Turbopack's speed**: expect <200ms cold starts and instant hot module reload

### 3. Authentication Rules

- All API routes require authentication unless explicitly public
- User data is available via `useSession()` in client components
- Server Actions can access user via `getSession()` from `next-auth/server`
- **No bypassing authentication** - all protected routes must verify session

### 4. Data Fetching

```typescript
// Recommended - React Server Component
export default async function Page() {
  const data = await fetch('/api-backend/data').then(res => res.json())
  return <div>{data.message}</div>
}

// Client component fetching (if needed)
'use client'
import useSWR from 'swr'

export default function Component() {
  const { data, error } = useSWR('/api-backend/data', fetcher)
  return <div>{data.message}</div>
}
```

### 5. API Routes

All API routes must be in `app/api-backend/` and follow this structure:

**Example**: `app/api-backend/data/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from 'next-auth/server'

// GET request
export async function GET(request: NextRequest) {
  const session = await getSession({ request })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  return NextResponse.json({ message: 'Data' })
}

// POST request (Server Action style)
export async function POST(request: NextRequest) {
  const session = await getSession({ request })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const body = await request.json()
  // Process data...
  
  return NextResponse.json({ success: true, data: body })
}
```

### 6. TypeScript Rules

- All code must be **type-safe**
- Use strict type checking
- Avoid `any` type - use proper interfaces
- All components should have proper prop types

### 7. Tailwind CSS Rules

- **No custom CSS files** - all styling must use Tailwind utility classes
- Use responsive design with Tailwind breakpoints
- Follow the project's design system (colors, spacing, typography)
- Use dark mode utilities where appropriate

### 8. Performance Rules

- **Leverage Server Components** to reduce bundle size
- Avoid unnecessary client-side fetches
- Optimize images with Next.js `Image` component
- Use `async/await` for data fetching (not `.then()` chains)
- Keep components small and focused for faster rendering

### 9. Testing Rules

```bash
# Run tests
npm test

# Run with watch mode
npm test:watch
```

### 10. Environment Variables

All environment variables must be declared in `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api-backend
AUTH_SECRET=your-secret-key
DATABASE_URL=your-database-url
```

## 🚀 Why This Project is Special

- **Next.js 16 with Turbopack**: experience the future of Next.js with instant cold starts and lightning-fast hot module reload
- **React Server Components**: build server-rendered pages that load instantly
- **Strictly typed**: TypeScript ensures type safety throughout the codebase
- **Tailwind-only**: pure utility-first styling with no CSS files
- **Optimized performance**: built for speed and efficiency

## 🎯 Key Features

- [ ] Server-rendered pages with React Server Components
- [ ] Authentication with NextAuth.js
- [ ] API routes in `app/api-backend/`
- [ ] TypeScript type safety
- [ ] Tailwind CSS styling
- [ ] Responsive design
- [ ] Instant hot module reload
- [ ] Fast cold starts

## 📝 Development Workflow

1. **Understand the codebase**: explore `app/` for pages, `components/` for components, and `lib/` for utilities
2. **Identify the right tool**: choose between Server Components, Client Components, or Server Actions
3. **Write type-safe code**: follow TypeScript rules strictly
4. **Style with Tailwind**: use utility classes (no custom CSS)
5. **Test thoroughly**: run `npm test` before committing
6. **Verify performance**: ensure fast load times

## 📚 Quick Reference

- **Server Components**: default for most pages, direct data fetching
- **Client Components**: use `'use client'` only when needed
- **Server Actions**: all API endpoints in `app/api-backend/`
- **TypeScript**: strict type checking throughout
- **Tailwind**: utility classes only, no custom CSS

## 💬 AI Development Guidelines

When working on this project, always:

1. Prefer **Server Components** over Client Components
2. Use **Server Actions** for API endpoints
3. Write **TypeScript** code with proper types
4. Style with **Tailwind CSS** utilities only
5. Keep components **small and focused**
6. Optimize for **performance**
7. Avoid unnecessary client-side fetches
8. Test thoroughly before completing tasks
9. Respect the **Next.js 16 + Turbopack** architecture

**Ready to build fast! 🚀**
<!-- END:nextjs-agent-rules -->