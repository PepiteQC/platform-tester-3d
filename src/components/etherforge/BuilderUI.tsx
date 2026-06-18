import { Button, Card, Badge } from '@blinkdotnew/ui'
import { Box, ChevronLeft, Save } from 'lucide-react'
import { useBuilderStore } from '@/store/useBuilderStore'

export function BuilderUI() {
  const currentProject = useBuilderStore(state => state.currentProject)
  const closeProject = useBuilderStore(state => state.closeProject)
  const updateCurrentProject = useBuilderStore(state => state.updateCurrentProject)

  if (!currentProject) return null

  return (
    <div className="min-h-screen bg-[#060606] text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <Badge className="bg-[#7b6fff]/10 text-[#7b6fff] border-[#7b6fff]/20 mb-3">
              BuilderUI Connected
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight">{currentProject.name}</h2>
            <p className="text-white/40 mt-1 font-mono text-xs">{currentProject.id}</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={closeProject}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <Button
              onClick={() => updateCurrentProject({ name: `${currentProject.name} *` })}
              className="bg-[#7b6fff] hover:bg-[#5b4fff]"
            >
              <Save className="w-4 h-4 mr-1" /> Touch Project
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          <Card className="bg-white/5 border-white/10 h-fit">
            <div className="text-xs uppercase tracking-widest text-white/35 font-bold mb-4">Scene objects</div>
            {currentProject.objects.length === 0 ? (
              <div className="text-sm text-white/35">
                La scène est prête. Les objets 3D pourront être branchés ici sans toucher au jeu public.
              </div>
            ) : (
              <div className="space-y-2">
                {currentProject.objects.map((object, index) => (
                  <div key={index} className="text-sm text-white/70 border border-white/10 rounded-lg p-2">
                    Object #{index + 1}: {String(object)}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="bg-black/40 border-white/10 min-h-[520px] flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 rounded-3xl bg-[#7b6fff]/20 border border-[#7b6fff]/30 flex items-center justify-center mx-auto mb-5">
                <Box className="w-10 h-10 text-[#7b6fff]" />
              </div>
              <h3 className="text-xl font-bold mb-2">EtherForge Workspace</h3>
              <p className="text-white/40 leading-relaxed">
                Ce composant sert de point d’ancrage propre pour ton builder 3D. TroxT peut maintenant router vers le menu,
                BuilderUI ou PlatformTester3D sans casser les fichiers existants.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default BuilderUI
