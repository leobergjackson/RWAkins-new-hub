// Built by vsrupeshkumar
import { Test, TestingModule } from '@nestjs/testing';
import { SafetyService } from './safety.service';

describe('SafetyService', () => {
  let service: SafetyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SafetyService],
    }).compile();

    service = module.get<SafetyService>(SafetyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should allow safe actions', async () => {
    const result = await service.validateAction('TREASURY', 'Shielded Transfer', {});
    expect(result.allowed).toBe(true);
  });

  it('should redact sensitive hashes in logs', async () => {
    const raw = "Transaction signature: 5aa3678ebadfbc46d7e21d2a8a0bd12c825e7c2f";
    const scrubbed = await service.auditLog('EXECUTION', raw);
    expect(scrubbed).toContain('[REDACTED_HASH]');
    expect(scrubbed).not.toContain('5aa3678');
  });
});
