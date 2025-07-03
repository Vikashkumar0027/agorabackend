// server.js (Node.js with Express & Socket.IO)
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { RtcTokenBuilder, RtcRole } = require('agora-access-token'); // For Agora Token generation

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:8100", "capacitor://localhost"], // Allow your Ionic app origin
    methods: ["GET", "POST"]
  }
});

// Store connected users (mapping their application userId to socket.id)
const onlineUsers = new Map(); // Map<string, string> userId -> socket.id

// Agora App Credentials (REPLACE WITH YOUR ACTUAL ONES)
const AGORA_APP_ID = 'dfda2bc309d64063aa268be2000d5898';
const AGORA_APP_CERTIFICATE = '2a4ef46e48f34fa4abf4f2de6cdce833'; // Keep this SECRET

// Function to generate Agora RTC Token
const generateAgoraToken = (channelName, uid) => {
  const expirationTimeInSeconds = 3600; // Token expires in 1 hour
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
  const role = RtcRole.PUBLISHER; // Both caller and receiver will publish audio

  return RtcTokenBuilder.buildTokenWithUid(
    AGORA_APP_ID,
    AGORA_APP_CERTIFICATE,
    channelName,
    uid,
    role,
    privilegeExpiredTs
  );
};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // When a user logs in, register their userId with their socket.id
  socket.on('registerUser', (userId) => {
    onlineUsers.set(userId, socket.id);
    console.log(`User ${userId} registered with socket ${socket.id}`);
    io.emit('onlineUsers', Array.from(onlineUsers.keys())); // Inform all clients about online users
  });

  socket.on('disconnect', () => {
    // Remove disconnected user from online list
    let disconnectedUserId = null;
    for (let [userId, sockId] of onlineUsers.entries()) {
      if (sockId === socket.id) {
        disconnectedUserId = userId;
        onlineUsers.delete(userId);
        break;
      }
    }
    if (disconnectedUserId) {
      console.log(`User ${disconnectedUserId} disconnected.`);
      io.emit('onlineUsers', Array.from(onlineUsers.keys()));
    } else {
      console.log('A user disconnected (not a registered user):', socket.id);
    }
  });

  // Handle call invitations
  socket.on('callUser', async ({ callerId, calleeId }) => {
    const calleeSocketId = onlineUsers.get(calleeId);

    if (calleeSocketId) {
      // Generate a unique channel name for this call
      const channelName = `call_${callerId}_${calleeId}_${Date.now()}`;
      const callerAgoraUid = callerId; // Use caller's app ID as Agora UID
      const calleeAgoraUid = calleeId; // Use callee's app ID as Agora UID

      // Generate tokens for both caller and callee
      const callerToken = generateAgoraToken(channelName, callerAgoraUid);
      const calleeToken = generateAgoraToken(channelName, calleeAgoraUid);

      // Send call invitation to callee
      io.to(calleeSocketId).emit('incomingCall', {
        callerId: callerId,
        channelName: channelName,
        token: calleeToken,
        agoraUid: calleeAgoraUid
      });

      // Send call initiated confirmation to caller
      // Caller also needs token and channel info to join once callee accepts
      socket.emit('callInitiated', {
        calleeId: calleeId,
        channelName: channelName,
        token: callerToken,
        agoraUid: callerAgoraUid
      });
      console.log(`Call initiated from ${callerId} to ${calleeId}`);
    } else {
      socket.emit('userOffline', calleeId);
      console.log(`Callee ${calleeId} is offline.`);
    }
  });

  // Handle call acceptance
  socket.on('acceptCall', ({ callerId, calleeId, channelName, calleeToken, calleeAgoraUid }) => {
    const callerSocketId = onlineUsers.get(callerId);

    if (callerSocketId) {
      io.to(callerSocketId).emit('callAccepted', {
        calleeId: calleeId,
        channelName: channelName,
        token: calleeToken, // Note: Caller will use their token from 'callInitiated'
        agoraUid: calleeAgoraUid
      });
      console.log(`Call accepted by ${calleeId}`);
    }
  });

  // Handle call rejection
  socket.on('rejectCall', ({ callerId, calleeId }) => {
    const callerSocketId = onlineUsers.get(callerId);
    if (callerSocketId) {
      io.to(callerSocketId).emit('callRejected', { calleeId: calleeId });
      console.log(`Call rejected by ${calleeId}`);
    }
  });

  // Handle end call
  socket.on('endCall', ({ callerId, calleeId, channelName }) => {
    const calleeSocketId = onlineUsers.get(calleeId);
    const callerSocketId = onlineUsers.get(callerId); // Assuming caller ends it

    if (calleeSocketId) {
      io.to(calleeSocketId).emit('callEnded', { channelName });
    }
    if (callerSocketId) { // If caller is still connected (might have been other way around)
      io.to(callerSocketId).emit('callEnded', { channelName });
    }
    console.log(`Call between ${callerId} and ${calleeId} ended.`);
  });
});

server.listen(3000, () => {
  console.log('Signaling server listening on *:3000');
});