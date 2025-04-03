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

let rooms = {
  'quickchatroom': { users: 0, accessID: null, sockets: new Set() }
};

io.on('connection', (socket) => {
  socket.on('joinRoom', ({ username, roomID, accessID }, callback) => {
    if (!rooms[roomID]) {
      callback({ success: false, error: 'Invalid Room ID!' });
      return;
    }

    if (rooms[roomID].accessID === null) {
      rooms[roomID].accessID = accessID;
    }

    if (rooms[roomID].accessID !== accessID) {
      callback({ success: false, error: 'Incorrect Access ID!' });
      return;
    }

    if (rooms[roomID].users >= 3) {
      callback({ success: false, error: 'Chat room full!' });
      return;
    }

    socket.join(roomID);
    rooms[roomID].users++;
    rooms[roomID].sockets.add(socket.id);

    console.log(`${username} joined the room: ${roomID} (Users: ${rooms[roomID].users})`);
    io.to(roomID).emit('userCount', rooms[roomID].users);
    callback({ success: true });

    socket.on('message', (msg) => {
      io.to(roomID).emit('message', msg);
    });

    socket.on('disconnect', () => {
      if (rooms[roomID].sockets.has(socket.id)) {
        rooms[roomID].sockets.delete(socket.id);
        rooms[roomID].users--;
      }

      io.to(roomID).emit('userCount', rooms[roomID].users);
      console.log(`${username} left the room: ${roomID} (Users: ${rooms[roomID].users})`);
    });
  });
});

server.listen(5000, () => console.log('✅ Server running on port 5000'));
