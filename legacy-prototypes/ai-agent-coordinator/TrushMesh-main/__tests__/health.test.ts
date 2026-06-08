// Built by vsrupeshkumar
import { buildServer } from '../src/server'

describe('TrustMesh API', () => {
  let app: Awaited<ReturnType<typeof buildServer>>

  beforeAll(async () => {
    process.env.PORT = '3098'
    process.env.ETHANA_RPC_URL = 'https://api.devnet.arbitrum-sepolia.com'
    process.env.JWT_SECRET = 'test-secret-for-ci'
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
    process.env.REDIS_URL = 'redis://localhost:6379'
    process.env.FRONTEND_URL = 'https://kubryx.vercel.app'

    app = await buildServer({
      logger: false,
      disableRateLimit: true,
      disableWebsocket: true,
      services: {
        // Inject mock services to avoid real DB/Redis connections
        prisma: {} as any,
        redis: {
          get: async () => null,
          set: async () => 'OK',
          del: async () => 1,
          expire: async () => 1,
          quit: async () => 'OK',
        } as any,
        sns: { resolve: async () => null } as any,
        anchor: { verify: async () => true } as any,
      },
    })
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  test('GET /health returns ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.status).toBe('ok')
    expect(body.service).toBe('trustmesh')
  })

  test('GET /api/agents/:pubkey returns 200', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/agents/testpubkey',
    })
    expect(res.statusCode).not.toBe(500)
  })

  test('POST /api/agents/deploy returns 201', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/agents/deploy',
      payload: { owner: '0x0', name: 'TestAgent', role: 'monitor' },
    })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.ok).toBe(true)
  })
})
