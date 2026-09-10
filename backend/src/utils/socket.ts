import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

let io: Server | null = null;

export const initSocket = (server: HttpServer): Server => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    // Join room event (e.g., 'staff_terminal', 'student_<userId>')
    socket.on('join_room', (roomName: string) => {
      if (typeof roomName === 'string' && roomName.trim()) {
        socket.join(roomName);
      }
    });

    // Auto-join from query params if supplied during handshake
    const { role, userId } = socket.handshake.query;
    if (role === 'STAFF' || role === 'ADMIN' || role === 'WARDEN') {
      socket.join('staff_terminal');
    }
    if (userId && typeof userId === 'string') {
      socket.join(`student_${userId}`);
    }

    socket.on('disconnect', () => {
      // Disconnect handling
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

