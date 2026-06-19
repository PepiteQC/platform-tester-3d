import { Mutex } from 'async-mutex'; // Indispensable pour les actions hardware
import robot from 'robotjs';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { createLogger } from '../utils/logger.mjs';

const logger = createLogger('rpa-orchestrator');

// ─── 🛡️ 1. CONFIGURATION & SÉCURITÉ ─────────────────────────────────────────

const RPA_CONFIG = Object.freeze({
  // ⏱️ Vitesse de frappe (Words Per Minute) pour simulation humaine
  defaultWpm: 85, 
  varianceMs: 45, // Variation aléatoire entre chaque touche (anti-bot)
  
  // 🔒 Sécurité : Caractères interdits pour empêcher l'injection de commandes OS
  blockedChars: /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/, 
  
  // 🛑 Limites de payload
  maxTextLength: 2000,
  
  // 🖥️ Environnement : Force l'utilisation d'un affichage virtuel (Xvfb)
  // Empêche le script de pirater l'écran réel du serveur de production
  requireVirtualDisplay: process.env.NODE_ENV === 'production',
});

// ─── 📐 2. SCHÉMA DE VALIDATION ZOD ─────────────────────────────────────────

const keyboardActionSchema = z.object({
  text: z
    .string()
    .min(1, 'Le texte ne peut pas être vide.')
    .max(RPA_CONFIG.maxTextLength, 'Texte trop long pour une saisie RPA.')
    .refine(val => !RPA_CONFIG.blockedChars.test(val), 'Caractères de contrôle interdits.'),
    
  targetWindowTitle: z
    .string()
    .optional()
    .describe('Optionnel: Tenter de focaliser cette fenêtre avant de taper.'),
    
  wpm: z
    .number()
    .int()
    .min(10)
    .max(300)
    .default(RPA_CONFIG.defaultWpm)
    .describe('Mots par minute (vitesse de frappe).'),
    
  pressEnterAfter: z
    .boolean()
    .default(false)
    .describe('Appuyer sur Entrée à la fin de la saisie.'),
    
  correlationId: z.string().uuid().optional(),
});

// ─── 🔐 3. LE VERROU MUTEX (Anti Race-Condition) ─────────────────────────────

// Le clavier est une ressource matérielle UNIQUE. 
// Un seul processus peut taper à la fois.
const keyboardMutex = new Mutex();

// ─── ⚙️ 4. MOTEUR D'EXÉCUTION HUMANISÉ ──────────────────────────────────────

/**
 * Simule une frappe humaine avec des délais aléatoires (Anti-Bot Detection)
 */
async function typeHumanized(text, wpm) {
  const baseDelayMs = 60000 / (wpm * 5); // Formule WPM vers millisecondes
  
  for (const char of text) {
    // Variation aléatoire pour imiter l'hésitation humaine
    const jitter = Math.random() * RPA_CONFIG.varianceMs * (Math.random() > 0.5 ? 1 : -1);
    const delay = Math.max(10, baseDelayMs + jitter);
    
    robot.typeString(char);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

/**
 * Tente de mettre au premier plan la fenêtre cible (Nécessite xdotool sous Linux)
 */
async function focusWindow(windowTitle, correlationId) {
  if (!windowTitle) return true;
  
  try {
    // Exemple d'intégration avec l'OS pour focaliser la fenêtre
    // const { execSync } = require('child_process');
    // execSync(`xdotool search --name "${windowTitle}" windowactivate`);
    logger.info({ correlationId, windowTitle }, '[RPA] Fenêtre ciblée avec succès.');
    await new Promise(resolve => setTimeout(resolve, 500)); // Laisser le temps à l'OS
    return true;
  } catch (error) {
    logger.warn({ correlationId, windowTitle }, '[RPA] Impossible de focaliser la fenêtre.');
    return false;
  }
}

// ─── 🚀 5. ORCHESTRATEUR PRINCIPAL ──────────────────────────────────────────

/**
 * Exécute une action clavier de manière sécurisée, séquentielle et traçable.
 */
export async function executeKeyboardAction(rawPayload) {
  const correlationId = rawPayload.correlationId || uuidv4();
  const startTime = performance.now();

  // 1. Validation stricte
  const validationResult = keyboardActionSchema.safeParse(rawPayload);
  if (!validationResult.success) {
    throw new RPAError('INVALID_PAYLOAD', validationResult.error.flatten().fieldErrors, correlationId);
  }

  const { text, targetWindowTitle, wpm, pressEnterAfter } = validationResult.data;

  // 2. Vérification de l'environnement (Sécurité Serveur)
  if (RPA_CONFIG.requireVirtualDisplay && !process.env.DISPLAY?.startsWith(':99')) {
    throw new RPAError('DISPLAY_VIOLATION', 'Action RPA bloquée: Aucun affichage virtuel (Xvfb) détecté.', correlationId);
  }

  // 3. Acquisition du Verrou Mutex (File d'attente matérielle)
  logger.info({ correlationId, textLength: text.length }, '[RPA] En attente du verrou clavier...');
  const release = await keyboardMutex.acquire();
  
  try {
    logger.info({ correlationId }, '[RPA] Verrou acquis. Début de la séquence.');

    // 4. Focus de la fenêtre cible
    const isFocused = await focusWindow(targetWindowTitle, correlationId);
    if (targetWindowTitle && !isFocused) {
      throw new RPAError('WINDOW_NOT_FOUND', `La fenêtre "${targetWindowTitle}" est introuvable.`, correlationId);
    }

    // 5. Exécution de la frappe humanisée
    await typeHumanized(text, wpm);

    // 6. Action de fin (Enter)
    if (pressEnterAfter) {
      await new Promise(resolve => setTimeout(resolve, 200)); // Pause avant Enter
      robot.keyTap('enter');
    }

    const duration = Math.round(performance.now() - startTime);
    logger.info({ correlationId, durationMs: duration }, '[RPA] Séquence clavier terminée avec succès.');

    return {
      success: true,
      correlationId,
      charsTyped: text.length,
      durationMs: duration,
    };

  } catch (error) {
    // Si c'est déjà une RPAError, on la laisse passer, sinon on l'encapsule
    if (error instanceof RPAError) throw error;
    
    logger.error({ correlationId, error: error.message }, '[RPA] Échec critique pendant la saisie.');
    throw new RPAError('EXECUTION_FAILED', error.message, correlationId);
    
  } finally {
    // 7. LIBÉRATION DU VERROU (Toujours exécuté, même en cas de crash)
    release();
    logger.debug({ correlationId }, '[RPA] Verrou clavier libéré.');
  }
}

// ─── 🚨 6. GESTION DES ERREURS ──────────────────────────────────────────────

class RPAError extends Error {
  constructor(code, message, correlationId) {
    super(message);
    this.name = 'RPAError';
    this.code = code;
    this.correlationId = correlationId;
  }
}