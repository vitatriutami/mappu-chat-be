import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

// Load .env config
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Ganti dengan domain frontend kamu jika perlu
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3000;
const DEFAULT_POSITION = { lat: -6.2, lng: 106.8 };

type User = {
  name: string;
  emoji: string;
  position: { lat: number; lng: number };
};

const users = new Map<string, User>();

// Handle socket connections
io.on("connection", (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);

  socket.on("join", (data: { name: string; emoji: string }) => {
    const newUser: User = {
      name: data.name,
      emoji: data.emoji,
      position: DEFAULT_POSITION,
    };
    users.set(socket.id, newUser);
    console.log(`✅ ${data.name} joined with emoji ${data.emoji}`);
    broadcastUsers();
  });

  socket.on("move", (pos: { lat: number; lng: number }) => {
    const user = users.get(socket.id);
    if (!user) return;

    user.position = pos;
    users.set(socket.id, user);
    broadcastUsers();
  });

  socket.on("chat", (message: string) => {
    const user = users.get(socket.id);
    if (!user) return;

    io.emit("chat", {
      from: user.name,
      emoji: user.emoji,
      message,
    });
  });

  socket.on("disconnect", () => {
    users.delete(socket.id);
    console.log(`❌ User disconnected: ${socket.id}`);
    broadcastUsers();
  });
});

function broadcastUsers() {
  const userArray = Array.from(users.entries()).map(([id, data]) => [id, data]);
  io.emit("users:update", userArray);
}

// Routes
app.use(cors());
app.get("/", (_, res) => {
  res.send("🗺️ Mappu-Chat backend is running!");
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
