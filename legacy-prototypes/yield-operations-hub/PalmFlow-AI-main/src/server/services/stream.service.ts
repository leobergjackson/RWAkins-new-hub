// Built by vsrupeshkumar
import { prisma } from '@/lib/prisma';

export const streamService = {
  /**
   * Get all active streams
   */
  async getAllStreams() {
    return await prisma.stream.findMany({
      orderBy: { createdAt: 'desc' }
    });
  },

  /**
   * Create a new payroll stream
   */
  async createStream(data: {
    recipientName: string;
    recipientRole: string;
    ratePerSecond: number;
    walletAddress: string;
  }) {
    return await prisma.stream.create({
      data: {
        ...data,
        status: 'active',
        totalStreamed: 0
      }
    });
  },

  /**
   * Update the accrued total for all active streams based on time elapsed
   * This is called by a "heartbeat" or on-demand when fetching
   */
  async updateAccruedTotals() {
    const streams = await prisma.stream.findMany({
      where: { status: 'active' }
    });

    for (const stream of streams) {
      const now = new Date();
      const lastUpdate = new Date(stream.updatedAt);
      const secondsElapsed = (now.getTime() - lastUpdate.getTime()) / 1000;
      
      if (secondsElapsed > 0) {
        const accrued = secondsElapsed * stream.ratePerSecond;
        await prisma.stream.update({
          where: { id: stream.id },
          data: {
            totalStreamed: { increment: accrued }
          }
        });
      }
    }
  },

  /**
   * Pause or Resume a stream
   */
  async toggleStream(id: string) {
    const stream = await prisma.stream.findUnique({ where: { id } });
    if (!stream) throw new Error('Stream not found');

    return await prisma.stream.update({
      where: { id },
      data: {
        status: stream.status === 'active' ? 'paused' : 'active'
      }
    });
  }
};
