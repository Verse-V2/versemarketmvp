This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, set up your environment variables by creating a `.env.local` file in the root directory with the following content:

```
# The Graph API key for accessing Gateway
NEXT_PUBLIC_GRAPH_API_KEY=your_api_key_here

# Polymarket Subgraph ID - replace with the correct ID for the Polymarket subgraph
NEXT_PUBLIC_POLYMARKET_SUBGRAPH_ID=81Dm16JjuFSrqz813HysXoUPvzTwE7fsfPk2RTf66nyC
```

You'll need to obtain an API key from [The Graph](https://thegraph.com/studio/) to access the hosted service.

Then, run the development server:

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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## The Graph Integration

This project uses [The Graph](https://thegraph.com/) to fetch data from the Polymarket subgraph. To access this data, you need to:

1. Sign up for an account on [The Graph](https://thegraph.com/studio/)
2. Create an API key in your account dashboard
3. Add the API key to your `.env.local` file as `NEXT_PUBLIC_GRAPH_API_KEY`

The subgraph provides market price history and other market data that powers the charts and market displays in the application.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
