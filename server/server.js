const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

// Załaduj zmienne środowiskowe
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:8000'],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting - max 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Zbyt wiele żądań z tego adresu IP, spróbuj ponownie później.'
});

// Rate limiting dla API Gemini - bardziej restrykcyjny
const geminiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // max 50 żądań na 15 minut
  message: 'Przekroczono limit żądań do API Gemini.'
});

app.use('/api/', limiter);
app.use('/api/gemini/', geminiLimiter);

// Prosty system autoryzacji
const sessions = new Map();

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Endpoint logowania dla nauczycieli/uczniów
app.post('/api/auth/session', (req, res) => {
  const { userId, role } = req.body;
  
  if (!userId || !role) {
    return res.status(400).json({ error: 'Brak userId lub role' });
  }
  
  // Generuj token sesji
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const sessionData = {
    userId,
    role,
    createdAt: Date.now(),
    requestCount: 0
  };
  
  sessions.set(sessionToken, sessionData);
  
  // Usuń sesję po 24 godzinach
  setTimeout(() => {
    sessions.delete(sessionToken);
  }, 24 * 60 * 60 * 1000);
  
  res.json({ sessionToken });
});

// Middleware autoryzacji
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Brak autoryzacji' });
  }
  
  const token = authHeader.substring(7);
  const session = sessions.get(token);
  
  if (!session) {
    return res.status(401).json({ error: 'Nieprawidłowy token sesji' });
  }
  
  // Sprawdź czy sesja nie wygasła (24h)
  if (Date.now() - session.createdAt > 24 * 60 * 60 * 1000) {
    sessions.delete(token);
    return res.status(401).json({ error: 'Sesja wygasła' });
  }
  
  req.session = session;
  next();
};

// Proxy endpoint dla Gemini API
app.post('/api/gemini/generate', requireAuth, async (req, res) => {
  try {
    const { prompt, generationConfig } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Brak prompt' });
    }
    
    // Sprawdź limit dla użytkownika
    req.session.requestCount++;
    
    // Limit dzienny per użytkownik
    if (req.session.role === 'student' && req.session.requestCount > 50) {
      return res.status(429).json({ 
        error: 'Przekroczono dzienny limit żądań (50 dla uczniów)' 
      });
    }
    
    if (req.session.role === 'teacher' && req.session.requestCount > 200) {
      return res.status(429).json({ 
        error: 'Przekroczono dzienny limit żądań (200 dla nauczycieli)' 
      });
    }
    
    // Wywołaj Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
            candidateCount: 1,
            ...generationConfig
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",  
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_NONE"
            }
          ]
        })
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Gemini API error:', error);
      return res.status(response.status).json({ 
        error: error.error?.message || 'Błąd API Gemini' 
      });
    }
    
    const data = await response.json();
    
    // Loguj użycie (do bazy danych w przyszłości)
    console.log(`[GEMINI USAGE] User: ${req.session.userId}, Role: ${req.session.role}, Count: ${req.session.requestCount}`);
    
    res.json(data);
    
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Błąd serwera proxy' });
  }
});

// Endpoint do sprawdzania statusu sesji
app.get('/api/auth/status', requireAuth, (req, res) => {
  res.json({
    userId: req.session.userId,
    role: req.session.role,
    requestCount: req.session.requestCount,
    dailyLimit: req.session.role === 'teacher' ? 200 : 50
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Serwer proxy działa na porcie ${PORT}`);
  console.log(`Dozwolone originy: ${process.env.ALLOWED_ORIGINS || 'http://localhost:8000'}`);
});