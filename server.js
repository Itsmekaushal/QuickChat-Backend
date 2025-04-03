const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: 'http://localhost:4200', methods: ['GET', 'POST'] }
});

app.use(cors());

let rooms = {}; // Stores active rooms and user counts

io.on('connection', (socket) => {
  console.log('🔵 New user connected:', socket.id);

  socket.on('joinRoom', ({ username, roomID }) => {
    if (!roomID) {
      socket.emit('error', 'Room ID is required!');
      return;
    }

    // Initialize room if it doesn't exist
    if (!rooms[roomID]) {
      rooms[roomID] = { users: 0, sockets: new Set() };
    }

    // Check if the room has space
    if (rooms[roomID].users >= 3) {
      socket.emit('error', 'Chat room full! Try another room.');
      return;
    }

    // Join the room
    socket.join(roomID);
    rooms[roomID].users++;
    rooms[roomID].sockets.add(socket.id);

    console.log(`✅ ${username} joined room: ${roomID} (Users: ${rooms[roomID].users})`);

    // Notify clients about the updated user count
    io.to(roomID).emit('userCount', rooms[roomID].users);

    // Listen for messages
    socket.on('message', (msg) => {
      io.to(roomID).emit('message', msg);
    });

    // Handle leaving the room
    socket.on('leaveRoom', () => {
      leaveRoom(socket, roomID);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      leaveRoom(socket, roomID);
    });
  });

  function leaveRoom(socket, roomID) {
    if (rooms[roomID] && rooms[roomID].sockets.has(socket.id)) {
      rooms[roomID].sockets.delete(socket.id);
      rooms[roomID].users = Math.max(0, rooms[roomID].users - 1);
      
      console.log(`🚪 User left room: ${roomID} (Users: ${rooms[roomID].users})`);
      io.to(roomID).emit('userCount', rooms[roomID].users);

      // If room is empty, delete it
      if (rooms[roomID].users === 0) {
        delete rooms[roomID];
        console.log(`🗑️ Room ${roomID} deleted.`);
      }
    }
  }
});

server.listen(5000, () => console.log('✅ Server running on http://localhost:5000'));
