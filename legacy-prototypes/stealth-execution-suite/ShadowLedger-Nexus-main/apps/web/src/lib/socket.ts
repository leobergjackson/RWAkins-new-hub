// Built by vsrupeshkumar
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export const socket = io(SOCKET_URL, {
  autoConnect: false,
});
