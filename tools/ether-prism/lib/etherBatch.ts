// ============================================================
//  etherBatch — Traitement par lot
// ============================================================

import type { BatchJob, PrismInput, PrismMode } from '../types'

export class EtherBatch {
  private jobs: Map<string, BatchJob> = new Map()

  // TODO: Créer un job batch
  createJob(_inputs: PrismInput[], _mode: PrismMode): BatchJob {
    const job: BatchJob = {
      id: crypto.randomUUID(),
      items: _inputs,
      mode: _mode,
      status: 'pending',
      progress: 0,
      results: []
    }
    this.jobs.set(job.id, job)
    return job
  }

  // TODO: Exécuter un job
  async runJob(_jobId: string): Promise<BatchJob | null> {
    return null
  }

  // TODO: Suivre la progression
  getProgress(_jobId: string): number {
    return this.jobs.get(_jobId)?.progress ?? 0
  }

  // TODO: Annuler un job
  cancelJob(_jobId: string): void {
    const job = this.jobs.get(_jobId)
    if (job) job.status = 'error'
  }

  getAllJobs(): BatchJob[] {
    return Array.from(this.jobs.values())
  }
}

export const etherBatch = new EtherBatch()
export default EtherBatch