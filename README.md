# Modern SaaS Boilerplate

A production-ready SaaS boilerplate built with modern technologies to help you kickstart your next SaaS project quickly. Features server-side rendering, server actions, and a clean, maintainable architecture.

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org) with App Router and Server Actions
- **Authentication & Database**: [Supabase](https://supabase.com) with PKCE Flow
- **Payments**: [Stripe](https://stripe.com) with Server-Side Integration
- **Styling**: [TailwindCSS](https://tailwindcss.com) + [DaisyUI](https://daisyui.com)
- **Language**: [TypeScript](https://www.typescriptlang.org)

## Features

- 🔐 Secure Authentication with Supabase
  - Email + Password authentication
  - Google OAuth with PKCE flow
  - Enhanced OAuth callback handling with automatic retries
  - Server-side session management
  
- 💳 Stripe Integration
  - Server-side subscription management
  - Secure payment processing
  - Customer portal integration
  - Webhook handling for subscription events
  
- 🏗️ Modern Architecture
  - Server Actions for secure API operations
  - Server-side Supabase client for enhanced security
  - Optimized authentication flow with retry mechanism
  - Clean separation of client and server code
  
- 🎨 Polished UI/UX
  - Modern UI with TailwindCSS and DaisyUI
  - Fully responsive design
  - Loading states and error handling
  - Theme switching support
  
- 🔒 Enhanced Security
  - Server-side API calls
  - Type-safe operations with TypeScript
  - Secure environment variable handling
  - Protected routes with middleware

## Project Structure

```
app/
├── actions/           # Server Actions
│   ├── auth.ts       # Authentication actions
│   ├── auth-client.ts # Client-side auth utilities
│   ├── stripe.ts     # Stripe payment actions
│   └── stripe-portal.ts # Customer portal actions
├── api/              # API Routes (Webhooks only)
├── components/       # React Components
├── contexts/         # React Contexts
└── utils/           # Utility functions
    ├── supabase-server.ts  # Server-side Supabase client
    └── stripe-helpers-server.ts # Server-side Stripe utilities
```

## Getting Started

1. Clone this repository
2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up your environment variables:
   - Copy `.env.example` to `.env.local`
   - Fill in your Supabase credentials
   - Fill in your Stripe credentials
   - Configure Google OAuth (optional)

4. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

5. For Stripe webhook testing, run the Stripe CLI:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

The following environment variables are required:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
STRIPE_CLI_WEBHOOK_SECRET=your_stripe_cli_webhook_secret

# Stripe Price IDs
STRIPE_PRICE_BASIC=your_basic_price_id
STRIPE_PRICE_PRO=your_pro_price_id
STRIPE_PRICE_ENTERPRISE=your_enterprise_price_id

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Google OAuth
# Get these from Google Cloud Console (https://console.cloud.google.com)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

> Note: Replace all placeholder values (e.g., 'your_stripe_secret_key') with your actual credentials. Never commit real credentials to version control.

## Key Implementation Details

### Authentication Flow
- Uses PKCE (Proof Key for Code Exchange) flow for enhanced security
- Server-side session handling with automatic retries
- Graceful error handling with fallback mechanisms

### Server Actions
- Replaced API routes with server actions for better performance
- Direct database access from server components
- Type-safe operations with proper error handling

### Stripe Integration
- Server-side subscription management
- Secure webhook handling
- Customer portal integration for subscription management

## Deployment

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License
