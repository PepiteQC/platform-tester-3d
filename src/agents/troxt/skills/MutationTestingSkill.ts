// src/agents/troxt/skills/MutationTestingSkill.ts
import { SolidityAnalyzer, ProjectAnalysis } from '../../services/solidityAnalyzer';

export class MutationTestingSkill {
  private analyzer: SolidityAnalyzer;

  constructor() {
    this.analyzer = new SolidityAnalyzer();
  }

  async analyzeSolidityProject(projectPath: string): Promise<string> {
    try {
      const analysis: ProjectAnalysis = await this.analyzer.analyzeProject(projectPath);
      
      let report = `🔬 **Analyse de Mutation - Projet Solidity**\n\n`;
      report += `📁 Contrats: ${analysis.contractFiles.length}\n`;
      report += `🧪 Tests: ${analysis.testFiles.length}\n`;
      report += `📊 Score de mutation: ${analysis.mutationScore.toFixed(1)}%\n`;
      report += `💀 Mutants tués: ${analysis.killedMutants}/${analysis.totalMutants}\n`;
      report += `🛡️ Mutants survivants: ${analysis.survivedMutants}\n\n`;
      
      if (analysis.results.length > 0) {
        report += `🔍 **Top 5 mutants survivants:**\n`;
        const topSurvived = analysis.results
          .filter(r => r.status === 'survived')
          .slice(0, 5);
          
        topSurvived.forEach((mutant, idx) => {
          report += `${idx + 1}. ${mutant.fileName}:${mutant.line}\n`;
          report += `   Type: ${mutant.mutationType}\n`;
          report += `   Original: ${mutant.originalCode}\n`;
          report += `   Mutant: ${mutant.mutatedCode}\n\n`;
        });
      }
      
      if (analysis.recommendations.length > 0) {
        report += `💡 **Recommandations:**\n`;
        analysis.recommendations.forEach(rec => {
          report += `• ${rec}\n`;
        });
      }
      
      report += `\n🔧 **Opérateurs supportés:** ${this.analyzer.getSupportedOperators().join(', ')}`;
      
      return report;
    } catch (error) {
      return `❌ Erreur lors de l'analyse: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  getSkillDescription(): string {
    return `
**Compétence: Analyse de Mutation Solidity**

Cette compétence analyse les projets Solidity en:
1. Générant des mutants (variantes du code avec des défauts introduits)
2. Exécutant la suite de tests existante
3. Calculant le score de mutation (pourcentage de mutants détectés)
4. Identifiant les zones faiblement testées

Commandes disponibles:
• "Analyse mutation projet [chemin]" - Analyse un projet Solidity
• "Score mutation [chemin]" - Affiche juste le score
• "Recommandations mutation [chemin]" - Liste les recommandations

Exemple: "Analyse mutation ./contracts"
    `;
  }
}