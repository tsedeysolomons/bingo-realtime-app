const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Store active users and game state
const users = {};
let drawnNumbers = [];
const BINGO_RANGE = 75;
let gameActive = true;

// User authentication endpoint
app.post('/auth', (req, res) => {
  const { username } = req.body;
  
  if (!username || username.trim() === '') {
    return res.status(400).json({ error: 'Username is required' });
  }
  
  if (users[username]) {
    return res.status(409).json({ error: 'Username already taken' });
  }
  
  users[username] = { 
    socketId: null,
    card: generateBingoCard(),
    claims: []
  };
  
  res.status(200).json({ success: true });
});

const generateBingoCard = () => {
  const card = [];
  const ranges = [
    [1, 15],  // B
    [16, 30], // I
    [31, 45], // N
    [46, 60], // G
    [61, 75]  // O
  ];
  
  ranges.forEach(([min, max]) => {
    const column = [];
    while (column.length < 5) {
      const num = Math.floor(Math.random() * (max - min + 1)) + min;
      if (!column.includes(num)) {
        column.push(num);
      }
    }
    card.push(column);
  });
  
  // Mark center as FREE
  card[2][2] = -1;
  
  return card;
};

const drawNumber = () => {
  if (!gameActive || drawnNumbers.length >= BINGO_RANGE) return;
  
  let number;
  do {
    number = Math.floor(Math.random() * BINGO_RANGE) + 1;
  } while (drawnNumbers.includes(number));
  
  drawnNumbers.push(number);
  io.emit('number-drawn', number);
};

setInterval(drawNumber, 3000);

io.on('connection', (socket) => {
  console.log('New client connected');
  
  socket.on('authenticate', (username) => {
    if (users[username]) {
      users[username].socketId = socket.id;
      socket.emit('authentication-success', { 
        card: users[username].card,
        drawnNumbers,
        gameActive
      });
      console.log(`User ${username} authenticated`);
    }
  });
  
  socket.on('claim-bingo', ({ username, pattern }) => {
    if (users[username]) {
      io.emit('bingo-claimed', { username, pattern });
      console.log(`${username} claims BINGO with ${pattern}`);
    }
  });

  socket.on('disconnect', () => {
    for (const username in users) {
      if (users[username].socketId === socket.id) {
        console.log(`User ${username} disconnected`);
        delete users[username];
        break;
      }
    }
  });
});

server.listen(3001, () => {
  console.log('Bingo server running on port 3001');
});
