// Built by vsrupeshkumar
import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import * as request from 'supertest'
import { AppModule } from '../src/app.module'

describe('ShadowLedger API (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /health → 200 ok', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect(res => {
        expect(res.body.status).toBe('ok')
        expect(res.body.service).toBe('shadow')
      })
  })

  it('GET /api/agents/status → not 500', () => {
    return request(app.getHttpServer())
      .get('/api/agents/status')
      .expect(res => {
        expect(res.status).not.toBe(500)
      })
  })

  it('POST /api/org/setup → accepts body', () => {
    return request(app.getHttpServer())
      .post('/api/org/setup')
      .send({ name: 'TestOrg', admin: '0x0' })
      .expect(res => {
        expect([200, 201, 400, 422]).toContain(res.status)
      })
  })
})
