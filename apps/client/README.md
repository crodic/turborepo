This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Dynamic Runtime Theme

The client can consume a published theme selected from the admin portal at runtime.

- `NEXT_PUBLIC_ENABLE_RUNTIME_THEME=true` enables the runtime theme fetch and client-side sync.
- `NEXT_PUBLIC_ENABLE_RUNTIME_THEME=false` disables runtime theme usage and falls back to the static CSS/theme source code.

If the client app does not need dynamic runtime themes, remove these pieces:

- `src/lib/runtime-theme.ts`
- `src/components/runtime-theme-sync.tsx`
- the `RuntimeThemeSync`, `getRuntimeThemeServer`, and `generateRuntimeThemeCss` imports/usages in `src/app/[locale]/layout.tsx`
- the `NEXT_PUBLIC_ENABLE_RUNTIME_THEME` env variable from deployment config if it is no longer referenced

After removing those pieces, keep the static theme tokens in `src/app/globals.css` and the existing `ThemeProvider` setup.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
