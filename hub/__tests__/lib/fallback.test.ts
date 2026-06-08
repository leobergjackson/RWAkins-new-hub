// Built by vsrupeshkumar
import {
  fallbackCreditScore,
  fallbackVaults,
  fallbackAgents,
  fallbackLoans,
  fallbackTreasury,
  fallbackShadowAgents,
  fallbackSplits,
} from '@/lib/fallback'

describe('fallback.ts', () => {
  it('credit score has required fields', () => {
    expect(fallbackCreditScore.score).toBeGreaterThan(0)
    expect(fallbackCreditScore.grade).toMatch(/^[A-F]/)
    expect(fallbackCreditScore.history).toHaveLength(6)
    expect(fallbackCreditScore.factors).toBeDefined()
  })

  it('credit score factors are percentages', () => {
    const { factors } = fallbackCreditScore
    Object.values(factors).forEach(v => {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(100)
    })
  })

  it('vaults array has at least one item', () => {
    expect(fallbackVaults.length).toBeGreaterThan(0)
    expect(fallbackVaults[0].status).toBe('locked')
  })

  it('agents array has correct structure', () => {
    expect(fallbackAgents.length).toBeGreaterThan(0)
    fallbackAgents.forEach(agent => {
      expect(agent.id).toBeDefined()
      expect(agent.name).toBeDefined()
      expect(agent.role).toBeDefined()
      expect(agent.status).toBeDefined()
    })
  })

  it('loans array has correct structure', () => {
    expect(fallbackLoans.length).toBeGreaterThan(0)
    expect(fallbackLoans[0].amount).toBeGreaterThan(0)
    expect(fallbackLoans[0].status).toBeDefined()
  })

  it('treasury has balance and streams', () => {
    expect(fallbackTreasury.balance).toBeGreaterThan(0)
    expect(Array.isArray(fallbackTreasury.streams)).toBe(true)
  })

  it('shadow agents has exactly 7 items', () => {
    expect(fallbackShadowAgents).toHaveLength(7)
  })

  it('shadow agent types cover all departments', () => {
    const types = fallbackShadowAgents.map(a => a.type)
    expect(types).toContain('CFO')
    expect(types).toContain('Payroll')
    expect(types).toContain('Compliance')
    expect(types).toContain('Audit')
    expect(types).toContain('Procurement')
    expect(types).toContain('Tax')
    expect(types).toContain('Risk')
  })

  it('splits have correct structure', () => {
    expect(fallbackSplits.length).toBeGreaterThan(0)
    expect(fallbackSplits[0].participants.length).toBeGreaterThan(0)
    expect(fallbackSplits[0].currency).toBe('MNT')
  })
})
