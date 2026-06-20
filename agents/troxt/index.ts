import { brain } from './brain.js';
import { engine } from './engine.js';
import { troxt } from './optimizer.js';
import { agentBus } from './agentBus.js';

class Troxt {
  async demarrer() {
    console.log('🧠 TroxT: Initialisation...');
    
    // 1. Charger la mémoire
    await troxt.init();
    
    // 2. Enregistrer les agents
    await agentBus.enregistrerAgents();
    
    // 3. Démarrer le moteur en arrière-plan (cycle infini)
    engine.demarrerCycle();
    
    console.log('✅ TroxT opérationnel — roulement infini actif');
    
    return {
      brain,
      engine,
      troxt,
      agentBus
    };
  }

  async executer(demande: string) {
    return brain.executer(demande);
  }

  arreter() {
    engine.arreter();
  }
}

// Point d'entrée
const troxt = new Troxt();
await troxt.demarrer();

// Exemple d'utilisation
const resultat = await troxt.executer("Analyse la sécurité du système");

console.log('Résultat:', resultat);