import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
// Set JSON payload limits to allow base64 uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Serve built client in production
app.use(express.static(path.join(__dirname, 'dist')));

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Supabase Connection Setup
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zpxpwztyvhwuuidhdoou.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpweHB3enR5dmh3dXVpZGhkb291Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MjU4NzgsImV4cCI6MjA5ODQwMTg3OH0.9foiUxD3ofrRTeXPPU1F4blj1MKDYu-nb-tMsr0ube0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// In-memory data copy
let dbInMemory = {};
let roomsState = {};

// Load database from Supabase
async function initDb() {
  try {
    console.log('Loading state from Supabase...');
    const { data, error } = await supabase
      .from('game_state')
      .select('value')
      .eq('key', 'world_cup_state')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is code for "no rows returned"
      console.error('Error reading from Supabase:', error);
    }

    let db = data ? data.value : {};

    // Run schema migrations/setup if empty
    if (!db.adminPassword) db.adminPassword = '1234';
    if (!db.organizers) db.organizers = { "admin": "admin", "Jean": "J2710" };
    if (!db.rooms) {
      db.rooms = {
        "prediction": {
          "id": "prediction",
          "name": "Prediction Challenge",
          "pin": "2026",
          "gameState": "LOBBY",
          "currentQuestionId": null,
          "config": {
            "startingTokens": 100,
            "participationReward": 2,
            "correctPredictionReward": 10,
            "goldenGoalReward": 20,
            "timerDuration": 0,
            "revealStyle": "VAR"
          },
          "questions": [
            {
              "id": "q-prematch",
              "text": "น้องๆ พร้อมเรียนแล้วใช่ไหมค้าบบ",
              "difficulty": "PRE-MATCH",
              "imageUrl": null,
              "imageAlign": "TOP",
              "isPlayed": false
            },
            {
              "id": "q1",
              "text": "Have you ever used ChatGPT to help write code?",
              "difficulty": "EASY",
              "imageUrl": null,
              "imageAlign": "TOP",
              "isPlayed": false
            },
            {
              "id": "q2",
              "text": "Have you ever copied code without fully understanding it?",
              "difficulty": "EASY",
              "imageUrl": null,
              "imageAlign": "TOP",
              "isPlayed": false
            },
            {
              "id": "q3",
              "text": "Have you ever spent more than one hour debugging a single line of code?",
              "difficulty": "MEDIUM",
              "imageUrl": null,
              "imageAlign": "TOP",
              "isPlayed": false
            },
            {
              "id": "q4",
              "text": "Have you ever submitted work less than 24 hours before the deadline?",
              "difficulty": "MEDIUM",
              "imageUrl": null,
              "imageAlign": "TOP",
              "isPlayed": false
            }
          ],
          "players": {},
          "submissions": {},
          "questionStats": []
        },
        "auction": {
          "id": "auction",
          "name": "Python Auction",
          "pin": "1127",
          "gameState": "LOBBY",
          "currentQuestionId": null,
          "config": {
            "startingTokens": 100,
            "participationReward": 2,
            "correctPredictionReward": 10,
            "goldenGoalReward": 20,
            "timerDuration": 0,
            "revealStyle": "VAR"
          },
          "questions": [
            {
              "id": "aq1",
              "text": "What is the output of print(2 ** 3) in Python?",
              "difficulty": "EASY",
              "imageUrl": null,
              "imageAlign": "TOP",
              "isPlayed": false,
              "correctAnswer": "8"
            },
            {
              "id": "aq2",
              "text": "What built-in function is used to get the number of items in a list?",
              "difficulty": "EASY",
              "imageUrl": null,
              "imageAlign": "TOP",
              "isPlayed": false,
              "correctAnswer": "len"
            },
            {
              "id": "aq3",
              "text": "What is the output of [1, 2] + [3, 4] in Python?",
              "difficulty": "MEDIUM",
              "imageUrl": null,
              "imageAlign": "TOP",
              "isPlayed": false,
              "correctAnswer": "[1, 2, 3, 4]"
            },
            {
              "id": "aq4",
              "text": "Which keyword is used to start a function definition in Python?",
              "difficulty": "MEDIUM",
              "imageUrl": null,
              "imageAlign": "TOP",
              "isPlayed": false,
              "correctAnswer": "def"
            },
            {
              "id": "aq5",
              "text": "What is the output of list(map(lambda x: x*2, [1, 2]))[1]?",
              "difficulty": "HARD",
              "imageUrl": null,
              "imageAlign": "TOP",
              "isPlayed": false,
              "correctAnswer": "4"
            },
            {
              "id": "aq6",
              "text": "What is the result of list(set([1, 2, 2, 3, 3]))?",
              "difficulty": "HARD",
              "imageUrl": null,
              "imageAlign": "TOP",
              "isPlayed": false,
              "correctAnswer": "[1, 2, 3]"
            }
          ],
          "openQuestions": [
            {
              "id": "oq1",
              "text": "What is the output of print(type([]))?",
              "options": ["<class 'list'>", "<class 'tuple'>", "<class 'dict'>", "<class 'set'>"],
              "correctAnswer": "A",
              "isPlayed": false
            },
            {
              "id": "oq2",
              "text": "Which of these is NOT a valid Python variable name?",
              "options": ["_my_var", "my-var", "my_var2", "MYVAR"],
              "correctAnswer": "B",
              "isPlayed": false
            },
            {
              "id": "oq3",
              "text": "What is the default return value of a function that does not have a return statement?",
              "options": ["0", "None", "False", "Null"],
              "correctAnswer": "B",
              "isPlayed": false
            },
            {
              "id": "oq4",
              "text": "Which statement is used to handle exceptions in Python?",
              "options": ["try...except", "try...catch", "if...else", "do...while"],
              "correctAnswer": "A",
              "isPlayed": false
            }
          ],
          "players": {},
          "submissions": {},
          "questionStats": [],
          "currentBid": 10,
          "highestBidder": null,
          "auctionWinner": null
        }
      };
    }

    dbInMemory = db;

    // Load roomsState
    Object.keys(dbInMemory.rooms).forEach(roomId => {
      const r = dbInMemory.rooms[roomId];
      roomsState[roomId] = {
        id: r.id,
        name: r.name,
        pin: r.pin,
        gameState: r.gameState || 'LOBBY',
        currentQuestionId: r.currentQuestionId || null,
        config: r.config || {
          startingTokens: 100,
          participationReward: 2,
          correctPredictionReward: 10,
          goldenGoalReward: 20,
          timerDuration: 0,
          revealStyle: "VAR"
        },
        questions: r.questions || [],
        players: r.players || {},
        submissions: r.submissions || {},
        questionStats: r.questionStats || [],
        activeTimer: null,
        timerSecondsRemaining: 0,
        // Auction specific fields
        openQuestions: r.openQuestions || [],
        currentBid: r.currentBid || 10,
        highestBidder: r.highestBidder || null,
        auctionWinner: r.auctionWinner || null
      };
    });

    console.log('Database state loaded successfully.');
    // Save state back to remote just in case schema changes happened
    await saveDbToSupabase();
  } catch (err) {
    console.error('Fatal initialization error:', err);
  }
}

