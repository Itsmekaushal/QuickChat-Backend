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

let rooms = {}; // Dynamic rooms store karne ke liye

io.on('connection', (socket) => {
  socket.on('joinRoom', ({ username, roomID }) => {
    if (!rooms[roomID]) {
      rooms[roomID] = { users: 0, sockets: new Set() };
    }

    if (rooms[roomID].users >= 3) {
      socket.emit('error', 'Chat room full!');
      socket.disconnect();
      return;
    }

    socket.join(roomID);
    rooms[roomID].users++;
    rooms[roomID].sockets.add(socket.id);

    console.log(`${username} joined room: ${roomID} (Users: ${rooms[roomID].users})`);

    io.to(roomID).emit('userCount', rooms[roomID].users);

    socket.on('message', (msg) => {
      io.to(roomID).emit('message', msg);
    });

    socket.on('leaveRoom', () => {
      if (rooms[roomID].sockets.has(socket.id)) {
        rooms[roomID].sockets.delete(socket.id);
        rooms[roomID].users--;
      }

      io.to(roomID).emit('userCount', rooms[roomID].users);
      socket.leave(roomID);
      socket.disconnect();
      console.log(`${username} left room: ${roomID} (Users: ${rooms[roomID].users})`);
    });

    socket.on('disconnect', () => {
      if (rooms[roomID]?.sockets.has(socket.id)) {
        rooms[roomID].sockets.delete(socket.id);
        rooms[roomID].users--;
      }
      io.to(roomID).emit('userCount', rooms[roomID].users);
      console.log(`${username} disconnected from room: ${roomID} (Users: ${rooms[roomID]?.users || 0})`);
    });
  });
});

server.listen(5000, () => console.log('✅ Server running on port 5000'));
