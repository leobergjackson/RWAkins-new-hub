// Built by vsrupeshkumar
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return { status: 'ok', service: 'shadow' };
  }

  @Post('api/org/setup')
  setupOrg(@Body() body: Record<string, unknown>) {
    return { ok: true, service: 'shadow', org: body, status: 'setup' };
  }

  @Get('api/org/:pubkey')
  getOrg(@Param('pubkey') pubkey: string) {
    return { ok: true, service: 'shadow', pubkey, org: null };
  }

  @Get('api/agents/status')
  getAgentsStatus() {
    return { ok: true, service: 'shadow', agents: [], status: 'idle' };
  }

  @Post('api/agents/trigger')
  triggerAgent(@Body() body: Record<string, unknown>) {
    return { ok: true, service: 'shadow', trigger: body, status: 'queued' };
  }

  @Get('api/activity')
  getActivity() {
    return { ok: true, service: 'shadow', activity: [] };
  }
}
