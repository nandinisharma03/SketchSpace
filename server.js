require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const { verifyToken } = require('./middleware/auth');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET missing. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use('/api/auth', authRoutes);
app.use(express.static(path.join(__dirname, 'public')));

// ---- Socket auth: reject connections without a valid JWT ----
io.use((socket, next) => {
  try {
    const payload = verifyToken(socket.handshake.auth && socket.handshake.auth.token);
    socket.user = { id: payload.id, name: payload.name };
    next();
  } catch {
    next(new Error('Unauthorized'));
  }
});

// In-memory board state (Stage 3 will move this to MongoDB)
const rooms = new Map();
const MAX_SEGMENTS = 50000;
const COLORS = ['#e6194B', '#3cb44b', '#4363d8', '#f58231', '#911eb4', '#008080', '#9A6324', '#800000'];

function getRoom(id) {
  if (!rooms.has(id)) rooms.set(id, { segments: [], users: new Map() });
  return rooms.get(id);
}
function usersList(room) {
  return [...room.users.entries()].map(([id, u]) => ({ id, name: u.name, color: u.color }));
}

io.on('connection', (socket) => {
  let roomId = null;

  socket.on('join-room', ({ roomId: rid }) => {
    rid = String(rid || '').trim().slice(0, 30);
    if (!rid) return;
    roomId = rid;
    socket.join(roomId);

    const room = getRoom(roomId);
    const color = COLORS[room.users.size % COLORS.length];
    // Name now comes from the verified token, not from the client
    room.users.set(socket.id, { name: socket.user.name, userId: socket.user.id, color });

    socket.emit('init', { segments: room.segments, me: { id: socket.id, color } });
    io.to(roomId).emit('users', usersList(room));
  });

  socket.on('draw', (seg) => {
    if (!roomId) return;
    const room = getRoom(roomId);
    const clean = {
      strokeId: String(seg.strokeId),
      x0: +seg.x0, y0: +seg.y0, x1: +seg.x1, y1: +seg.y1,
      color: String(seg.color).slice(0, 9),
      size: Math.min(Math.max(+seg.size || 3, 1), 40),
      userId: socket.id,
    };
    if (room.segments.length < MAX_SEGMENTS) room.segments.push(clean);
    socket.to(roomId).emit('draw', clean);
  });

  socket.on('cursor', ({ x, y }) => {
    if (!roomId) return;
    const u = getRoom(roomId).users.get(socket.id);
    if (!u) return;
    socket.to(roomId).volatile.emit('cursor', { id: socket.id, name: u.name, color: u.color, x, y });
  });

  socket.on('undo', () => {
    if (!roomId) return;
    const room = getRoom(roomId);
    for (let i = room.segments.length - 1; i >= 0; i--) {
      if (room.segments[i].userId === socket.id) {
        const lastStroke = room.segments[i].strokeId;
        room.segments = room.segments.filter((s) => s.strokeId !== lastStroke);
        break;
      }
    }
    io.to(roomId).emit('redraw', room.segments);
  });

  socket.on('clear', () => {
    if (!roomId) return;
    getRoom(roomId).segments = [];
    io.to(roomId).emit('redraw', []);
  });

  socket.on('disconnect', () => {
    if (!roomId) return;
    const room = getRoom(roomId);
    room.users.delete(socket.id);
    io.to(roomId).emit('cursor-left', socket.id);
    io.to(roomId).emit('users', usersList(room));
    if (room.users.size === 0) rooms.delete(roomId);
  });
});

const PORT = process.env.PORT || 3000;
connectDB().then(() => {
  server.listen(PORT, () => console.log(`SketchSpace running at http://localhost:${PORT}`));
});
