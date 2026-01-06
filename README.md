# Digital Tribute Web App

A full-stack web application for creating, managing, and sharing digital memorial tribute pages. This project allows families to preserve memories of loved ones through photos, videos, timelines, and guestbooks, accessible via a scannable QR code intended for memorial tablets or plaques.

## Features

### For Families (Admin)
- **Secure Dashboard:** Authenticated admin area to manage multiple tribute pages.
- **Media Management:** Bulk upload photos with automatic client-side compression.
- **Video Integration:** Embed YouTube videos easily.
- **Life Timeline:** Create a chronological timeline of significant life events.
- **Guestbook Moderation:** Review and approve messages from visitors before they go public.
- **QR Code Generation:** Generate high-resolution SVG/PNG QR codes for printing/engraving.
- **Data Export:** Download guestbook entries (CSV), photo metadata (CSV), or a full ZIP archive of all original photos.
- **Privacy Controls:** Toggle pages between Public and Private visibility.

### For Visitors (Public)
- **Mobile-First Design:** Optimized for viewing on mobile devices at the cemetery or memorial site.
- **Rich Media Gallery:** Smooth, animated lightbox for viewing photos.
- **Interactive Guestbook:** Leave messages and condolences (subject to moderation).
- **Short URLs:** easy-to-type redirect links (e.g., `/r/grandma`).

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + `clsx` / `tailwind-merge`
- **Database & Auth:** [Supabase](https://supabase.com/) (PostgreSQL, GoTrue)
- **Storage:** Supabase Storage (S3-compatible)
- **Icons:** Lucide React
- **Animations:** Framer Motion

## Getting Started

Follow these instructions to set up the project locally on your machine.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- A [Supabase](https://supabase.com/) account (free tier is sufficient)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd digital-tribute-web-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

### Configuration

1. **Set up Supabase:**
   - Create a new project in your Supabase dashboard.
   - Go to **Project Settings > API** to find your `Project URL` and `anon` public key.

2. **Environment Variables:**
   - Copy the example environment file:
     ```bash
     cp .env.local.example .env.local
     ```
     *(If `.env.local.example` doesn't exist, create `.env.local` manually)*
   - Update `.env.local` with your Supabase credentials:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

3. **Database Migration:**
   - Go to the **SQL Editor** in your Supabase dashboard.
   - Copy the contents of the migration files located in `supabase/migrations/` (in order) and run them to set up the tables, RLS policies, and storage buckets.
     - `20251227000000_initial_schema.sql`
     - `20251227000001_storage_setup.sql`

   *Alternatively, if you have the Supabase CLI installed, you can link the project and push the migrations.*

### Running the App

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Initial Setup

1. Navigate to `/login`.
2. Since user sign-ups might be disabled or restricted in production, you can manually create a user in the Supabase Authentication dashboard, or temporarily enable sign-ups to create your first admin account.
3. Once logged in, you will be redirected to the Admin Dashboard.

## Deployment

The easiest way to deploy this app is using [Vercel](https://vercel.com/):

1. Push your code to a Git repository (GitHub, GitLab, etc.).
2. Import the project into Vercel.
3. Add the `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` environment variables in the Vercel project settings.
4. Deploy.

## License

[MIT](LICENSE)