async function saveDbToSupabase() {
  try {
    const data = {
      adminPassword: dbInMemory.adminPassword || '1234',
      organizers: dbInMemory.organizers || { "admin": "admin", "Jean": "J2710" },
      rooms: {}
    };

    Object.keys(roomsState).forEach(roomId => {
      const r = roomsState[roomId];
      data.rooms[roomId] = {
        id: r.id,
        name: r.name,
        pin: r.pin,
        gameState: r.gameState,
        currentQuestionId: r.currentQuestionId,
        config: r.config,
        questions: r.questions,
        players: r.players,
        submissions: r.submissions,
        questionStats: r.questionStats,
        // Auction fields
        openQuestions: r.openQuestions || [],
        currentBid: r.currentBid || 10,
        highestBidder: r.highestBidder || null,
        auctionWinner: r.auctionWinner || null
      };
    });

    dbInMemory = data;

    const { error } = await supabase
      .from('game_state')
      .upsert({
        key: 'world_cup_state',
        value: data,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error writing to Supabase:', error);
    }
  } catch (err) {
    console.error('Error syncing database:', err);
  }
}

// Sync memory state back to disk
function syncDb() {
  saveDbToSupabase();
}

// Helpers
function getRoomByPin(pin) {
  return Object.values(roomsState).find(r => r.pin === pin) || null;
}

function getRoomById(id) {
  return roomsState[id] || null;
}

// Calculate player ranks based on tokens in a room
function calculateRanks(room) {
  if (!room) return;
  const playersArr = Object.values(room.players);
  if (playersArr.length === 0) return;

  playersArr.forEach(p => {
    p.prevRank = p.currentRank || 1;
  });

  playersArr.sort((a, b) => b.fanTokens - a.fanTokens);

  playersArr.forEach((p, idx) => {
    p.currentRank = idx + 1;
    room.players[p.id] = p;
  });
}

// Get list of players sorted by tokens / rank
function getSortedPlayers(room) {
  if (!room) return [];
  calculateRanks(room);
  return Object.values(room.players).sort((a, b) => b.fanTokens - a.fanTokens);
}

// Active Timer Logic per room
function startQuestionTimer(room, seconds, onTick, onComplete) {
  if (room.activeTimer) {
    clearInterval(room.activeTimer);
  }
  room.timerSecondsRemaining = seconds;
  onTick(seconds);

  room.activeTimer = setInterval(() => {
    room.timerSecondsRemaining--;
    if (room.timerSecondsRemaining <= 0) {
      clearInterval(room.activeTimer);
      room.activeTimer = null;
      onComplete();
    } else {
      onTick(room.timerSecondsRemaining);
    }
  }, 1000);
}

function stopQuestionTimer(room) {
  if (room.activeTimer) {
    clearInterval(room.activeTimer);
    room.activeTimer = null;
    room.timerSecondsRemaining = 0;
  }
}

// API Routes

// Register Organizer
app.post('/api/register', (req, res) => {
  const { username, password, regKey } = req.body;
  if (!username || !password || !regKey) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  if (regKey !== 'python-prefreshyCUP-2026') {
    return res.status(401).json({ error: 'Invalid master registration key.' });
  }
  if (!dbInMemory.organizers) dbInMemory.organizers = { "admin": "admin", "Jean": "J2710" };
  if (dbInMemory.organizers[username]) {
    return res.status(400).json({ error: 'Username is already registered.' });
  }
  dbInMemory.organizers[username] = password;
  syncDb();
  res.json({ success: true });
});

// Login Organizer
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!dbInMemory.organizers) dbInMemory.organizers = { "admin": "admin", "Jean": "J2710" };
  if (dbInMemory.organizers[username] && dbInMemory.organizers[username] === password) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Incorrect username or password.' });
  }
});

// Base64 Image Upload
app.post('/api/upload', async (req, res) => {
  const { imageBase64, filename } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'No image data.' });

  try {
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');
    const ext = path.extname(filename) || '.png';
    const newFilename = `img-${Date.now()}-${Math.floor(Math.random() * 1000)}${ext}`;

    // Upload to Supabase Storage bucket 'question-media'
    const { data, error } = await supabase.storage
      .from('question-media')
      .upload(newFilename, buffer, {
        contentType: `image/${ext.replace('.', '')}`,
        upsert: true
      });

    if (error) {
      console.error('Supabase storage upload error:', error);
      return res.status(500).json({ error: 'Upload failed.' });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('question-media')
      .getPublicUrl(newFilename);

    res.json({ success: true, url: publicUrl });
  } catch (err) {
    console.error('Upload processing error:', err);
    res.status(500).json({ error: 'Failed to process image.' });
  }
});

app.get('/api/rooms', (req, res) => {
  const list = Object.values(roomsState).map(r => ({
    id: r.id,
    name: r.name,
    pin: r.pin,
    playerCount: Object.keys(r.players).length
  }));
  res.json(list);
});

app.post('/api/verify-pin', (req, res) => {
  const { pin } = req.body;
  const room = getRoomByPin(pin);
  if (room) {
    res.json({ success: true, roomId: room.id, roomName: room.name });
  } else {
    res.status(404).json({ success: false, error: 'Invalid Game PIN' });
  }
});

