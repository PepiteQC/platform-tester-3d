import { Button, Card, Badge } from '@blinkdotnew/ui'
import { Hammer, Sparkles, Palette } from 'lucide-react'
import { useBuilderStore } from '@/store/useBuilderStore'
import { DEFAULT_MATERIALS } from '@/tools/ether-forge/lib/forgeMaterials'

export function ProjectMenu() {
  const projects      = useBuilderStore(state => state.projects)
  const createProject = useBuilderStore(state => state.createProject)
  const openProject   = useBuilderStore(state => state.openProject)

  return (
    <div className="min-h-screen bg-[#060606] text-white flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full bg-white/5 border-white/10">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <Badge className="bg-[#7b6fff]/10 text-[#7b6fff] border-[#7b6fff]/20 mb-3">
              EtherForge Builder
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight">Poly Builder</h2>
            <p className="text-white/50 mt-2">
              Crée un projet 3D avec matériaux EtherWorld officiels,
              sans écraser le Platform Tester existant.
            </p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-[#7b6fff] flex items-center justify-center">
            <Hammer className="w-7 h-7 text-white" />
          </div>
        </div>

        {/* Actions */}
        <div className="grid md:grid-cols-2 gap-3 mb-6">
          <Button
            className="w-full bg-[#7b6fff] hover:bg-[#5b4fff]"
            onClick={() => createProject('EtherForge Scene')}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            New EtherForge Project
          </Button>

          <div className="border border-white/10 rounded-xl p-3 bg-white/[0.03]
                          flex items-center gap-3">
            <Palette className="w-5 h-5 text-[#c9a84c]" />
            <div>
              <div className="text-sm font-semibold text-white">
                {DEFAULT_MATERIALS.length} matériaux
              </div>
              <div className="text-xs text-white/35">
                Québec house / Platform 3D
              </div>
            </div>
          </div>
        </div>

        {/* Projets existants */}
        {projects.length > 0 && (
          <div className="border-t border-white/10 pt-5">
            <h3 className="text-xs font-semibold text-white/40 uppercase
                           tracking-wider mb-3">
              Projets existants
            </h3>
            <div className="flex flex-col gap-2">
              {projects.map((project: any) => (
                <button
                  key={project.id}
                  onClick={() => openProject(project.id)}
                  className="flex items-center justify-between p-3 rounded-xl
                             bg-white/[0.03] border border-white/10
                             hover:border-[#7b6fff]/40 hover:bg-[#7b6fff]/5
                             transition-all duration-150 cursor-pointer text-left"
                >
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {project.name}
                    </div>
                    <div className="text-xs text-white/35 font-mono">
                      {project.id}
                    </div>
                  </div>
                  <div className="text-xs text-white/30">
                    {project.objects?.length ?? 0} objets
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Aperçu palette */}
        <div className="border-t border-white/10 pt-5 mt-4">
          <h3 className="text-xs font-semibold text-white/40 uppercase
                         tracking-wider mb-3">
            Aperçu palette
          </h3>
          <div className="flex gap-2 flex-wrap">
            {DEFAULT_MATERIALS.slice(0, 16).map((mat: any) => (
              <div
                key={mat.id}
                className="w-8 h-8 rounded-lg border border-white/10"
                style={{
                  background: mat.color,
                  boxShadow: mat.emissive
                    ? `0 0 6px ${mat.emissive}55`
                    : 'none',
                }}
                title={mat.name}
              />
            ))}
            <div className="w-8 h-8 rounded-lg border border-white/10
                            bg-white/5 flex items-center justify-center
                            text-[10px] text-white/30">
              +{DEFAULT_MATERIALS.length - 16}
            </div>
          </div>
        </div>

      </Card>
    </div>
  )
}

export default ProjectMenu