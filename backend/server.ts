import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';
import axios from "axios";
import * as cheerio from "cheerio";

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const URL = "https://web.spaggiari.eu/sdg/app/default/comunicati.php?sede_codice=FIIT0009&referer=www.itismeucci.net";

// Middleware to enable Cross-Origin Resource Sharing (CORS)
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));

// Middleware to parse JSON request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For URL-encoded bodies

// Initialize session middleware (important for passport)
app.use(session({
  secret: process.env.SESSION_SECRET || 'change_this_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }, // In production set to true with HTTPS
}));

// Initialize passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Configure Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,       // set in your .env
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!, // set in your .env
  callbackURL: '/auth/google/callback',          // callback route you will create
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Upsert user in your DB using Prisma
    const user = await prisma.user.upsert({
      where: { googleId: profile.id },
      update: {
        email: profile.emails?.[0].value,
        name: profile.displayName,
        avatar: profile.photos?.[0].value,
      },
      create: {
        googleId: profile.id,
        email: profile.emails?.[0].value!,
        name: profile.displayName,
        avatar: profile.photos?.[0].value,
      },
    });
    done(null, user);
  } catch (err) {
    done(err, false);
  }
}));

// Serialize user for session
passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (err) {
    done(err, false)
  }
});

export async function scrapeCircolari() {
  const res = await axios.get(URL);
  const $ = cheerio.load(res.data);

  const rows = $("#table-documenti tbody tr");
  type Circolare = {
    id: string;
    title: string;
    date: string;
    url: string;
  };

  const circolari: Circolare[] = [];

  rows.each((index, row) => {
    if (index === 0) return; // skip header row if needed

    const title = $(row).find("td:nth-child(2) span").text().trim();
    const date = $(row).find("td:nth-child(2) > span:nth-child(4)").text().trim();
    const id = $(row).find("td:nth-child(3) div.link-to-file").attr("id_doc");
    if (title && date && id) {
      circolari.push({
        id,
        date,
        title,
        url: `https://web.spaggiari.eu/sdg/app/default/view_documento.php?a=akVIEW_FROM_ID&id_documento=${id}&sede_codice=FIIT0009`,
      });
    }
  });

  return circolari;
}

app.get('/api/schedule', async (req: Request, res: Response): Promise<any> => {
  const classId = req.query.classId as string;

  // Input validation
  if (!classId) {
    return res.status(400).json({ error: 'classId is required as a query parameter.' });
  }

  try {
    // Fetch lessons from the database for the given classId
    const lessons = await prisma.lesson.findMany({
      where: { classId: classId }, // Ensure the classId matches a field in your Prisma schema's Lesson model
      orderBy: [
        { day: 'asc' },        // Order by day in ascending order
        { startTime: 'asc' }   // Then by start time in ascending order
      ],
    });

    // If no lessons are found, you might want to return an empty array or a specific message
    if (lessons.length === 0) {
      return res.status(404).json({ message: 'No lessons found for the provided classId.' });
    }

    // Send the fetched lessons as a JSON response
    res.json(lessons);
  } catch (error) {
    // Log the detailed error to the console for debugging
    console.error('Error fetching schedule:', error);
    // Send a generic 500 Internal Server Error response to the client
    res.status(500).json({ error: 'Failed to retrieve schedule due to an internal server error.' });
  }
});


app.get('/api/classes', async (req, res) => {
  try {
    const classes = await prisma.class.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.json(classes);
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// Basic root endpoint (optional, but good for health checks)
app.get('/', (req: Request, res: Response) => {
  res.send('MeucciHub Backend API is running!');
});

// Redirect user to Google login
app.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

// Google OAuth callback route
app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req: Request, res: Response) => {
      // On successful login, redirect to your frontend app
      res.redirect('http://localhost:5173'); // Replace with your frontend URL
    }
);

// Endpoint to get current logged-in user info
app.get('/api/me', (req: Request, res: Response) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    res.json(req.user);
  } else {
    // res.status(401).json({ error: 'Not authenticated' });
    res.json(req.user = {
      id: 'mock-user-id',
      name: 'Test User',
      email: 'test@example.com',
    });
  }
});

app.get('/api/circolari', async (req: Request, res: Response) => {
  try {
    const circolari = await scrapeCircolari();
    res.json(circolari);
  } catch (error) {
    console.error("Error scraping circolari:", error);
    res.status(500).json({error: "Failed to fetch circolari"});
  }
});

// Error handling middleware (optional, for catching unhandled errors)
app.use((err: Error, req: Request, res: Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Define the port the server will listen on
const PORT = process.env.PORT || 4000;

// Start the server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Access API at http://localhost:${PORT}/api/schedule?classId=YOUR_CLASS_ID`);
});