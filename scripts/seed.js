import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env and fill in your Supabase credentials.',
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

const movieTemplates = [
  {
    title: 'The Shawshank Redemption',
    description: 'Two imprisoned men bond over years, finding solace and eventual redemption through acts of common decency.',
    genre: 'Drama',
    year: 1994,
    status: 'watched',
  },
  {
    title: 'Inception',
    description: 'A thief who steals corporate secrets through dream-sharing technology is offered a chance at redemption.',
    genre: 'Sci-Fi',
    year: 2010,
    status: 'watched',
  },
  {
    title: 'The Dark Knight',
    description: 'Batman faces the Joker, a criminal mastermind who plunges Gotham into anarchy.',
    genre: 'Action',
    year: 2008,
    status: 'watched',
  },
  {
    title: 'Parasite',
    description: 'Greed and class discrimination threaten the newly formed symbiotic relationship between two families.',
    genre: 'Thriller',
    year: 2019,
    status: 'watched',
  },
  {
    title: 'Spirited Away',
    description: 'A young girl wanders into a world ruled by gods, witches, and spirits.',
    genre: 'Animation',
    year: 2001,
    status: 'watched',
  },
  {
    title: 'Everything Everywhere All at Once',
    description: 'A middle-aged Chinese immigrant is swept into an insane adventure across alternate universes.',
    genre: 'Comedy',
    year: 2022,
    status: 'watched',
  },
  {
    title: 'Dune: Part Two',
    description: 'Paul Atreides unites with the Fremen while seeking revenge against those who destroyed his family.',
    genre: 'Sci-Fi',
    year: 2024,
    status: 'want_to_watch',
  },
  {
    title: 'Oppenheimer',
    description: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.',
    genre: 'Drama',
    year: 2023,
    status: 'want_to_watch',
  },
  {
    title: 'Poor Things',
    description: 'The incredible tale of the fantastical evolution of Bella Baxter, brought back to life by a brilliant scientist.',
    genre: 'Romance',
    year: 2023,
    status: 'want_to_watch',
  },
  {
    title: 'The Batman',
    description: 'Batman ventures into Gotham City underworld when a sadistic killer leaves behind a trail of cryptic clues.',
    genre: 'Action',
    year: 2022,
    status: 'want_to_watch',
  },
  {
    title: 'Nope',
    description: 'The residents of a lonely gulch in inland California witness a mysterious discovery.',
    genre: 'Horror',
    year: 2022,
    status: 'want_to_watch',
  },
  {
    title: 'Blade Runner 2049',
    description: 'A young blade runner discovers a secret that could plunge society into chaos.',
    genre: 'Sci-Fi',
    year: 2017,
    status: 'want_to_watch',
  },
]

const seriesTemplates = [
  {
    title: 'Breaking Bad',
    description: 'A high school chemistry teacher turned methamphetamine producer partners with a former student.',
    genre: 'Drama',
    year: 2008,
    total_seasons: 5,
    status: 'watched',
  },
  {
    title: 'The Bear',
    description: 'A young chef from the fine dining world returns to Chicago to run his family sandwich shop.',
    genre: 'Comedy',
    year: 2022,
    total_seasons: 3,
    status: 'watched',
  },
  {
    title: 'Stranger Things',
    description: 'When a young boy vanishes, a small town uncovers a mystery involving secret experiments and supernatural forces.',
    genre: 'Sci-Fi',
    year: 2016,
    total_seasons: 4,
    status: 'watched',
  },
  {
    title: 'The Wire',
    description: 'The story of Baltimore drug scene, seen through the eyes of drug dealers and law enforcement.',
    genre: 'Drama',
    year: 2002,
    total_seasons: 5,
    status: 'watched',
  },
  {
    title: 'Fleabag',
    description: 'A dry-witted woman navigates life and love in London while trying to heal from tragedy.',
    genre: 'Comedy',
    year: 2016,
    total_seasons: 2,
    status: 'watched',
  },
  {
    title: 'Shogun',
    description: 'When a mysterious European ship is found marooned in a nearby fishing village, Lord Yoshii Toranaga discovers secrets.',
    genre: 'Drama',
    year: 2024,
    total_seasons: 1,
    status: 'want_to_watch',
  },
  {
    title: 'Fallout',
    description: 'The story of those who have and those who have not in a world where almost nothing is as it seems.',
    genre: 'Sci-Fi',
    year: 2024,
    total_seasons: 1,
    status: 'want_to_watch',
  },
  {
    title: 'House of the Dragon',
    description: 'An internal succession war within House Targaryen at the height of its power.',
    genre: 'Fantasy',
    year: 2022,
    total_seasons: 2,
    status: 'want_to_watch',
  },
  {
    title: 'Severance',
    description: 'Mark leads a team of office workers whose memories have been surgically divided between work and personal lives.',
    genre: 'Mystery',
    year: 2022,
    total_seasons: 2,
    status: 'want_to_watch',
  },
]

function buildRows(templates, userId, genreByName, type) {
  const positionByStatus = {
    want_to_watch: 0,
    watched: 0,
  }

  return templates.map((item) => {
    const position = positionByStatus[item.status]
    positionByStatus[item.status] += 1

    const row = {
      user_id: userId,
      title: item.title,
      description: item.description,
      genre_id: genreByName[item.genre] ?? null,
      year: item.year,
      status: item.status,
      position,
    }

    if (type === 'series') {
      row.total_seasons = item.total_seasons
    }

    return row
  })
}

function countByStatus(items) {
  return items.reduce(
    (counts, item) => {
      counts[item.status] += 1
      return counts
    },
    { want_to_watch: 0, watched: 0 },
  )
}

async function clearUserWatchlist(userId) {
  const { error: moviesError } = await supabase.from('movies').delete().eq('user_id', userId)
  if (moviesError) {
    throw moviesError
  }

  const { error: seriesError } = await supabase.from('series').delete().eq('user_id', userId)
  if (seriesError) {
    throw seriesError
  }
}

async function seedUser(profile, genreByName) {
  await clearUserWatchlist(profile.id)

  const movies = buildRows(movieTemplates, profile.id, genreByName, 'movie')
  const series = buildRows(seriesTemplates, profile.id, genreByName, 'series')

  const { error: moviesError } = await supabase.from('movies').insert(movies)
  if (moviesError) {
    throw moviesError
  }

  const { error: seriesError } = await supabase.from('series').insert(series)
  if (seriesError) {
    throw seriesError
  }

  const movieCounts = countByStatus(movieTemplates)
  const seriesCounts = countByStatus(seriesTemplates)
  const label = profile.username ?? profile.id

  console.log(
    `Seeded ${label}: ${movies.length} movies (${movieCounts.want_to_watch} want to watch, ${movieCounts.watched} watched), ${series.length} series (${seriesCounts.want_to_watch} want to watch, ${seriesCounts.watched} watched)`,
  )
}

async function main() {
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, username')
    .order('created_at', { ascending: true })

  if (profilesError) {
    throw profilesError
  }

  if (!profiles?.length) {
    console.log('No profiles found. Create users in Supabase Auth first, then run this script again.')
    return
  }

  const { data: genres, error: genresError } = await supabase.from('genres').select('id, name')
  if (genresError) {
    throw genresError
  }

  const genreByName = Object.fromEntries(genres.map((genre) => [genre.name, genre.id]))

  console.log(`Seeding watchlists for ${profiles.length} user(s)...`)

  for (const profile of profiles) {
    await seedUser(profile, genreByName)
  }

  console.log('Seed complete.')
}

main().catch((error) => {
  console.error('Seed failed:', error.message)
  process.exit(1)
})
