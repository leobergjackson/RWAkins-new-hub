// Built by vsrupeshkumar
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  private activeSessions: Map<string, { userId: string; expires: number }> = new Map();

  async createSession(userId: string) {
    const sessionId = uuidv4();
    const expires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    
    this.activeSessions.set(sessionId, { userId, expires });
    
    return {
      sessionId,
      expiresAt: new Date(expires).toISOString()
    };
  }

  async validateSession(sessionId: string) {
    const session = this.activeSessions.get(sessionId);
    
    if (!session) throw new UnauthorizedException('Invalid nexus session');
    if (Date.now() > session.expires) {
      this.activeSessions.delete(sessionId);
      throw new UnauthorizedException('Nexus session expired');
    }
    
    return session;
  }
}
