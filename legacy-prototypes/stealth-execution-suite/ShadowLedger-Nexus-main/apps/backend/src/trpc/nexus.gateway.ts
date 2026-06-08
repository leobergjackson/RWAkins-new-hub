// Built by vsrupeshkumar
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NexusGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NexusGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe_logs')
  handleSubscribe(client: Socket, orgId: string) {
    client.join(`org_${orgId}`);
    return { status: 'SUBSCRIBED', room: `org_${orgId}` };
  }

  broadcastAgentLog(orgId: string, log: any) {
    this.server.to(`org_${orgId}`).emit('agent_log', log);
  }
}
