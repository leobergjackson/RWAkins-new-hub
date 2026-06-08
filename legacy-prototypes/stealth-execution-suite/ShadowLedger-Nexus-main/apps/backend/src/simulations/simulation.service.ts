// Built by vsrupeshkumar
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class SimulationService {
  constructor(private readonly prisma: PrismaService) {}

  async runTreasuryStressTest(balance: number, outflow: number) {
    // Advanced simulation logic
    const months = 12;
    const scenarios = ['BULL', 'BEAR', 'STAGNANT'];
    
    const results = scenarios.map(scenario => {
      const volatility = scenario === 'BEAR' ? 0.4 : scenario === 'BULL' ? 0.1 : 0.2;
      const runway = balance / (outflow * (1 + volatility));
      
      return {
        scenario,
        runwayMonths: Math.floor(runway),
        riskLevel: runway < 6 ? 'CRITICAL' : runway < 12 ? 'WARNING' : 'SAFE',
        projection: Array.from({ length: months }).map((_, i) => ({
          month: i + 1,
          expectedBalance: balance - (outflow * (i + 1)) * (1 + (Math.random() * volatility - volatility/2))
        }))
      };
    });

    const res = {
      timestamp: new Date().toISOString(),
      baseBalance: balance,
      monthlyOutflow: outflow,
      scenarios: results
    };

    await this.prisma.simulation.create({
      data: {
        name: 'Treasury Stress Test',
        type: 'STRESS_TEST',
        input: JSON.stringify({ balance, outflow }),
        result: JSON.stringify(res)
      }
    });

    return res;
  }

  async simulateStablecoinDepeg(asset: string, amount: number) {
    const depegScenarios = [
      { drop: 0.05, probability: 'MEDIUM' },
      { drop: 0.15, probability: 'LOW' },
      { drop: 0.50, probability: 'EXTREME' }
    ];

    return depegScenarios.map(s => ({
      asset,
      currentValue: amount,
      projectedValue: amount * (1 - s.drop),
      loss: amount * s.drop,
      probability: s.probability
    }));
  }

  async simulateYieldOptimization(balance: number) {
    const protocols = [
      { name: 'Solend', baseApy: 0.04, risk: 'LOW' },
      { name: 'Kamno', baseApy: 0.08, risk: 'MEDIUM' },
      { name: 'Drift', baseApy: 0.12, risk: 'HIGH' }
    ];

    return protocols.map(p => ({
      protocol: p.name,
      apy: p.baseApy,
      projectedAnnualYield: balance * p.baseApy,
      riskScore: p.risk === 'HIGH' ? 85 : p.risk === 'MEDIUM' ? 45 : 15
    }));
  }
}
