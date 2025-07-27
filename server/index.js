// server/index.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

let drawnNumbers = [];
const BINGO_RANGE = 75; // Standard 75-ball bingo
const patterns = ["line", "full-house"]; // Added pattern recognition
let currentPattern = "line"; // Start with simple line pattern
let gameActive = true;

// Generate random Bingo number (1-75)
const drawNumber = () => {
  if (!gameActive || drawnNumbers.length >= BINGO_RANGE) return;

  let number;
  do {
    number = Math.floor(Math.random() * BINGO_RANGE) + 1;
  } while (drawnNumbers.includes(number));

  drawnNumbers.push(number);
  io.emit("number-drawn", number);

  // Switch pattern after 45 numbers drawn
  if (drawnNumbers.length === 45) {
    currentPattern = "full-house";
    io.emit("pattern-change", "full-house");
  }
};

// Standard Bingo letter-number associations
const getBingoLetter = (number) => {
  if (number <= 15) return "B";
  if (number <= 30) return "I";
  if (number <= 45) return "N";
  if (number <= 60) return "G";
  return "O";
};

setInterval(drawNumber, 3000); // Draw every 3 seconds

io.on("connection", (socket) => {
  socket.emit("init-game", {
    drawnNumbers,
    gameActive,
    currentPattern,
  });

  socket.on("restart-game", () => {
    drawnNumbers = [];
    currentPattern = "line";
    gameActive = true;
    io.emit("game-restart");
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

server.listen(3001, () => {
  console.log("Bingo server running on port 3001");
});
