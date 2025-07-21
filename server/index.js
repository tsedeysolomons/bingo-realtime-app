// server/index.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors"); // Add this line

const app = express();
app.use(cors()); // Add this line
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

let drawnNumbers = [];
const maxNumber = 75;
const winners = [];
let gameActive = true;

const drawNumber = () => {
  if (!gameActive) return;

  let number;
  do {
    number = Math.floor(Math.random() * maxNumber) + 1;
  } while (drawnNumbers.includes(number));

  drawnNumbers.push(number);
  io.emit("number-drawn", number);
};

setInterval(drawNumber, 5000);

io.on("connection", (socket) => {
  console.log("A user connected");
  socket.emit("drawn-numbers", { numbers: drawnNumbers, gameActive });
  socket.emit("winner-list", winners);

  socket.on("set-username", (username) => {
    socket.username = username;
    console.log(`${username} joined the game`);
  });

  socket.on("declare-winner", (username) => {
    if (!winners.includes(username)) {
      winners.push(username);
      io.emit("new-winner", username);
      io.emit("winner-list", winners);
      console.log(`${username} won the game!`);
    }
  });

  socket.on("restart-game", () => {
    drawnNumbers = [];
    gameActive = true;
    io.emit("game-restarted");
    console.log("Game was restarted");
  });

  socket.on("disconnect", () => {
    console.log(`${socket.username || "A user"} disconnected`);
  });
});

app.get("/restart", (req, res) => {
  drawnNumbers = [];
  gameActive = true;
  io.emit("game-restarted");
  res.send("Game restarted");
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