app.get('/api/state/:roomId', (req, res) => {
  const room = getRoomById(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  
  res.json({
    gameState: room.gameState,
    currentQuestionId: room.currentQuestionId,
    activeQuestion: room.questions.find(q => q.id === room.currentQuestionId) || null,
    submissionsCount: Object.keys(room.submissions).length,
    totalPlayers: Object.keys(room.players).length,
    config: room.config,
    timerSecondsRemaining: room.timerSecondsRemaining,
    questionStats: room.questionStats
  });
});

app.get('/api/standings/:roomId', (req, res) => {
  const room = getRoomById(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(getSortedPlayers(room));
});

// CSV Export per room
app.get('/api/export/:roomId', (req, res) => {
  const room = getRoomById(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  const playersArr = getSortedPlayers(room);

  const total = playersArr.length;
  const sLimit = Math.max(1, Math.round(total * 0.15));
  const aLimit = Math.max(1, Math.round(total * 0.40));
  const bLimit = Math.max(1, Math.round(total * 0.80));

  let csvContent = 'Rank,Nickname,Fan Tokens,Matches Played,Correct Predictions,Incorrect Predictions,Accuracy %,Best Streak,Golden Goal Status,Participation %,Auction Eligible,Suggested Tier\n';
  
  playersArr.forEach((p, idx) => {
    const accuracy = p.matchesPlayed > 0 ? Math.round((p.goals / p.matchesPlayed) * 100) : 0;
    const totalRounds = room.questionStats.length;
    const participationRate = totalRounds > 0 ? Math.round((p.matchesPlayed / totalRounds) * 100) : 100;
    const eligible = participationRate >= 50 ? 'YES' : 'NO';
    const ggStatus = p.goldenGoalAvailable ? 'Available' : 'Used';
    
    let tier = 'C';
    if (idx < sLimit) tier = 'S';
    else if (idx < aLimit) tier = 'A';
    else if (idx < bLimit) tier = 'B';

    csvContent += `${idx + 1},"${p.name.replace(/"/g, '""')}",${p.fanTokens},${p.matchesPlayed},${p.goals},${p.misses},${accuracy}%,${p.bestStreak},"${ggStatus}",${participationRate}%,${eligible},${tier}\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=${room.id}_world_cup_standings.csv`);
  res.status(200).send(csvContent);
});

// WebSocket Event Handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Client requests room attachment
  socket.on('enter-room', ({ roomId, role, playerId }, callback) => {
    const room = getRoomById(roomId);
    if (!room) {
      return callback?.({ success: false, error: 'Room not found.' });
    }

    socket.join(roomId);
    socket.roomId = roomId;
    socket.role = role;
    socket.playerId = playerId;

    callback?.({
      success: true,
      gameState: room.gameState,
      currentQuestionId: room.currentQuestionId,
      activeQuestion: room.questions.find(q => q.id === room.currentQuestionId) || null,
      submissionsCount: Object.keys(room.submissions).length,
      config: room.config,
      timerSecondsRemaining: room.timerSecondsRemaining,
      submittedPlayerIds: Object.keys(room.submissions),
      questions: room.questions,
      standings: getSortedPlayers(room)
    });
  });

  // Player joins/reclaims game inside a room
  socket.on('join-game', ({ roomId, id, name }, callback) => {
    if (!roomId) {
      return callback?.({ success: false, error: 'Room ID is required.' });
    }
    const room = getRoomById(roomId);
    if (!room) {
      return callback?.({ success: false, error: 'Room not found.' });
    }

    if (!id || !name) {
      return callback?.({ success: false, error: 'Nickname and UUID are required.' });
    }

    // Server-side check for duplicate nickname
    const duplicate = Object.values(room.players).find(p => p.id !== id && p.name.toLowerCase() === name.trim().toLowerCase());
    if (duplicate) {
      return callback?.({ success: false, error: 'This nickname is already taken in this room!' });
    }

    let player = room.players[id];

    if (!player) {
      const existing = Object.values(room.players);
      let startingTokens = room.config.startingTokens;
      
      if (existing.length > 0) {
        const sum = existing.reduce((acc, p) => acc + p.fanTokens, 0);
        startingTokens = Math.max(50, Math.round(sum / existing.length));
      }

      player = {
        id,
        name: name.trim(),
        fanTokens: startingTokens,
        prevRank: 1,
        currentRank: 1,
        currentStreak: 0,
        bestStreak: 0,
        matchesPlayed: 0,
        goals: 0,
        misses: 0,
        goldenGoalAvailable: true,
        silverGoalAvailable: true,
        history: []
      };
      room.players[id] = player;
    } else {
      player.name = name.trim();
      if (player.silverGoalAvailable === undefined) {
        player.silverGoalAvailable = true;
      }
    }

    socket.roomId = roomId;
    socket.playerId = id;
    socket.role = 'player';
    socket.join(roomId);

    calculateRanks(room);
    syncDb();

    // Broadcast updated standings in room
    io.to(roomId).emit('standings-update', getSortedPlayers(room));
    
    callback?.({ 
      success: true, 
      player, 
      gameState: room.gameState, 
      activeQuestion: room.questions.find(q => q.id === room.currentQuestionId) || null,
      submissions: room.submissions[id] || null
    });
  });

  // Submit prediction within a room
  socket.on('submit-prediction', ({ roomId, playerId, answer, prediction, useGoldenGoal, useSilverGoal }, callback) => {
    if (!roomId) return callback?.({ success: false, error: 'Room ID is required.' });
    const room = getRoomById(roomId);
    if (!room) return callback?.({ success: false, error: 'Room not found.' });

    if (room.gameState !== 'ACTIVE_QUESTION') {
      return callback?.({ success: false, error: 'Submissions are closed!' });
    }

    const player = room.players[playerId];
    if (!player) {
      return callback?.({ success: false, error: 'Player profile not found.' });
    }

    const activeQuestion = room.questions.find(q => q.id === room.currentQuestionId);
    if (!activeQuestion) {
      return callback?.({ success: false, error: 'Active question not found.' });
    }

    if (useGoldenGoal) {
      if (activeQuestion.difficulty !== 'HARD') {
        return callback?.({ success: false, error: 'Golden Goal can only be used on HARD matches!' });
      }
      if (!player.goldenGoalAvailable) {
        return callback?.({ success: false, error: 'Golden Goal already used!' });
      }
    }

    if (useSilverGoal) {
      if (activeQuestion.difficulty !== 'MEDIUM') {
        return callback?.({ success: false, error: 'Silver Goal can only be used on MEDIUM matches!' });
      }
      if (!player.silverGoalAvailable) {
        return callback?.({ success: false, error: 'Silver Goal already used!' });
      }
    }

    room.submissions[playerId] = { 
      answer, 
      prediction, 
      useGoldenGoal: !!useGoldenGoal,
      useSilverGoal: !!useSilverGoal 
    };
    
    if (useGoldenGoal) {
      player.goldenGoalAvailable = false;
    }
    if (useSilverGoal) {
      player.silverGoalAvailable = false;
    }
    
    syncDb();

    callback?.({ success: true, submission: room.submissions[playerId] });
    
    io.to(roomId).emit('submission-count-update', {
      count: Object.keys(room.submissions).length,
      total: Object.keys(room.players).length,
      submittedPlayerIds: Object.keys(room.submissions)
    });

    // Auto-Close logic
    const subCount = Object.keys(room.submissions).length;
    const playerCount = Object.keys(room.players).length;
    if (playerCount > 0 && subCount === playerCount) {
      stopQuestionTimer(room);
      room.gameState = 'CLOSED';
      syncDb();

      io.to(roomId).emit('state-sync', {
        gameState: room.gameState,
        currentQuestionId: room.currentQuestionId,
        activeQuestion: room.questions.find(q => q.id === room.currentQuestionId) || null,
        submissionsCount: subCount,
        config: room.config,
        timerSecondsRemaining: 0,
        submittedPlayerIds: Object.keys(room.submissions)
      });
    }
  });

  // --- ADMIN ACTIONS (ROOM-SCOPED) ---
  
  // Open Question
  socket.on('admin-open-question', ({ roomId, questionId }, callback) => {
    const room = getRoomById(roomId);
    if (!room) return callback?.({ success: false, error: 'Room not found.' });

    const question = room.questions.find(q => q.id === questionId);
    if (!question) {
      return callback?.({ success: false, error: 'Question not found.' });
    }

    room.gameState = 'ACTIVE_QUESTION';
    room.currentQuestionId = questionId;
    room.submissions = {};
    stopQuestionTimer(room);
    calculateRanks(room);
    syncDb();

    io.to(roomId).emit('state-sync', {
      gameState: room.gameState,
      currentQuestionId: room.currentQuestionId,
      activeQuestion: question,
      submissionsCount: 0,
      config: room.config,
      timerSecondsRemaining: 0,
      submittedPlayerIds: []
    });
    io.to(roomId).emit('standings-update', Object.values(room.players));

    // Handle timer
    if (room.config.timerDuration > 0) {
      startQuestionTimer(
        room,
        room.config.timerDuration,
        (sec) => {
          io.to(roomId).emit('timer-tick', sec);
        },
        () => {
          room.gameState = 'CLOSED';
          syncDb();
          io.to(roomId).emit('state-sync', {
            gameState: room.gameState,
            currentQuestionId: room.currentQuestionId,
            activeQuestion: question,
            submissionsCount: Object.keys(room.submissions).length,
            config: room.config,
            timerSecondsRemaining: 0,
            submittedPlayerIds: Object.keys(room.submissions)
          });
        }
      );
    }

    callback?.({ success: true });
  });

  // Close Submissions (Presenter Skip)
  socket.on('admin-close-submissions', ({ roomId }, callback) => {
    const room = getRoomById(roomId);
    if (!room) return callback?.({ success: false, error: 'Room not found.' });

    if (room.gameState !== 'ACTIVE_QUESTION') {
      return callback?.({ success: false, error: 'No round is active.' });
    }

    stopQuestionTimer(room);
    room.gameState = 'CLOSED';
    syncDb();

    io.to(roomId).emit('state-sync', {
      gameState: room.gameState,
      currentQuestionId: room.currentQuestionId,
      activeQuestion: room.questions.find(q => q.id === room.currentQuestionId) || null,
      submissionsCount: Object.keys(room.submissions).length,
      config: room.config,
      timerSecondsRemaining: 0,
      submittedPlayerIds: Object.keys(room.submissions)
    });

    callback?.({ success: true });
  });

  // Reveal results
  socket.on('admin-reveal-results', ({ roomId }, callback) => {
    const room = getRoomById(roomId);
    if (!room) return callback?.({ success: false, error: 'Room not found.' });

    if (room.gameState !== 'CLOSED' && room.gameState !== 'ACTIVE_QUESTION') {
      return callback?.({ success: false, error: 'Submissions must be closed first.' });
    }

    stopQuestionTimer(room);
    room.gameState = 'REVEAL_SUSPENSE';
    
    const suspenseMs = room.config.revealStyle === 'VAR' ? 3000 : 500;
    
    io.to(roomId).emit('reveal-suspense-start', { 
      style: room.config.revealStyle, 
      ms: suspenseMs 
    });

    setTimeout(() => {
      const subs = Object.values(room.submissions);
      const totalVotes = subs.length;
      
      let yesCount = 0;
      let noCount = 0;
      
      subs.forEach(s => {
        if (s.answer === 'YES') yesCount++;
        else if (s.answer === 'NO') noCount++;
      });

      const yesPercent = totalVotes > 0 ? (yesCount / totalVotes) * 100 : 0;
      const noPercent = totalVotes > 0 ? (noCount / totalVotes) * 100 : 0;

      let outcome = 'PUSH';
      if (yesPercent > 50) outcome = 'HI';
      else if (yesPercent < 50) outcome = 'LOW';

      const question = room.questions.find(q => q.id === room.currentQuestionId);

      // Lock the question so it cannot be re-launched by accident
      if (question) {
        question.isPlayed = true;
      }

      const isPreMatch = question && question.difficulty === 'PRE-MATCH';
      const partReward = isPreMatch ? 0 : room.config.participationReward;

      Object.keys(room.players).forEach(id => {
        const player = room.players[id];
        const sub = room.submissions[id];

        if (!sub) return;

        player.matchesPlayed++;
        let earned = 0;

        if (outcome === 'PUSH') {
          earned = 0;
          player.history.push({
            questionId: room.currentQuestionId,
            questionText: question?.text,
            answer: sub.answer,
            prediction: sub.prediction,
            useGoldenGoal: !!sub.useGoldenGoal,
            useSilverGoal: !!sub.useSilverGoal,
            outcome: 'PUSH',
            tokensEarned: 0,
            participationTokens: partReward
          });
          player.fanTokens += partReward;
        } else {
          const isCorrect = sub.prediction === outcome;
          if (isCorrect) {
            player.goals++;
            player.currentStreak++;
            player.bestStreak = Math.max(player.bestStreak, player.currentStreak);
            if (isPreMatch) {
              earned = 0;
            } else if (sub.useGoldenGoal) {
              earned = room.config.goldenGoalReward || 20;
            } else if (sub.useSilverGoal) {
              earned = Math.round((room.config.correctPredictionReward || 10) * 1.5);
            } else {
              earned = room.config.correctPredictionReward || 10;
            }
          } else {
            player.misses++;
            player.currentStreak = 0;
            earned = 0;
          }

          player.history.push({
            questionId: room.currentQuestionId,
            questionText: question?.text,
            answer: sub.answer,
            prediction: sub.prediction,
            useGoldenGoal: !!sub.useGoldenGoal,
            useSilverGoal: !!sub.useSilverGoal,
            outcome: isCorrect ? 'GOAL' : 'MISS',
            tokensEarned: earned,
            participationTokens: partReward
          });
          player.fanTokens += earned + partReward;
        }
      });

      room.questionStats.push({
        questionId: room.currentQuestionId,
        questionText: question?.text || '',
        yesCount,
        noCount,
        totalCount: totalVotes,
        outcome,
        difficulty: question?.difficulty || 'MEDIUM'
      });

      room.gameState = 'REVEALED';
      calculateRanks(room);
      syncDb();

      io.to(roomId).emit('results-revealed', {
        yesPercent,
        noPercent,
        yesCount,
        noCount,
        outcome,
        winnerCount: getSortedPlayers(room).filter(p => {
          const sub = room.submissions[p.id];
          return sub && sub.prediction === outcome;
        }).length,
        players: getSortedPlayers(room),
        questionStats: room.questionStats
      });

      // Sync updated questions list (played lock changes) to client
      io.to(roomId).emit('questions-update', room.questions);

    }, suspenseMs);

    callback?.({ success: true });
  });

  // Reopen Round
  socket.on('admin-reopen-round', ({ roomId }, callback) => {
    const room = getRoomById(roomId);
    if (!room) return callback?.({ success: false, error: 'Room not found.' });

    if (room.gameState !== 'CLOSED' && room.gameState !== 'REVEALED') {
      return callback?.({ success: false, error: 'Cannot reopen from this state.' });
    }

    room.gameState = 'ACTIVE_QUESTION';
    syncDb();

    io.to(roomId).emit('state-sync', {
      gameState: room.gameState,
      currentQuestionId: room.currentQuestionId,
      activeQuestion: room.questions.find(q => q.id === room.currentQuestionId) || null,
      submissionsCount: Object.keys(room.submissions).length,
      config: room.config,
      timerSecondsRemaining: room.timerSecondsRemaining,
      submittedPlayerIds: Object.keys(room.submissions)
    });

    callback?.({ success: true });
  });

  // Cancel Current Active Round
  socket.on('admin-cancel-round', ({ roomId }, callback) => {
    const room = getRoomById(roomId);
    if (!room) return callback?.({ success: false, error: 'Room not found.' });

    Object.keys(room.submissions).forEach(playerId => {
      const sub = room.submissions[playerId];
      if (sub && room.players[playerId]) {
        if (sub.useGoldenGoal) {
          room.players[playerId].goldenGoalAvailable = true;
        }
        if (sub.useSilverGoal) {
          room.players[playerId].silverGoalAvailable = true;
        }
      }
    });

    room.gameState = 'LOBBY';
    room.currentQuestionId = null;
    room.submissions = {};
    stopQuestionTimer(room);
    syncDb();

    io.to(roomId).emit('state-sync', {
      gameState: 'LOBBY',
      currentQuestionId: null,
      activeQuestion: null,
      submissionsCount: 0,
      config: room.config,
      timerSecondsRemaining: 0
    });

    callback?.({ success: true });
  });

  // Go to next match lobby
  socket.on('admin-next-match', ({ roomId }, callback) => {
    const room = getRoomById(roomId);
    if (!room) return callback?.({ success: false, error: 'Room not found.' });

    room.gameState = 'LOBBY';
    room.currentQuestionId = null;
    room.submissions = {};
    stopQuestionTimer(room);
    syncDb();

    io.to(roomId).emit('state-sync', {
      gameState: 'LOBBY',
      currentQuestionId: null,
      activeQuestion: null,
      submissionsCount: 0,
      config: room.config,
      timerSecondsRemaining: 0
    });

    callback?.({ success: true });
  });

  // Reset Submissions for Current Active Question
  socket.on('admin-reset-question', ({ roomId }, callback) => {
    const room = getRoomById(roomId);
    if (!room) return callback?.({ success: false, error: 'Room not found.' });

    room.submissions = {};
    syncDb();
    
    io.to(roomId).emit('state-sync', {
      gameState: room.gameState,
      currentQuestionId: room.currentQuestionId,
      activeQuestion: room.questions.find(q => q.id === room.currentQuestionId) || null,
      submissionsCount: 0,
      config: room.config,
      timerSecondsRemaining: room.timerSecondsRemaining,
      submittedPlayerIds: []
    });
    
    callback?.({ success: true });
  });

  // Unlock Question for re-playing
  socket.on('admin-unlock-question', ({ roomId, questionId }, callback) => {
    const room = getRoomById(roomId);
    if (!room) return callback?.({ success: false, error: 'Room not found.' });

    const question = room.questions.find(q => q.id === questionId);
    if (question) {
      question.isPlayed = false;
      syncDb();
      io.to(roomId).emit('questions-update', room.questions);
      callback?.({ success: true });
    } else {
      callback?.({ success: false, error: 'Question not found.' });
    }
  });

  // Emergency Offline Mode
  socket.on('admin-emergency-offline', ({ roomId, yesCount, noCount }, callback) => {
    const room = getRoomById(roomId);
    if (!room) return callback?.({ success: false, error: 'Room not found.' });

    if (room.gameState !== 'CLOSED' && room.gameState !== 'ACTIVE_QUESTION') {
      return callback?.({ success: false, error: 'Round must be active or closed.' });
    }

    stopQuestionTimer(room);
    const totalVotes = yesCount + noCount;
    const yesPercent = totalVotes > 0 ? (yesCount / totalVotes) * 100 : 0;
    const noPercent = totalVotes > 0 ? (noCount / totalVotes) * 100 : 0;

    let outcome = 'PUSH';
    if (yesPercent > 50) outcome = 'HI';
    else if (yesPercent < 50) outcome = 'LOW';

    const question = room.questions.find(q => q.id === room.currentQuestionId);
    if (question) {
      question.isPlayed = true;
    }

    const isPreMatch = question && question.difficulty === 'PRE-MATCH';
    const partReward = isPreMatch ? 0 : room.config.participationReward;

    Object.keys(room.players).forEach(id => {
      const player = room.players[id];
      const sub = room.submissions[id];

      if (!sub) {
        player.matchesPlayed++;
        player.misses++;
        player.currentStreak = 0;
        player.fanTokens += partReward;
        
        player.history.push({
          questionId: room.currentQuestionId,
          questionText: question?.text,
          answer: 'MANUAL',
          prediction: 'NONE',
          useGoldenGoal: false,
          outcome: 'MISS',
          tokensEarned: 0,
          participationTokens: partReward
        });
        return;
      }

      player.matchesPlayed++;

      if (outcome === 'PUSH') {
        player.fanTokens += partReward;
        player.history.push({
          questionId: room.currentQuestionId,
          questionText: question?.text,
          answer: sub.answer,
          prediction: sub.prediction,
          useGoldenGoal: !!sub.useGoldenGoal,
          useSilverGoal: !!sub.useSilverGoal,
          outcome: 'PUSH',
          tokensEarned: 0,
          participationTokens: partReward
        });
      } else {
        const isCorrect = sub.prediction === outcome;
        let earned = 0;
        if (isCorrect) {
          player.goals++;
          player.currentStreak++;
          player.bestStreak = Math.max(player.bestStreak, player.currentStreak);
          if (isPreMatch) {
            earned = 0;
          } else if (sub.useGoldenGoal) {
            earned = room.config.goldenGoalReward || 20;
          } else if (sub.useSilverGoal) {
            earned = Math.round((room.config.correctPredictionReward || 10) * 1.5);
          } else {
            earned = room.config.correctPredictionReward || 10;
          }
        } else {
          player.misses++;
          player.currentStreak = 0;
          earned = 0;
        }

        player.fanTokens += earned + partReward;
        player.history.push({
          questionId: room.currentQuestionId,
          questionText: question?.text,
          answer: sub.answer,
          prediction: sub.prediction,
          useGoldenGoal: !!sub.useGoldenGoal,
          useSilverGoal: !!sub.useSilverGoal,
          outcome: isCorrect ? 'GOAL' : 'MISS',
          tokensEarned: earned,
          participationTokens: partReward
        });
      }
    });

    room.questionStats.push({
      questionId: room.currentQuestionId,
      questionText: question?.text || '',
      yesCount,
      noCount,
      totalCount: totalVotes,
      outcome,
      difficulty: question?.difficulty || 'MEDIUM'
    });

    room.gameState = 'REVEALED';
    calculateRanks(room);
    syncDb();

    io.to(roomId).emit('results-revealed', {
      yesPercent,
      noPercent,
      yesCount,
      noCount,
      outcome,
      winnerCount: getSortedPlayers(room).filter(p => {
        const sub = room.submissions[p.id];
        return sub && sub.prediction === outcome;
      }).length,
      players: getSortedPlayers(room),
      questionStats: room.questionStats
    });

    io.to(roomId).emit('questions-update', room.questions);

    callback?.({ success: true });
  });

  // Edit / Add Questions
  socket.on('admin-update-questions', ({ roomId, questions }, callback) => {
    const room = getRoomById(roomId);
    if (!room) return callback?.({ success: false, error: 'Room not found.' });

    room.questions = questions;
    syncDb();
    io.to(roomId).emit('questions-update', questions);
    callback?.({ success: true });
  });

  // Edit Config
  socket.on('admin-update-config', ({ roomId, config }, callback) => {
    const room = getRoomById(roomId);
    if (!room) return callback?.({ success: false, error: 'Room not found.' });

    room.config = { ...room.config, ...config };
    syncDb();
    io.to(roomId).emit('state-sync', {
      gameState: room.gameState,
      currentQuestionId: room.currentQuestionId,
      activeQuestion: room.questions.find(q => q.id === room.currentQuestionId) || null,
      submissionsCount: Object.keys(room.submissions).length,
      config: room.config,
      timerSecondsRemaining: room.timerSecondsRemaining
    });
    callback?.({ success: true });
  });

  // Helper to start Dutch Auction drop interval
  function startAuctionDrop(room) {
    if (room.activeTimer) {
      clearInterval(room.activeTimer);
    }
    
    room.activeTimer = setInterval(() => {
      const liveRoom = getRoomById(room.id);
      if (!liveRoom || liveRoom.gameState !== 'AUCTION_DROPPING') {
        clearInterval(room.activeTimer);
        if (liveRoom) liveRoom.activeTimer = null;
        return;
      }
      
      if (liveRoom.currentBid > 10) {
        liveRoom.currentBid = Math.max(10, liveRoom.currentBid - 5);
        io.to(liveRoom.id).emit('auction-price-update', {
          currentBid: liveRoom.currentBid
        });
        syncDb();
      } else {
        clearInterval(liveRoom.activeTimer);
        liveRoom.activeTimer = null;
      }
    }, 1500);
  }

  // Admin Start Auction Match
  socket.on('admin-start-auction', ({ roomId, questionId }, callback) => {
    const room = getRoomById(roomId);
    if (!room) return callback?.({ success: false, error: 'Room not found.' });

    const question = room.questions.find(q => q.id === questionId);
    if (!question) return callback?.({ success: false, error: 'Question not found.' });

    room.currentQuestionId = questionId;
    room.gameState = 'AUCTION_DROPPING';
    room.auctionWinner = null;
    room.submissions = {};

    let startPrice = 60;
    if (question.difficulty === 'EASY') startPrice = 40;
    else if (question.difficulty === 'HARD') startPrice = 80;

    room.currentBid = startPrice;
    syncDb();

    // Broadcast new state first
    io.to(roomId).emit('state-sync', {
      gameState: room.gameState,
      currentQuestionId: room.currentQuestionId,
      activeQuestion: question,
      submissionsCount: 0,
      config: room.config,
      timerSecondsRemaining: 0,
      currentBid: room.currentBid,
      auctionWinner: null
    });

    startAuctionDrop(room);
    callback?.({ success: true });
  });

  // Player buys auction (race condition check)
  socket.on('buy-auction', ({ roomId, playerId }, callback) => {
    const room = getRoomById(roomId);
    if (!room) return callback?.({ success: false, error: 'Room not found.' });

    if (room.gameState !== 'AUCTION_DROPPING') {
      return callback?.({ success: false, error: 'Auction is not active or already bought!' });
    }

    const player = room.players[playerId];
    if (!player) return callback?.({ success: false, error: 'Player not found.' });

    if (player.fanTokens < room.currentBid) {
      return callback?.({ success: false, error: 'Not enough Fan Tokens!' });
    }

    // Stop timer/dropping
    if (room.activeTimer) {
      clearInterval(room.activeTimer);
      room.activeTimer = null;
    }

    // Settle purchase
    room.gameState = 'AUCTION_ANSWERING';
    room.auctionWinner = playerId;
    player.fanTokens -= room.currentBid;
    calculateRanks(room);
    syncDb();

    const activeQuestion = room.questions.find(q => q.id === room.currentQuestionId);

    // Sync to all clients
    io.to(roomId).emit('state-sync', {
      gameState: room.gameState,
      currentQuestionId: room.currentQuestionId,
      activeQuestion,
      submissionsCount: 0,
      config: room.config,
      timerSecondsRemaining: 0,
      currentBid: room.currentBid,
      auctionWinner: playerId
    });

    io.to(roomId).emit('standings-update', getSortedPlayers(room));
    io.to(roomId).emit('auction-won', { winnerId: playerId, price: room.currentBid });

    callback?.({ success: true, price: room.currentBid });
  });

  // Admin Close Bidding (Skip/Cancel without buyer)
  socket.on('admin-close-bidding', ({ roomId }, callback) => {
    const room = getRoomById(roomId);
    if (!room) return callback?.({ success: false, error: 'Room not found.' });

    if (room.activeTimer) {
      clearInterval(room.activeTimer);
      room.activeTimer = null;
    }

    room.gameState = 'LOBBY';
    room.currentQuestionId = null;
    room.auctionWinner = null;
    syncDb();

    io.to(roomId).emit('state-sync', {
      gameState: room.gameState,
      currentQuestionId: null,
      activeQuestion: null,
      submissionsCount: 0,
      config: room.config,
      timerSecondsRemaining: 0
    });

    callback?.({ success: true });
  });

  // Submit Answer for Auction Question
  socket.on('submit-auction-answer', ({ roomId, playerId, answer }, callback) => {
    const room = getRoomById(roomId);
    if (!room) return callback?.({ success: false, error: 'Room not found.' });

    if (room.gameState !== 'AUCTION_ANSWERING') {
      return callback?.({ success: false, error: 'Not in answering phase!' });
    }

    if (room.auctionWinner !== playerId) {
      return callback?.({ success: false, error: 'You did not win this auction!' });
    }

    room.submissions[playerId] = { answer };
    room.gameState = 'AUCTION_ANSWERED'; // custom intermediate state while waiting for reveal
    syncDb();

    io.to(roomId).emit('state-sync', {
      gameState: room.gameState,
      currentQuestionId: room.currentQuestionId,
      activeQuestion: room.questions.find(q => q.id === room.currentQuestionId),
      submissionsCount: 1,
      config: room.config,
      timerSecondsRemaining: 0,
      currentBid: room.currentBid,
      auctionWinner: playerId
    });

    callback?.({ success: true });
  });

  // Admin Reveal Auction Question Outcome
  socket.on('admin-reveal-auction-results', ({ roomId, isCorrectOverride }, callback) => {
    const room = getRoomById(roomId);
    if (!room) return callback?.({ success: false, error: 'Room not found.' });

    if (room.gameState !== 'AUCTION_ANSWERED' && room.gameState !== 'AUCTION_ANSWERING') {
      return callback?.({ success: false, error: 'No answer to reveal!' });
    }

    const question = room.questions.find(q => q.id === room.currentQuestionId);
    if (!question) return callback?.({ success: false, error: 'Active question not found.' });

    const winnerId = room.auctionWinner;
    const player = room.players[winnerId];
    const sub = room.submissions[winnerId];

    let isCorrect = isCorrectOverride;
    if (isCorrect === undefined || isCorrect === null) {
      // Auto-evaluation by comparing answer strings
      const correctAns = (question.correctAnswer || '').trim().toLowerCase();
      const submittedAns = (sub?.answer || '').trim().toLowerCase();
      isCorrect = correctAns === submittedAns;
    }

    let bonus = 35; // MEDIUM default
    if (question.difficulty === 'EASY') bonus = 20;
    else if (question.difficulty === 'HARD') bonus = 50;

    let earned = 0;
    if (isCorrect) {
      player.goals++;
      earned = room.currentBid + bonus;
      player.fanTokens += earned;
    } else {
      player.misses++;
      // No token refund, already deducted in purchase
    }

    player.matchesPlayed++;
    player.history.push({
      questionId: room.currentQuestionId,
      questionText: question.text,
      answer: sub?.answer || 'NO RESPONSE',
      outcome: isCorrect ? 'CORRECT' : 'INCORRECT',
      tokensEarned: isCorrect ? bonus : -room.currentBid,
      pricePaid: room.currentBid
    });

    question.isPlayed = true;
    room.gameState = 'AUCTION_REVEAL';

    // Store in question stats
    room.questionStats.push({
      questionId: room.currentQuestionId,
      questionText: question.text,
      outcome: isCorrect ? 'CORRECT' : 'INCORRECT',
      winnerId,
      pricePaid: room.currentBid,
      difficulty: question.difficulty
    });

    // Check for bankruptcy alert
    const bankruptTeams = Object.values(room.players).filter(p => p.fanTokens <= 0);
    const bankruptcyAlert = bankruptTeams.length > 0;

    calculateRanks(room);
    syncDb();

    io.to(roomId).emit('results-revealed', {
      winnerId,
      isCorrect,
      price: room.currentBid,
      bonus,
      correctAnswer: question.correctAnswer,
      submittedAnswer: sub?.answer || '',
      players: getSortedPlayers(room),
      bankruptcyAlert
    });

    io.to(roomId).emit('questions-update', room.questions);
    callback?.({ success: true });
  });

  // Admin Next Auction Match
  socket.on('admin-next-auction-match', ({ roomId }, callback) => {
    const room = getRoomById(roomId);
    if (!room) return callback?.({ success: false, error: 'Room not found.' });

    room.gameState = 'LOBBY';
    room.currentQuestionId = null;
    room.auctionWinner = null;
    room.submissions = {};
    syncDb();

    io.to(roomId).emit('state-sync', {
      gameState: room.gameState,
      currentQuestionId: null,
      activeQuestion: null,
      submissionsCount: 0,
      config: room.config,
      timerSecondsRemaining: 0
    });

    callback?.({ success: true });
  });

  // Admin Launch Open Question
  socket.on('admin-launch-open-question', ({ roomId, questionId }, callback) => {
    const room = getRoomById(roomId);
    if (!room) return callback?.({ success: false, error: 'Room not found.' });

    const question = room.openQuestions.find(q => q.id === questionId);
    if (!question) return callback?.({ success: false, error: 'Open question not found.' });

    room.currentQuestionId = questionId;
    room.gameState = 'OPEN_QUESTION_ACTIVE';
    room.submissions = {};
    syncDb();

    io.to(roomId).emit('state-sync', {
      gameState: room.gameState,
      currentQuestionId: room.currentQuestionId,
      activeQuestion: question,
      submissionsCount: 0,
      config: room.config,
      timerSecondsRemaining: 0
    });

    callback?.({ success: true });
  });

  // Player Submits Open Question Answer
  socket.on('submit-open-answer', ({ roomId, playerId, answer }, callback) => {
    const room = getRoomById(roomId);
    if (!room) return callback?.({ success: false, error: 'Room not found.' });

    if (room.gameState !== 'OPEN_QUESTION_ACTIVE') {
      return callback?.({ success: false, error: 'Submissions are closed!' });
    }

    room.submissions[playerId] = { answer };
    syncDb();

    // Broadcast count update
    io.to(roomId).emit('submissions-count-update', {
      count: Object.keys(room.submissions).length,
      submittedPlayerIds: Object.keys(room.submissions)
    });

    callback?.({ success: true });
  });

  // Admin Reveal Open Question Outcome
  socket.on('admin-reveal-open-results', ({ roomId }, callback) => {
    const room = getRoomById(roomId);
    if (!room) return callback?.({ success: false, error: 'Room not found.' });

    if (room.gameState !== 'OPEN_QUESTION_ACTIVE') {
      return callback?.({ success: false, error: 'Not in active open question!' });
    }

    const question = room.openQuestions.find(q => q.id === room.currentQuestionId);
    if (!question) return callback?.({ success: false, error: 'Open question not found.' });

    Object.keys(room.players).forEach(id => {
      const player = room.players[id];
      const sub = room.submissions[id];

      const isCorrect = sub && sub.answer === question.correctAnswer;
      const earned = isCorrect ? 50 : 10;
      player.fanTokens += earned;
      player.matchesPlayed++;
      
      player.history.push({
        questionId: room.currentQuestionId,
        questionText: question.text,
        answer: sub?.answer || 'NO RESPONSE',
        outcome: isCorrect ? 'CORRECT' : 'INCORRECT',
        tokensEarned: earned,
        type: 'OPEN_QUESTION'
      });
    });

    question.isPlayed = true;
    room.gameState = 'OPEN_QUESTION_REVEAL';

    // Store in stats
    room.questionStats.push({
      questionId: room.currentQuestionId,
      questionText: question.text,
      outcome: question.correctAnswer,
      type: 'OPEN_QUESTION'
    });

    calculateRanks(room);
    syncDb();

    io.to(roomId).emit('results-revealed', {
      correctAnswer: question.correctAnswer,
      submissions: room.submissions,
      players: getSortedPlayers(room)
    });

    io.to(roomId).emit('open-questions-update', room.openQuestions);
    callback?.({ success: true });
  });

  // Admin Update Custom Open Questions List
  socket.on('admin-update-open-questions', ({ roomId, openQuestions }, callback) => {
    const room = getRoomById(roomId);
    if (!room) return callback?.({ success: false, error: 'Room not found.' });

    room.openQuestions = openQuestions;
    syncDb();
    io.to(roomId).emit('open-questions-update', openQuestions);
    callback?.({ success: true });
  });

  // Manual Adjust Tokens
  socket.on('admin-adjust-tokens', ({ roomId, playerId, amount }, callback) => {
    const room = getRoomById(roomId);
    if (!room) return callback?.({ success: false, error: 'Room not found.' });

    if (room.players[playerId]) {
      room.players[playerId].fanTokens = Math.max(0, room.players[playerId].fanTokens + amount);
      calculateRanks(room);
      syncDb();
      io.to(roomId).emit('standings-update', getSortedPlayers(room));
      callback?.({ success: true });
    } else {
      callback?.({ success: false, error: 'Player not found.' });
    }
  });

  // Kick Player
  socket.on('admin-kick-player', ({ roomId, playerId }, callback) => {
    const room = getRoomById(roomId);
    if (!room) return callback?.({ success: false, error: 'Room not found.' });

    if (room.players[playerId]) {
      delete room.players[playerId];
      if (room.submissions[playerId]) {
        delete room.submissions[playerId];
      }
      calculateRanks(room);
      syncDb();
      io.to(roomId).emit('standings-update', getSortedPlayers(room));
      callback?.({ success: true });
    } else {
      callback?.({ success: false, error: 'Player not found.' });
    }
  });

  // Reset Game
  socket.on('admin-reset-game', ({ roomId }, callback) => {
    const room = getRoomById(roomId);
    if (!room) return callback?.({ success: false, error: 'Room not found.' });

    room.players = {};
    room.gameState = 'LOBBY';
    room.currentQuestionId = null;
    room.submissions = {};
    room.questionStats = [];
    stopQuestionTimer(room);
    syncDb();

    io.to(roomId).emit('state-sync', {
      gameState: 'LOBBY',
      currentQuestionId: null,
      activeQuestion: null,
      submissionsCount: 0,
      config: room.config,
      timerSecondsRemaining: 0
    });
    io.to(roomId).emit('standings-update', []);
    callback?.({ success: true });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Single-page application router fallback in production
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 5000;
initDb().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
