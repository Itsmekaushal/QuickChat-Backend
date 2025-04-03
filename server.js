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

const roomUsers = {}; 

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinRoom', ({ username, roomID }) => {
    if (!roomUsers[roomID]) {
      roomUsers[roomID] = [];
    }

    if (roomUsers[roomID].length >= 3) {
      socket.emit('roomFull');
      return;
    }

    socket.join(roomID);
    roomUsers[roomID].push(socket.id);

    console.log(`User ${socket.id} joined Room: ${roomID}`);
    io.to(roomID).emit('userCount', roomUsers[roomID].length);
    socket.emit('roomJoined');
  });

  socket.on('message', (msg) => {
    console.log(`Message from ${msg.sender} in Room ${msg.roomId}:`, msg.text);
    io.to(msg.roomId).emit('message', msg);
  });

  socket.on('leaveRoom', (roomID) => {
    socket.leave(roomID);
    if (roomUsers[roomID]) {
      roomUsers[roomID] = roomUsers[roomID].filter(id => id !== socket.id);
      io.to(roomID).emit('userCount', roomUsers[roomID].length);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    for (const roomID in roomUsers) {
      roomUsers[roomID] = roomUsers[roomID].filter(id => id !== socket.id);
      io.to(roomID).emit('userCount', roomUsers[roomID].length);
    }
  });
});

server.listen(5000, () => console.log('✅ Server running on port 5000'));
