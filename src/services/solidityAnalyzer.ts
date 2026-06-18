// src/services/solidityAnalyzer.ts
export interface MutationTestResult {
  fileName: string;
  line: number;
  mutationType: string;
  originalCode: string;
  mutatedCode: string;
  status: 'killed' | 'survived' | 'error';
  testThatKilled?: string;
}

export interface ProjectAnalysis {
  contractFiles: string[];
  testFiles: string[];
  mutationScore: number;
  totalMutants: number;
  killedMutants: number;
  survivedMutants: number;
  results: MutationTestResult[];
  recommendations: string[];
}

export class SolidityAnalyzer {
  private mutationOperators = [
    { name: 'arithmetic', patterns: [/\+/g, '-/g', '*/g', '//g'], replacements: ['-', '+', '/', '*'] },
    { name: 'relational', patterns: [/>/g, '</g', '>=/g', '<=/g', '===/g', '!==/g'], replacements: ['<', '>', '<=', '>=', '!==', '==='] },
    { name: 'logical', patterns: [/&&/g, '||/g], replacements: ['||', '&&'] },
    { name: 'bitwise', patterns: [/&/g, '|/g, '^/g, '~/g], replacements: ['|', '&', '~', '^'] },
    { name: 'negate_condition', patterns: [/if\s*\(([^)]+)\)/g], replacements: ['if (!$1)'] },
    { name: 'remove_return', patterns: [/return\s+[^;]+;/g], replacements: [''] },
  ];

  async analyzeProject(projectPath: string): Promise<ProjectAnalysis> {
    // 1. Scanner les fichiers Solidity
    const contractFiles = await this.findSolidityFiles(projectPath, 'contracts');
    const testFiles = await this.findSolidityFiles(projectPath, 'test');
    
    // 2. Générer des mutants
    const allMutants: MutationTestResult[] = [];
    
    for (const file of contractFiles) {
      const mutants = await this.generateMutants(file);
      allMutants.push(...mutants);
    }
    
    // 3. Exécuter les tests (simulé pour l'instant)
    const results = await this.runMutationTests(allMutants, projectPath);
    
    // 4. Calculer les métriques
    const killed = results.filter(r => r.status === 'killed').length;
    const mutationScore = results.length > 0 ? (killed / results.length) * 100 : 0;
    
    // 5. Générer des recommandations
    const recommendations = this.generateRecommendations(results);
    
    return {
      contractFiles,
      testFiles,
      mutationScore,
      totalMutants: results.length,
      killedMutants: killed,
      survivedMutants: results.length - killed,
      results,
      recommendations
    };
  }

  private async findSolidityFiles(projectPath: string, subdir: string): Promise<string[]> {
    // Simulation - dans une vraie implémentation, tu scannerais le système de fichiers
    return [
      `${projectPath}/${subdir}/Token.sol`,
      `${projectPath}/${subdir}/Vault.sol`,
      `${projectPath}/${subdir}/Governance.sol`
    ];
  }

  private async generateMutants(filePath: string): Promise<MutationTestResult[]> {
    // Simulation de génération de mutants
    const mutants: MutationTestResult[] = [];
    
    // Exemple de mutant
    mutants.push({
      fileName: filePath,
      line: 42,
      mutationType: 'arithmetic',
      originalCode: 'balance = balance + amount;',
      mutatedCode: 'balance = balance - amount;',
      status: 'survived'
    });
    
    mutants.push({
      fileName: filePath,
      line: 87,
      mutationType: 'relational',
      originalCode: 'if (balance >= required)',
      mutatedCode: 'if (balance < required)',
      status: 'killed',
      testThatKilled: 'test/Token.test.js::should reject transfer when balance insufficient'
    });
    
    return mutants;
  }

  private async runMutationTests(
    mutants: MutationTestResult[], 
    projectPath: string
  ): Promise<MutationTestResult[]> {
    // Dans une vraie implémentation, tu exécuterais les tests pour chaque mutant
    // Pour l'instant, simulation avec statut aléatoire
    return mutants.map(mutant => ({
      ...mutant,
      status: Math.random() > 0.5 ? 'killed' : 'survived',
      testThatKilled: mutant.status === 'killed' 
        ? `test/${mutant.fileName.split('/').pop()?.replace('.sol', '.test.js')}::test_${Math.floor(Math.random() * 100)}`
        : undefined
    }));
  }

  private generateRecommendations(results: MutationTestResult[]): string[] {
    const recommendations: string[] = [];
    const survivedByFile: Record<string, number> = {};
    
    // Compter les mutants survivants par fichier
    results.filter(r => r.status === 'survived').forEach(r => {
      survivedByFile[r.fileName] = (survivedByFile[r.fileName] || 0) + 1;
    });
    
    // Recommandations basées sur les mutants survivants
    Object.entries(survivedByFile).forEach(([file, count]) => {
      if (count > 5) {
        recommendations.push(`Fichier ${file} a ${count} mutants survivants. Ajoutez des tests pour couvrir ces cas.`);
      }
    });
    
    // Recommandations générales
    const totalSurvived = results.filter(r => r.status === 'survived').length;
    if (totalSurvived > results.length * 0.3) {
      recommendations.push('Taux de survie élevé (>30%). Vos tests ne couvrent pas suffisamment les cas limites.');
    }
    
    // Recommandations par type de mutation
    const survivedByType: Record<string, number> = {};
    results.filter(r => r.status === 'survived').forEach(r => {
      survivedByType[r.mutationType] = (survivedByType[r.mutationType] || 0) + 1;
    });
    
    Object.entries(survivedByType).forEach(([type, count]) => {
      if (count > 3) {
        recommendations.push(`Les mutations de type "${type}" ne sont pas bien couvertes (${count} survivants).`);
      }
    });
    
    return recommendations;
  }

  getSupportedOperators(): string[] {
    return this.mutationOperators.map(op => op.name);
  }
}