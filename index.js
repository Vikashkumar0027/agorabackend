// // server.js (Node.js with Express & Socket.IO)
// const express = require('express');
// const http = require('http');
// const { Server } = require('socket.io');
// const { RtcTokenBuilder, RtcRole } = require('agora-access-token'); // For Agora Token generation

// const app = express();
// const server = http.createServer(app);
// const io = new Server(server, {
// //   cors: {
// //     origin: ["http://localhost:8100", "capacitor://localhost"], // Allow your Ionic app origin
// //     methods: ["GET", "POST"]
// //   }
// cors: {
//   origin: "*"
// }
// });

// // Store connected users (mapping their application userId to socket.id)
// const onlineUsers = new Map(); // Map<string, string> userId -> socket.id

// // Agora App Credentials (REPLACE WITH YOUR ACTUAL ONES)
// const AGORA_APP_ID = 'dfda2bc309d64063aa268be2000d5898';
// const AGORA_APP_CERTIFICATE = '2a4ef46e48f34fa4abf4f2de6cdce833'; // Keep this SECRET

// // Function to generate Agora RTC Token
// const generateAgoraToken = (channelName, uid) => {
//   const expirationTimeInSeconds = 3600; // Token expires in 1 hour
//   const currentTimestamp = Math.floor(Date.now() / 1000);
//   const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
//   const role = RtcRole.PUBLISHER; // Both caller and receiver will publish audio

//   return RtcTokenBuilder.buildTokenWithUid(
//     AGORA_APP_ID,
//     AGORA_APP_CERTIFICATE,
//     channelName,
//     uid,
//     role,
//     privilegeExpiredTs
//   );
// };

// io.on('connection', (socket) => {
//   console.log('A user connected:', socket.id);

//   // When a user logs in, register their userId with their socket.id
//   socket.on('registerUser', (userId) => {
//     onlineUsers.set(userId, socket.id);
//     console.log(`User ${userId} registered with socket ${socket.id}`);
//     io.emit('onlineUsers', Array.from(onlineUsers.keys())); // Inform all clients about online users
//   });

//   socket.on('getOnlineUsers', () => {
//   socket.emit('onlineUsers', Array.from(onlineUsers.keys()));
// });

//   socket.on('disconnect', () => {
//     // Remove disconnected user from online list
//     let disconnectedUserId = null;
//     for (let [userId, sockId] of onlineUsers.entries()) {
//       if (sockId === socket.id) {
//         disconnectedUserId = userId;
//         onlineUsers.delete(userId);
//         break;
//       }
//     }
//     if (disconnectedUserId) {
//       console.log(`User ${disconnectedUserId} disconnected.`);
//       io.emit('onlineUsers', Array.from(onlineUsers.keys()));
//     } else {
//       console.log('A user disconnected (not a registered user):', socket.id);
//     }
//   });

//   // Handle call invitations
//   socket.on('callUser', async ({ callerId, calleeId }) => {
//     const calleeSocketId = onlineUsers.get(calleeId);

//     if (calleeSocketId) {
//       // Generate a unique channel name for this call
//       const channelName = `call_${callerId}_${calleeId}_${Date.now()}`;
//       const callerAgoraUid = callerId; // Use caller's app ID as Agora UID
//       const calleeAgoraUid = calleeId; // Use callee's app ID as Agora UID

//       // Generate tokens for both caller and callee
//       const callerToken = generateAgoraToken(channelName, callerAgoraUid);
//       const calleeToken = generateAgoraToken(channelName, calleeAgoraUid);

//       // Send call invitation to callee
//       io.to(calleeSocketId).emit('incomingCall', {
//         callerId: callerId,
//         channelName: channelName,
//         token: calleeToken,
//         agoraUid: calleeAgoraUid
//       });

//       // Send call initiated confirmation to caller
//       // Caller also needs token and channel info to join once callee accepts
//       socket.emit('callInitiated', {
//         calleeId: calleeId,
//         channelName: channelName,
//         token: callerToken,
//         agoraUid: callerAgoraUid
//       });
//       console.log(`Call initiated from ${callerId} to ${calleeId}`);
//     } else {
//       socket.emit('userOffline', calleeId);
//       console.log(`Callee ${calleeId} is offline.`);
//     }
//   });

