const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const cors = require("cors")
const { v4: uuidv4 } = require("uuid")

const app = express()
const server = http.createServer(app)

// Configure CORS
// const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : ["http://localhost:3000"]
const allowedOrigins = [
  "https://livecodeshare-olive.vercel.app",         // ✅ Your Vercel frontend
  "https://live-code-share-production.up.railway.app",
  "https://live-code-share-f3p5.onrender.com",      // ✅ Your Render service (optional)
  "http://localhost:3000",                         // ✅ Local dev frontend
];


app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true)

      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = "The CORS policy for this site does not allow access from the specified Origin."
        return callback(new Error(msg), false)
      }
      return callback(null, true)
    },
    methods: ["GET", "POST"],
    credentials: true,
  }),
)

// In-memory store for rooms
const rooms = new Map()

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
})

// Socket.io connection handler
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`)

  const { roomId, userName } = socket.handshake.query

  if (!roomId || !userName) {
    console.log("Missing roomId or userName, disconnecting socket")
    socket.disconnect()
    return
  }

  // Join the room
  socket.join(roomId)

  // Initialize room if it doesn't exist
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      users: [],
      code: "// Start coding here...",
      language: "javascript",
      messages: [],
    })
  }

  // Add user to the room
  const room = rooms.get(roomId)
  const userInfo = { id: socket.id, name: userName }
  room.users.push(userInfo)

  // Send current state to the new user
  socket.emit("code-change", room.code)
  socket.emit("language-change", room.language)

  // Send chat history to the new user
  room.messages.forEach((message) => {
    socket.emit("chat-message", message)
  })

  // Broadcast updated user list to all clients in the room
  io.to(roomId).emit("user-list-update", room.users)

  console.log(`User ${userName} joined room ${roomId}`)

  // Handle code changes
  socket.on("code-change", ({ roomId, code }) => {
    if (!roomId || !rooms.has(roomId)) return

    const room = rooms.get(roomId)
    room.code = code

    // Broadcast to all clients in the room except the sender
    socket.to(roomId).emit("code-change", code)
  })

  // Handle language changes
  socket.on("language-change", ({ roomId, language }) => {
    if (!roomId || !rooms.has(roomId)) return

    const room = rooms.get(roomId)
    room.language = language

    // Broadcast to all clients in the room except the sender
    socket.to(roomId).emit("language-change", language)
  })

  // Handle chat messages
  socket.on("chat-message", ({ roomId, message }) => {
    if (!roomId || !rooms.has(roomId)) return

    const room = rooms.get(roomId)
    const timestamp = new Date()

    const fullMessage = {
      ...message,
      timestamp,
    }

    // Store message in room history
    room.messages.push(fullMessage)

    // Limit message history to last 100 messages
    if (room.messages.length > 100) {
      room.messages.shift()
    }

    // Broadcast to all clients in the room including the sender
    io.to(roomId).emit("chat-message", fullMessage)
  })

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`)

    if (!roomId || !rooms.has(roomId)) return

    const room = rooms.get(roomId)

    // Remove user from the room
    room.users = room.users.filter((user) => user.id !== socket.id)

    // Broadcast updated user list
    io.to(roomId).emit("user-list-update", room.users)

    console.log(`User left room ${roomId}, remaining users: ${room.users.length}`)

    // Remove room if empty
    if (room.users.length === 0) {
      console.log(`Room ${roomId} is empty, removing it`)
      rooms.delete(roomId)
    }
  })
})

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" })
})

// Start the server
const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
