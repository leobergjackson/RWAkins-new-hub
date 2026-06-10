// Copyright 2026 AeroFyta
// Licensed under the Apache License, Version 2.0
// See LICENSE file for details

import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'node:http';
import { logger } from '../utils/logger.js';

export type WSEvent =
  | 'agent:status'
  | 'agent:decision'
  | 'tip:sent'
  | 'tip:confirmed'
  | 'escrow:created'
  | 'escrow:claimed'
  | 'wallet:balance'
  | 'security:alert'
  | 'a2a:transaction';

export class WebSocketService {
  private io: SocketIOServer | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private agentStatus: Record<string, unknown> = { online: true };

  /**
   * Attach Socket.IO to an existing HTTP server.
   */
  attach(httpServer: HTTPServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
    });

    this.io.on('connection', (socket) => {
      logger.info(`WebSocket client connected (${socket.id}) — total: ${this.getConnectedCount()}`);

      // Send current agent status on connect
      socket.emit('agent:status', this.agentStatus);

      socket.on('disconnect', () => {
        logger.info(`WebSocket client disconnected (${socket.id}) — total: ${this.getConnectedCount()}`);
      });
    });

    // Heartbeat every 30 seconds
    this.heartbeatTimer = setInterval(() => {
      this.broadcast('agent:status', {
        ...this.agentStatus,
        timestamp: new Date().toISOString(),
        connectedClients: this.getConnectedCount(),
      });
    }, 30_000);

    logger.info('WebSocket service attached to HTTP server');
  }

  /**
   * Broadcast an event to all connected clients.
   */
  broadcast(event: WSEvent | string, data: unknown): void {
    if (!this.io) return;
    this.io.emit(event, data);
  }

  /**
   * Update cached agent status (sent on new connections and heartbeats).
   */
  setAgentStatus(status: Record<string, unknown>): void {
    this.agentStatus = status;
  }

  /**
   * Number of currently connected WebSocket clients.
   */
  getConnectedCount(): number {
    if (!this.io) return 0;
    return this.io.engine?.clientsCount ?? 0;
  }

  /**
   * Teardown — stop heartbeat and close server.
   */
  dispose(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.io) {
      this.io.close();
      this.io = null;
    }
  }
}