//   // Handle call acceptance
//   socket.on('acceptCall', ({ callerId, calleeId, channelName, calleeToken, calleeAgoraUid }) => {
//     const callerSocketId = onlineUsers.get(callerId);

//     if (callerSocketId) {
//       io.to(callerSocketId).emit('callAccepted', {
//         calleeId: calleeId,
//         channelName: channelName,
//         token: calleeToken, // Note: Caller will use their token from 'callInitiated'
//         agoraUid: calleeAgoraUid
//       });
//       console.log(`Call accepted by ${calleeId}`);
//     }
//   });

//   // Handle call rejection
//   socket.on('rejectCall', ({ callerId, calleeId }) => {
//     const callerSocketId = onlineUsers.get(callerId);
//     if (callerSocketId) {
//       io.to(callerSocketId).emit('callRejected', { calleeId: calleeId });
//       console.log(`Call rejected by ${calleeId}`);
//     }
//   });

//   // Handle end call
//   socket.on('endCall', ({ callerId, calleeId, channelName }) => {
//     const calleeSocketId = onlineUsers.get(calleeId);
//     const callerSocketId = onlineUsers.get(callerId); // Assuming caller ends it

//     if (calleeSocketId) {
//       io.to(calleeSocketId).emit('callEnded', { channelName });
//     }
//     if (callerSocketId) { // If caller is still connected (might have been other way around)
//       io.to(callerSocketId).emit('callEnded', { channelName });
//     }
//     console.log(`Call between ${callerId} and ${calleeId} ended.`);
//   });
// });

// server.listen(3000, () => {
//   console.log('Signaling server listening on *:3000');
// });



const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
//   cors: {
//     origin: '*',
//     methods: ['GET', 'POST']
//   }
  cors: {
  origin: "*"
}
});

// const AGORA_APP_ID = 'YOUR_AGORA_APP_ID';
// const AGORA_APP_CERTIFICATE = 'YOUR_AGORA_APP_CERTIFICATE';
const AGORA_APP_ID = 'dfda2bc309d64063aa268be2000d5898';
const AGORA_APP_CERTIFICATE = '2a4ef46e48f34fa4abf4f2de6cdce833'; // Keep this SECRET

const onlineUsers = new Map();

function generateAgoraToken(channelName, uid) {
  const expiration = 3600;
  const now = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = now + expiration;
  return RtcTokenBuilder.buildTokenWithUid(
    AGORA_APP_ID,
    AGORA_APP_CERTIFICATE,
    channelName,
    uid,
    RtcRole.PUBLISHER,
    privilegeExpiredTs
  );
}

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('registerUser', (userId) => {
    onlineUsers.set(userId, socket.id);
    io.emit('onlineUsers', Array.from(onlineUsers.keys()));
  });

  socket.on('callUser', ({ callerId, calleeId }) => {
    const calleeSocket = onlineUsers.get(calleeId);
    if (calleeSocket) {
      const channelName = `call_${callerId}_${calleeId}_${Date.now()}`;
      const callerToken = generateAgoraToken(channelName, callerId);
      const calleeToken = generateAgoraToken(channelName, calleeId);

      socket.emit('callInitiated', {
        calleeId, channelName, token: callerToken, agoraUid: callerId
      });

      io.to(calleeSocket).emit('incomingCall', {
        callerId, channelName, token: calleeToken, agoraUid: calleeId
      });
    } else {
      socket.emit('userOffline', calleeId);
    }
  });

  socket.on('acceptCall', (data) => {
    const callerSocket = onlineUsers.get(data.callerId);
    if (callerSocket) {
      io.to(callerSocket).emit('callAccepted', data);
    }
  });

  socket.on('rejectCall', (callerId) => {
    const callerSocket = onlineUsers.get(callerId);
    if (callerSocket) {
      io.to(callerSocket).emit('callRejected');
    }
  });

  socket.on('endCall', ({ callerId, calleeId, channelName }) => {
    const callerSocket = onlineUsers.get(callerId);
    const calleeSocket = onlineUsers.get(calleeId);
    if (callerSocket) io.to(callerSocket).emit('callEnded');
    if (calleeSocket) io.to(calleeSocket).emit('callEnded');
  });

  socket.on('disconnect', () => {
    for (const [userId, sockId] of onlineUsers) {
      if (sockId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
    io.emit('onlineUsers', Array.from(onlineUsers.keys()));
  });
});

server.listen(3000, () => console.log('Server on port 3000'));


