import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Exporte tes outils pour que TroxT puisse les utiliser
export const EtherPrismTool = {
  prisma,
  // Tes fonctions de haut niveau pour manipuler ton monde
  async getPlayerWealth(playerId) {
    return await prisma.player.findUnique({ where: { id: playerId } });
  },
  // ...
};