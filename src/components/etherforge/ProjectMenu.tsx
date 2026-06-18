import { Button, Card, Badge } from '@blinkdotnew/ui'
import { Hammer, Sparkles } from 'lucide-react'
import { useBuilderStore } from '@/store/useBuilderStore'

export function ProjectMenu() {
  const projects = useBuilderStore(state => state.projects)
  const createProject = useBuilderStore(state => state.createProject)
  const openProject = useBuilderStore(state => state.openProject)

  return (
    <div className="min-h-screen bg-[#060606] text-white flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full bg-white/5 border-white/10">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <Badge className="bg-[#7b6fff]/10 text-[#7b6fff] border-[#7b6fff]/20 mb-3">
              EtherForge Builder
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight">Poly Builder</h2>
            <p className="text-white/50 mt-2">
              Crée un projet 3D sans écraser le Platform Tester existant.
            </p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-[#7b6fff] flex items-center justify-center">
            <Hammer className="w-7 h-7 text-white" />
          </div>
        </div>

        <Button
          className="w-full bg-[#7b6fff] hover:bg-[#5b4fff] mb-6"
          onClick={() => createProject('EtherForge Scene')}
        >
          <Sparkles className="w-4 h-4 mr-2" /> New EtherForge Project
        </Button>

        <div className="space-y-3">
          <div className="text-xs uppercase tracking-widest text-white/35 font-bold">Recent projects</div>
          {projects.length === 0 ? (
            <div className="text-sm text-white/35 border border-white/10 rounded-xl p-4 bg-white/[0.03]">
              Aucun projet local pour l’instant. Crée un projet pour ouvrir BuilderUI.
            </div>
          ) : (
            projects.map(project => (
              <button
                key={project.id}
                className="w-full text-left border border-white/10 rounded-xl p-4 bg-white/[0.03] hover:bg-white/[0.07] transition-colors"
                onClick={() => openProject(project.id)}
              >
                <div className="font-semibold text-white">{project.name}</div>
                <div className="text-xs text-white/35 mt-1">
                  {project.objects.length} objects · {new Date(project.updatedAt).toLocaleString()}
                </div>
              </button>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}

export default ProjectMenu
