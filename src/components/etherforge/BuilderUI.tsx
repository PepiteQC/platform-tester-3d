import { Button, Card, Badge } from '@blinkdotnew/ui'
import { Box, ChevronLeft, Save, Palette } from 'lucide-react'
import { useBuilderStore } from '@/store/useBuilderStore'
import { DEFAULT_MATERIALS } from '@/tools/ether-forge/lib/forgeMaterials'

export function BuilderUI() {
  const currentProject    = useBuilderStore(state => state.currentProject)
  const closeProject      = useBuilderStore(state => state.closeProject)
  const updateCurrentProject = useBuilderStore(state => state.updateCurrentProject)

  if (!currentProject) return null

  const materialObjects = currentProject.objects.filter(
    (object: any) => object?.type === 'material'
  )

  const addMaterialToProject = (materialId: string) => {
    const material = DEFAULT_MATERIALS.find(item => item.id === materialId)
    if (!material) return
    updateCurrentProject({
      objects: [
        ...currentProject.objects,
        {
          type:       'material',
          materialId: material.id,
          name:       material.name,
          color:      material.color,
          category:   material.category,
          addedAt:    Date.now(),
        },
      ],
    })
  }

  return (
    <div className="min-h-screen bg-[#060606] text-white p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <Badge className="bg-[#7b6fff]/10 text-[#7b6fff] border-[#7b6fff]/20 mb-3">
              BuilderUI Connected
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight">
              {currentProject.name}
            </h2>
            <p className="text-white/40 mt-1 font-mono text-xs">
              {currentProject.id}
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="border-white/10 text-white/60 hover:text-white"
              onClick={closeProject}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <Button className="bg-[#7b6fff] hover:bg-[#5b4fff]">
              <Save className="w-4 h-4 mr-2" />
              Sauvegarder
            </Button>
          </div>
        </div>

        {/* Stats matériaux */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-white/5 border-white/10 p-4">
            <div className="flex items-center gap-3">
              <Box className="w-5 h-5 text-[#7b6fff]" />
              <div>
                <div className="text-sm font-semibold text-white">
                  {currentProject.objects.length} objets
                </div>
                <div className="text-xs text-white/40">dans ce projet</div>
              </div>
            </div>
          </Card>

          <Card className="bg-white/5 border-white/10 p-4">
            <div className="flex items-center gap-3">
              <Palette className="w-5 h-5 text-[#c9a84c]" />
              <div>
                <div className="text-sm font-semibold text-white">
                  {materialObjects.length} matériaux
                </div>
                <div className="text-xs text-white/40">ajoutés</div>
              </div>
            </div>
          </Card>

          <Card className="bg-white/5 border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-green-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">
                  {DEFAULT_MATERIALS.length} disponibles
                </div>
                <div className="text-xs text-white/40">catalogue complet</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Catalogue matériaux */}
        <Card className="bg-white/5 border-white/10 p-5">
          <h3 className="text-sm font-semibold text-white/70 mb-4 uppercase tracking-wider">
            Catalogue Matériaux EtherWorld
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {DEFAULT_MATERIALS.slice(0, 24).map((mat: any) => (
              <button
                key={mat.id}
                onClick={() => addMaterialToProject(mat.id)}
                className="group flex flex-col items-center gap-2 p-3 rounded-xl
                           bg-white/[0.03] border border-white/10
                           hover:border-[#7b6fff]/50 hover:bg-[#7b6fff]/5
                           transition-all duration-150 cursor-pointer"
                title={mat.name}
              >
                <div
                  className="w-full h-8 rounded-lg border border-white/10"
                  style={{
                    background: mat.color,
                    boxShadow: mat.emissive
                      ? `0 0 8px ${mat.emissive}66`
                      : 'none',
                  }}
                />
                <span className="text-[10px] text-white/50 text-center
                                 group-hover:text-white/80 leading-tight">
                  {mat.name}
                </span>
              </button>
            ))}
          </div>

          {DEFAULT_MATERIALS.length > 24 && (
            <p className="text-xs text-white/30 mt-3 text-center">
              +{DEFAULT_MATERIALS.length - 24} autres matériaux disponibles
            </p>
          )}
        </Card>

      </div>
    </div>
  )
}

export default BuilderUI