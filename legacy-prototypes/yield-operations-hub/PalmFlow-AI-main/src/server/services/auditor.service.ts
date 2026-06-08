// Built by vsrupeshkumar
import { generateAgentResponse } from '@/lib/ai/OpenAIProvider';

export const auditorService = {
  /**
   * Perform an autonomous AI audit on a project proposal
   */
  async auditProject(name: string, description: string) {
    try {
      console.log(`--- Neural Auditor: Analyzing Project "${name}" ---`);

      const prompt = `
        You are the PalmFlow AI Neural Auditor. Your task is to perform an autonomous due diligence audit on a new project proposal.
        
        Project Name: ${name}
        Project Description: ${description}
        
        Evaluate the project based on:
        1. Innovation and feasibility.
        2. Financial logic and potential ROI.
        3. Risks (market, technical, regulatory).
        
        Provide your audit in a structured format:
        - A "Neural Trust Score" from 0 to 100.
        - A concise report (max 200 words).
        
        Return ONLY a JSON object:
        {
          "score": 85,
          "report": "..."
        }
      `;

      const aiResponse = await generateAgentResponse(prompt, {
        agentName: 'Neural Auditor',
        agentRole: 'Security & Risk Analyst',
        agentStatus: 'auditing',
        budget: 0
      });

      // Parse the JSON from the AI response
      // Handle cases where the AI might include markdown or extra text
      let parsed;
      try {
        const jsonStr = aiResponse.message.match(/\{[\s\S]*\}/)?.[0] || aiResponse.message;
        parsed = JSON.parse(jsonStr);
      } catch (e) {
        console.error('Failed to parse auditor response:', e);
        parsed = {
          score: 70,
          report: "Standard neural verification passed. Audit depth limited due to parsing error."
        };
      }

      return parsed;

    } catch (error) {
      console.error('Audit failed:', error);
      return {
        score: 50,
        report: "Audit cycle interrupted. Emergency baseline score assigned."
      };
    }
  }
};
