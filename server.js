// import express from 'express';
// import bodyParser from 'body-parser';
// import { config } from 'dotenv';
// import { Server } from 'socket.io';
// import http from 'http';
// import cors from 'cors';

// config();

// const app = express();
// app.use(cors());
// app.use(bodyParser.json());

// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: '*',
//     methods: ['GET', 'POST'],
//   },
// });

// io.on('connection', (socket) => {
//   console.log(`✅ User connected: ${socket.id}`);

//   // Client should send its userId after connection
//   socket.on('register', (userId) => {
//     console.log(`📌 Registering socket ${socket.id} to room user-${userId}`);
//     socket.join(`user-${userId}`);
//   });

//   socket.on('disconnect', () => {
//     console.log(`❌ User disconnected: ${socket.id}`);
//   });
// });

// // Example endpoint to trigger a reward update for a specific user
// app.post('/update-reward/:userId', (req, res) => {
//   const { userId } = req.params;
//   const rewardData = { savedReward: 'Reward updated!' };

//   io.to(`user-${userId}`).emit('reward-updated', rewardData);

//   res.json({ message: `Reward update sent to user ${userId}` });
// });

// server.listen(9001, () => {
//   console.log('🚀 Server running on http://localhost:9001');
// });

import express from 'express';
import bodyParser from 'body-parser';
import { config } from 'dotenv';
import { Server } from 'socket.io';
import http from 'http';
import cors from 'cors';

config();

const app = express();
app.use(bodyParser.json());
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = 9001;

io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.id}`);

  socket.on('connected-to-ui', (userId) => {
    console.log(userId);
    socket.join(`user-${userId}`);
  });
});

app.post('/confirm-order/:userId', (req, res) => {
  const { userId } = req.params;

  io.to(`user-${userId}`).emit('order-confirmed', {
    message: 'You ordered a water bottle',
    productName: 'Water Bottle',
  });

  res.json({
    message: `Order confirmation sent to user ${userId}`,
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
