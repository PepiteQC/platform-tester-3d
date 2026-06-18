import { Button, Card, Badge } from '@blinkdotnew/ui'
<<<<<<< HEAD
import { Box, ChevronLeft, Save, Palette } from 'lucide-react'
import { useBuilderStore } from '@/store/useBuilderStore'
import { DEFAULT_MATERIALS } from '@/tools/ether-forge/lib/forgeMaterials'
=======
import { Box, ChevronLeft, Save } from 'lucide-react'
import { useBuilderStore } from '@/store/useBuilderStore'
>>>>>>> 810e7eca909840df06715d9c2f0948347025c044

export function BuilderUI() {
  const currentProject = useBuilderStore(state => state.currentProject)
  const closeProject = useBuilderStore(state => state.closeProject)
  const updateCurrentProject = useBuilderStore(state => state.updateCurrentProject)

  if (!currentProject) return null

<<<<<<< HEAD
  const materialObjects = currentProject.objects.filter((object: any) => object?.type === 'material')

  const addMaterialToProject = (materialId: string) => {
    const material = DEFAULT_MATERIALS.find(item => item.id === materialId)
    if (!material) return
    updateCurrentProject({
      objects: [
        ...currentProject.objects,
        {
          type: 'material',
          materialId: material.id,
          name: material.name,
          color: material.color,
          category: material.category,
          addedAt: Date.now()
        }
      ]
    })
  }

=======
>>>>>>> 810e7eca909840df06715d9c2f0948347025c044
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
<<<<<<< HEAD
          <div className="flex flex-col gap-6">
            <Card className="bg-white/5 border-white/10 h-fit">
              <div className="text-xs uppercase tracking-widest text-white/35 font-bold mb-4">Scene objects</div>
              {currentProject.objects.length === 0 ? (
                <div className="text-sm text-white/35">
                  La scène est prête. Ajoute des matériaux ou objets 3D sans toucher au jeu public.
                </div>
              ) : (
                <div className="space-y-2">
                  {currentProject.objects.slice(-12).map((object: any, index) => (
                    <div key={`${object?.type || 'object'}-${index}`} className="text-sm text-white/70 border border-white/10 rounded-lg p-2">
                      {object?.type === 'material' ? `Material: ${object.name}` : `Object #${index + 1}: ${String(object)}`}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="bg-white/5 border-white/10 h-fit">
              <div className="text-xs uppercase tracking-widest text-white/35 font-bold mb-3">Material Bank</div>
              <div className="text-3xl font-bold text-[#c9a84c]">{materialObjects.length}</div>
              <div className="text-sm text-white/35 mt-1">matériaux ajoutés au projet</div>
            </Card>
          </div>

          <Card className="bg-black/40 border-white/10 min-h-[520px]">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-14 h-14 rounded-2xl bg-[#7b6fff]/20 border border-[#7b6fff]/30 flex items-center justify-center">
                <Palette className="w-7 h-7 text-[#7b6fff]" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">EtherWorld Material Library</h3>
                <p className="text-white/40 text-sm">
                  Matériaux inspirés de la maison moderne Québec, prêts pour Builder, Platform Tester et TroxT.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
              {DEFAULT_MATERIALS.map(material => (
                <button
                  key={material.id}
                  onClick={() => addMaterialToProject(material.id)}
                  className="text-left rounded-xl border border-white/10 bg-white/[0.035] hover:bg-white/[0.07] transition-colors p-3"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className="w-8 h-8 rounded-lg border border-white/20 shadow-lg"
                      style={{ background: material.color, boxShadow: material.emissive ? `0 0 18px ${material.emissive}` : undefined }}
                    />
                    <div>
                      <div className="text-sm font-semibold text-white">{material.name}</div>
                      <div className="text-[10px] uppercase tracking-widest text-white/30">{material.category || 'material'}</div>
                    </div>
                  </div>
                  <div className="text-xs text-white/35 leading-relaxed">{material.description}</div>
                  <div className="mt-3 text-[10px] font-mono text-[#7dd3fc]">
                    R {material.roughness.toFixed(2)} · M {material.metalness.toFixed(2)}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 text-center max-w-lg mx-auto">
              <Box className="w-8 h-8 text-[#7b6fff] mx-auto mb-3" />
              <p className="text-white/35 leading-relaxed text-sm">
                Les matériaux ajoutés ici sont versionnés dans ton projet Builder. Le même pack est aussi exposé au Platform Tester via EtherMaterials.
=======
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
>>>>>>> 810e7eca909840df06715d9c2f0948347025c044
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default BuilderUI
