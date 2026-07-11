# Movie & Series Watchlist

A personal watchlist app for tracking movies and TV series. Users can organize titles on a Trello-style board with drag-and-drop, split across **Want to Watch** and **Watched** columns.

Inspired by [Letterboxd](https://letterboxd.com), the UI uses a dark theme with amber accents and responsive Bootstrap layouts.

---

## Project Description

### What it does

- **Landing page** — Introduces the app and links visitors to sign in.
- **Authentication** — Register and log in with email and password (Supabase Auth).
- **Dashboard** — Shows watchlist stats (total, want to watch, watched) for movies and series.
- **Movies board** — Two-column kanban board to add, edit, delete, reorder, and drag movies between statuses.
- **Series board** — Same board experience for TV series, including season and episode counts.

### Who can do what

| Role | Capabilities |
|------|--------------|
| **Visitor (not signed in)** | View the landing page and login/register page |
| **Signed-in user** | View dashboard, manage their own movies and series, drag-and-drop to reorder and change status |
| **Other users** | Cannot view or modify another user's watchlist (enforced by Row Level Security) |

Each user only sees and edits their own data. Genres are shared read-only lookup values available to everyone.

---

## Architecture

```mermaid
flowchart TB
  subgraph client [Front-end - Vite SPA]
    HTML[index.html]
    App[app.js + router.js]
    Pages[pages/]
    Components[components/]
    Services[lib/]
    Styles[style.css + Bootstrap 5]
  end

  subgraph supabase [Back-end - Supabase]
    Auth[Supabase Auth]
    DB[(PostgreSQL)]
    RLS[Row Level Security]
  end

  HTML --> App
  App --> Pages
  Pages --> Services
  Services --> Auth
  Services --> DB
  DB --> RLS
```

### Front-end

| Technology | Purpose |
|------------|---------|
| **HTML / CSS / JavaScript** | Core UI, no React/Vue framework |
| **Vite** | Dev server, bundling, and production builds |
| **Bootstrap 5** | Layout, forms, modals, toasts, responsive grid |
| **SortableJS** | Drag-and-drop on movie and series boards |

The app is a **single-page application (SPA)** with client-side routing. Pages render as HTML strings and bind event handlers after each navigation.

### Back-end

| Technology | Purpose |
|------------|---------|
| **Supabase** | Hosted backend (Auth + PostgreSQL + REST/JS client) |
| **PostgreSQL** | Relational database for profiles, movies, series, genres |
| **Row Level Security (RLS)** | Ensures users can only access their own watchlist rows |

There is no custom Node.js API server. The browser talks directly to Supabase using the **anon key**, with access controlled by RLS policies and the authenticated user's JWT.

### Database

- **Supabase Auth** (`auth.users`) stores credentials.
- **`profiles`** extends auth users with app-specific fields.
- **`movies`** and **`series`** store per-user watchlist items.
- **`genres`** is a shared lookup table.

Schema changes are versioned in `supabase/migrations/`.

---

## Database Schema Design

### Entity relationship diagram

```mermaid
erDiagram
  auth_users ||--|| profiles : "extends"
  profiles ||--o{ movies : owns
  profiles ||--o{ series : owns
  genres ||--o{ movies : categorizes
  genres ||--o{ series : categorizes

  auth_users {
    uuid id PK
  }

  profiles {
    uuid id PK,FK
    text username UK
    text avatar_url
    timestamptz created_at
    timestamptz updated_at
  }

  genres {
    smallint id PK
    text name UK
  }

  movies {
    uuid id PK
    uuid user_id FK
    text title
    text description
    smallint genre_id FK
    smallint year
    watch_status status
    int position
    timestamptz created_at
  }

  series {
    uuid id PK
    uuid user_id FK
    text title
    text description
    smallint genre_id FK
    smallint year
    smallint total_seasons
    smallint total_episodes
    watch_status status
    int position
    timestamptz created_at
  }
```

### Enum: `watch_status`

| Value | Meaning |
|-------|---------|
| `want_to_watch` | On the user's watchlist |
| `watched` | Already watched |

### Key relationships

- **`profiles.id`** references **`auth.users.id`** — one profile per auth user.
- **`movies.user_id`** and **`series.user_id`** reference **`profiles.id`** — each row belongs to one user.
- **`genre_id`** on movies/series optionally references **`genres.id`**.
- **`position`** controls card order within a status column; updated via drag-and-drop.

### Security model

RLS policies on `movies` and `series` restrict `SELECT`, `INSERT`, `UPDATE`, and `DELETE` to rows where `auth.uid() = user_id`. Genres are readable by all authenticated users. Profiles are publicly readable; users can only insert/update their own profile.

A database trigger (`handle_new_user`) automatically creates a profile when a new user registers.

---

## Local Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [npm](https://www.npmjs.com/)
- A [Supabase](https://supabase.com) project

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd movie-watchlist
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example env file and fill in your Supabase credentials:

```bash
cp .env.example .env
```

| Variable | Used by | Description |
|----------|---------|-------------|
| `VITE_SUPABASE_URL` | Front-end | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Front-end | Public anon key (safe for browser) |
| `SUPABASE_URL` | Seed script | Same project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Seed script | Service role key (**server-side only**) |

Find URL and keys in the Supabase dashboard under **Project Settings → API**.

### 4. Apply database migrations

Run the SQL files in `supabase/migrations/` against your Supabase project, in filename order:

1. `20260709180000_initial_watchlist_schema.sql`
2. `20260709180100_fix_function_security.sql`
3. `20260709190000_remove_poster_url.sql`
4. `20260711094700_add_series_table.sql`
5. `20260711110000_add_series_total_episodes.sql`

You can paste them into the Supabase SQL Editor or use the Supabase CLI if configured locally.

### 5. Configure Supabase Auth (recommended)

In **Authentication → Providers → Email**, disable **Confirm email** for easier local testing so users can sign in immediately after registration.

### 6. Start the dev server

```bash
npm run dev
```

Vite opens the app at `http://localhost:5173` by default.

### 7. Seed sample data (optional)

1. Register one or more users through the app (`/login`).
2. Run the seed script (requires the service role key in `.env`):

```bash
npm run seed
```

The script clears and repopulates movies and series for every existing profile with sample titles split across both statuses.

### Other scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build locally |

---

## Key Folders and Files

```
movie-watchlist/
├── index.html              # App entry HTML shell
├── vite.config.js          # Vite configuration (SPA mode)
├── package.json            # Dependencies and npm scripts
├── .env.example            # Environment variable template
│
├── src/
│   ├── main.js             # Bootstraps Bootstrap, styles, and initApp()
│   ├── app.js              # Route table, auth guards, page binding
│   ├── router.js           # Client-side History API router
│   ├── style.css           # Letterboxd-inspired theme and board styles
│   │
│   ├── pages/
│   │   ├── home.js         # Landing page (/)
│   │   ├── login.js        # Login / register (/login)
│   │   ├── dashboard.js    # User stats (/dashboard)
│   │   ├── movies.js       # Movies kanban board (/movies)
│   │   ├── series.js       # Series kanban board (/series)
│   │   └── movie.js        # Single movie detail route (/movies/:id/)
│   │
│   ├── components/
│   │   ├── layout.js       # App shell (header + main + footer)
│   │   ├── header.js       # Navbar with nav links and logout
│   │   ├── footer.js       # Site footer
│   │   └── toast.js        # Bootstrap toast notifications
│   │
│   └── lib/
│       ├── supabase.js     # Supabase client singleton
│       ├── auth.js         # Sign in, sign up, sign out, session state
│       ├── movies.js       # Movies CRUD and reorder API calls
│       └── series.js       # Series CRUD and reorder API calls
│
├── scripts/
│   └── seed.js             # Populates sample movies/series for all users
│
└── supabase/
    └── migrations/         # Versioned SQL schema migrations
```

### File responsibilities

| File | Purpose |
|------|---------|
| `src/app.js` | Defines routes, protects `/dashboard`, `/movies`, `/series`, and wires page-specific `bind*` functions after each render |
| `src/pages/movies.js` | Renders the movies board, modals, SortableJS drag-and-drop, and form handling |
| `src/pages/series.js` | Same board pattern for series (includes total seasons/episodes) |
| `src/lib/movies.js` | Supabase queries: list, create, update, delete, reorder movies |
| `src/lib/series.js` | Supabase queries: list, create, update, delete, reorder series |
| `src/lib/auth.js` | Wraps Supabase Auth and exposes session helpers to the app |
| `src/components/toast.js` | Global success/error toast helper used after CRUD and drag actions |
| `scripts/seed.js` | Backend seed using the service role key; never import in front-end code |

---

## Routes

| Path | Access | Description |
|------|--------|-------------|
| `/` | Public | Landing page |
| `/login` | Public | Login and registration |
| `/dashboard` | Auth required | Watchlist statistics |
| `/movies` | Auth required | Movies kanban board |
| `/series` | Auth required | Series kanban board |
| `/movies/:id/` | Public | Movie detail page |

---

## Deployment

The app is designed for static hosting (e.g. **Netlify**):

- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **Environment variables:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

---

## License

Private project — see repository settings for license details.
