// ============================================================================
//  EtherWorld — Builder Store v2
//  Chemin : stores/builderStore.ts
//
//  Nouveautés v2 :
//  - Persistance localStorage (projets entre sessions)
//  - Undo / Redo complet sur les objets du projet courant (jusqu'à 50 états)
//  - Types d'objets 3D structurés (BuilderObject)
//  - Actions granulaires : addObject, removeObject, updateObject, moveObject,
//    duplicateObject, clearObjects, selectObject, deselectAll
//  - Métadonnées de projet : description, tags, thumbnail
//  - Tri / filtrage des projets
//  - Import / Export JSON d'un projet complet
//  - Auto-sauvegarde du projet courant dans la liste projets à chaque mutation
// ============================================================================

import { useSyncExternalStore } from 'react'

// ============================================================================
// Types
// ============================================================================

export type ProjectKind = 'poly-builder' | 'scene' | 'interior' | 'terrain'

export type ObjectKind =
  | 'mesh'
  | 'light'
  | 'camera'
  | 'group'
  | 'sprite'
  | 'audio'
  | (string & {})

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface BuilderObject {
  id: string
  kind: ObjectKind
  name: string
  visible: boolean
  locked: boolean
  position: Vec3
  rotation: Vec3
  scale: Vec3
  metadata: Record<string, unknown>
  createdAt: number
  updatedAt: number
}

export interface BuilderProject {
  id: string
  name: string
  description: string
  kind: ProjectKind
  tags: string[]
  thumbnail: string | null
  createdAt: number
  updatedAt: number
  objects: BuilderObject[]
}

export interface BuilderState {
  // Projets
  currentProject: BuilderProject | null
  projects: BuilderProject[]

  // Sélection
  selectedObjectId: string | null

  // Undo/Redo
  undoStack: BuilderObject[][]
  redoStack: BuilderObject[][]

  // ── Projets
  createProject: (name?: string, kind?: ProjectKind, description?: string) => BuilderProject
  openProject: (projectId: string) => void
  closeProject: () => void
  updateCurrentProject: (patch: Partial<Omit<BuilderProject, 'id' | 'objects' | 'createdAt'>>) => void
  deleteProject: (projectId: string) => void
  duplicateProject: (projectId: string) => BuilderProject | null

  // ── Export / Import
  exportProject: (projectId?: string) => BuilderProject | null
  importProject: (data: unknown) => BuilderProject | null

  // ── Objets 3D
  addObject: (obj: Partial<BuilderObject> & Pick<BuilderObject, 'kind'>) => BuilderObject
  removeObject: (id: string) => void
  updateObject: (id: string, patch: Partial<BuilderObject>) => void
  moveObject: (id: string, position: Partial<Vec3>) => void
  duplicateObject: (id: string) => BuilderObject | null
  clearObjects: () => void

  // ── Sélection
  selectObject: (id: string | null) => void
  deselectAll: () => void
  getSelectedObject: () => BuilderObject | null

  // ── Undo / Redo
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean

  // ── Filtrage / tri
  getProjectsSortedBy: (field: 'name' | 'createdAt' | 'updatedAt') => BuilderProject[]
  getProjectsByKind: (kind: ProjectKind) => BuilderProject[]
  searchProjects: (query: string) => BuilderProject[]
}

// ============================================================================
// Configuration
// ============================================================================

const MAX_UNDO_DEPTH = 50
const STORAGE_KEY = 'etherworld-builder-store'

// ============================================================================
// Helpers
// ============================================================================

function createId(prefix = 'obj'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function defaultVec3(): Vec3 {
  return { x: 0, y: 0, z: 0 }
}

function defaultScale(): Vec3 {
  return { x: 1, y: 1, z: 1 }
}

function normalizeVec3(value: unknown, fallback: Vec3): Vec3 {
  if (!isRecord(value)) return { ...fallback }
  return {
    x: typeof value.x === 'number' ? value.x : fallback.x,
    y: typeof value.y === 'number' ? value.y : fallback.y,
    z: typeof value.z === 'number' ? value.z : fallback.z,
  }
}

function normalizeObject(raw: unknown, fallbackIndex = 0): BuilderObject | null {
  if (!isRecord(raw)) return null
  const now = Date.now()
  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : createId('obj'),
    kind: typeof raw.kind === 'string' && raw.kind.trim() ? raw.kind as ObjectKind : 'mesh',
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name : `Objet ${fallbackIndex + 1}`,
    visible: raw.visible !== false,
    locked: raw.locked === true,
    position: normalizeVec3(raw.position, defaultVec3()),
    rotation: normalizeVec3(raw.rotation, defaultVec3()),
    scale: normalizeVec3(raw.scale, defaultScale()),
    metadata: isRecord(raw.metadata) ? raw.metadata : {},
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : now,
  }
}

function normalizeProject(raw: unknown): BuilderProject | null {
  if (!isRecord(raw)) return null
  const now = Date.now()
  const objects = Array.isArray(raw.objects)
    ? raw.objects.map((o, i) => normalizeObject(o, i)).filter((o): o is BuilderObject => o !== null)
    : []
  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : createId('forge'),
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name : 'Projet sans titre',
    description: typeof raw.description === 'string' ? raw.description : '',
    kind: (['poly-builder', 'scene', 'interior', 'terrain'].includes(raw.kind as string)
      ? raw.kind as ProjectKind
      : 'poly-builder'),
    tags: Array.isArray(raw.tags) ? raw.tags.filter((t): t is string => typeof t === 'string') : [],
    thumbnail: typeof raw.thumbnail === 'string' ? raw.thumbnail : null,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : now,
    objects,
  }
}

// ============================================================================
// Persistence localStorage
// ============================================================================

function loadFromStorage(): { projects: BuilderProject[] } | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!isRecord(parsed) || !Array.isArray(parsed.projects)) return null
    return {
      projects: parsed.projects
        .map((p: unknown) => normalizeProject(p))
        .filter((p): p is BuilderProject => p !== null),
    }
  } catch {
    return null
  }
}

function saveToStorage(projects: BuilderProject[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ projects }))
  } catch {
    // Ignore quota exceeded
  }
}

// ============================================================================
// Store
// ============================================================================

type Listener = () => void
type UseBuilderStore = {
  <T>(selector: (state: BuilderState) => T): T
  getState: () => BuilderState
  setState: (patch: Partial<BuilderState>) => void
  subscribe: (listener: Listener) => () => void
}

const listeners = new Set<Listener>()

function emit() {
  listeners.forEach(l => l())
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

let state: BuilderState

function setState(patch: Partial<BuilderState>) {
  state = { ...state, ...patch }
  // Sync projets en localStorage après chaque mutation
  saveToStorage(state.projects)
  emit()
}

// ── Undo/Redo helpers

function pushUndoSnapshot(objects: BuilderObject[]): void {
  const undoStack = [objects.map(o => ({ ...o })), ...state.undoStack].slice(0, MAX_UNDO_DEPTH)
  setState({ undoStack, redoStack: [] })
}

// ── Auto-sync projet courant dans la liste projets

function syncCurrentProjectToList(updated: BuilderProject): void {
  const projects = state.projects.map(p => p.id === updated.id ? updated : p)
  setState({ currentProject: updated, projects })
}

// ============================================================================
// Actions
// ============================================================================

const actions = {

  // ── Projets

  createProject(
    name = 'Untitled EtherForge Project',
    kind: ProjectKind = 'poly-builder',
    description = '',
  ): BuilderProject {
    const now = Date.now()
    const project: BuilderProject = {
      id: createId('forge'),
      name,
      description,
      kind,
      tags: [],
      thumbnail: null,
      createdAt: now,
      updatedAt: now,
      objects: [],
    }
    setState({
      currentProject: project,
      projects: [project, ...state.projects],
      selectedObjectId: null,
      undoStack: [],
      redoStack: [],
    })
    return project
  },

  openProject(projectId: string): void {
    const project = state.projects.find(p => p.id === projectId) ?? null
    setState({
      currentProject: project,
      selectedObjectId: null,
      undoStack: [],
      redoStack: [],
    })
  },

  closeProject(): void {
    setState({
      currentProject: null,
      selectedObjectId: null,
      undoStack: [],
      redoStack: [],
    })
  },

  updateCurrentProject(patch: Partial<Omit<BuilderProject, 'id' | 'objects' | 'createdAt'>>): void {
    if (!state.currentProject) return
    const updated: BuilderProject = {
      ...state.currentProject,
      ...patch,
      updatedAt: Date.now(),
    }
    syncCurrentProjectToList(updated)
  },

  deleteProject(projectId: string): void {
    const projects = state.projects.filter(p => p.id !== projectId)
    const currentProject = state.currentProject?.id === projectId ? null : state.currentProject
    setState({ projects, currentProject })
  },

  duplicateProject(projectId: string): BuilderProject | null {
    const source = state.projects.find(p => p.id === projectId)
    if (!source) return null
    const now = Date.now()
    const copy: BuilderProject = {
      ...source,
      id: createId('forge'),
      name: `${source.name} (copie)`,
      createdAt: now,
      updatedAt: now,
      objects: source.objects.map(o => ({ ...o, id: createId('obj'), createdAt: now, updatedAt: now })),
    }
    setState({ projects: [copy, ...state.projects] })
    return copy
  },

  // ── Export / Import

  exportProject(projectId?: string): BuilderProject | null {
    const project = projectId
      ? state.projects.find(p => p.id === projectId) ?? null
      : state.currentProject
    return project ? { ...project, objects: project.objects.map(o => ({ ...o })) } : null
  },

  importProject(data: unknown): BuilderProject | null {
    const project = normalizeProject(data)
    if (!project) return null
    // Nouveau ID pour éviter les conflits
    project.id = createId('forge')
    project.name = `${project.name} (importé)`
    project.updatedAt = Date.now()
    setState({ projects: [project, ...state.projects] })
    return project
  },

  // ── Objets 3D

  addObject(obj: Partial<BuilderObject> & Pick<BuilderObject, 'kind'>): BuilderObject {
    if (!state.currentProject) throw new Error('Aucun projet ouvert. Crée ou ouvre un projet avant d\'ajouter des objets.')

    const now = Date.now()
    const newObj: BuilderObject = {
      id: createId('obj'),
      name: obj.name ?? `${obj.kind} ${state.currentProject.objects.length + 1}`,
      visible: obj.visible !== false,
      locked: obj.locked === true,
      position: normalizeVec3(obj.position, defaultVec3()),
      rotation: normalizeVec3(obj.rotation, defaultVec3()),
      scale: normalizeVec3(obj.scale, defaultScale()),
      metadata: isRecord(obj.metadata) ? obj.metadata : {},
      createdAt: now,
      updatedAt: now,
      ...obj,
      id: createId('obj'), // force nouveau id
      createdAt: now,
      updatedAt: now,
    }

    pushUndoSnapshot(state.currentProject.objects)

    const updated: BuilderProject = {
      ...state.currentProject,
      objects: [...state.currentProject.objects, newObj],
      updatedAt: now,
    }
    syncCurrentProjectToList(updated)

    return newObj
  },

  removeObject(id: string): void {
    if (!state.currentProject) return
    pushUndoSnapshot(state.currentProject.objects)

    const updated: BuilderProject = {
      ...state.currentProject,
      objects: state.currentProject.objects.filter(o => o.id !== id),
      updatedAt: Date.now(),
    }
    const selectedObjectId = state.selectedObjectId === id ? null : state.selectedObjectId
    setState({ selectedObjectId })
    syncCurrentProjectToList(updated)
  },

  updateObject(id: string, patch: Partial<BuilderObject>): void {
    if (!state.currentProject) return
    pushUndoSnapshot(state.currentProject.objects)

    const updated: BuilderProject = {
      ...state.currentProject,
      objects: state.currentProject.objects.map(o =>
        o.id === id ? { ...o, ...patch, id, updatedAt: Date.now() } : o
      ),
      updatedAt: Date.now(),
    }
    syncCurrentProjectToList(updated)
  },

  moveObject(id: string, position: Partial<Vec3>): void {
    if (!state.currentProject) return
    pushUndoSnapshot(state.currentProject.objects)

    const updated: BuilderProject = {
      ...state.currentProject,
      objects: state.currentProject.objects.map(o =>
        o.id === id
          ? { ...o, position: { ...o.position, ...position }, updatedAt: Date.now() }
          : o
      ),
      updatedAt: Date.now(),
    }
    syncCurrentProjectToList(updated)
  },

  duplicateObject(id: string): BuilderObject | null {
    if (!state.currentProject) return null
    const source = state.currentProject.objects.find(o => o.id === id)
    if (!source) return null

    pushUndoSnapshot(state.currentProject.objects)

    const now = Date.now()
    const copy: BuilderObject = {
      ...source,
      id: createId('obj'),
      name: `${source.name} (copie)`,
      position: { ...source.position, x: source.position.x + 1 },
      createdAt: now,
      updatedAt: now,
    }

    const updated: BuilderProject = {
      ...state.currentProject,
      objects: [...state.currentProject.objects, copy],
      updatedAt: now,
    }
    syncCurrentProjectToList(updated)
    return copy
  },

  clearObjects(): void {
    if (!state.currentProject) return
    pushUndoSnapshot(state.currentProject.objects)

    const updated: BuilderProject = {
      ...state.currentProject,
      objects: [],
      updatedAt: Date.now(),
    }
    setState({ selectedObjectId: null })
    syncCurrentProjectToList(updated)
  },

  // ── Sélection

  selectObject(id: string | null): void {
    setState({ selectedObjectId: id })
  },

  deselectAll(): void {
    setState({ selectedObjectId: null })
  },

  getSelectedObject(): BuilderObject | null {
    if (!state.currentProject || !state.selectedObjectId) return null
    return state.currentProject.objects.find(o => o.id === state.selectedObjectId) ?? null
  },

  // ── Undo / Redo

  undo(): void {
    if (!state.currentProject || state.undoStack.length === 0) return
    const [previous, ...restUndo] = state.undoStack
    const redoStack = [state.currentProject.objects.map(o => ({ ...o })), ...state.redoStack]

    const updated: BuilderProject = {
      ...state.currentProject,
      objects: previous,
      updatedAt: Date.now(),
    }
    setState({ undoStack: restUndo, redoStack })
    syncCurrentProjectToList(updated)
  },

  redo(): void {
    if (!state.currentProject || state.redoStack.length === 0) return
    const [next, ...restRedo] = state.redoStack
    const undoStack = [state.currentProject.objects.map(o => ({ ...o })), ...state.undoStack].slice(0, MAX_UNDO_DEPTH)

    const updated: BuilderProject = {
      ...state.currentProject,
      objects: next,
      updatedAt: Date.now(),
    }
    setState({ undoStack, redoStack: restRedo })
    syncCurrentProjectToList(updated)
  },

  canUndo(): boolean {
    return state.undoStack.length > 0
  },

  canRedo(): boolean {
    return state.redoStack.length > 0
  },

  // ── Filtrage / tri

  getProjectsSortedBy(field: 'name' | 'createdAt' | 'updatedAt'): BuilderProject[] {
    return [...state.projects].sort((a, b) => {
      if (field === 'name') return a.name.localeCompare(b.name)
      return b[field] - a[field]
    })
  },

  getProjectsByKind(kind: ProjectKind): BuilderProject[] {
    return state.projects.filter(p => p.kind === kind)
  },

  searchProjects(query: string): BuilderProject[] {
    const q = query.toLowerCase().trim()
    if (!q) return state.projects
    return state.projects.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some(tag => tag.toLowerCase().includes(q))
    )
  },
}

// ============================================================================
// Init state
// ============================================================================

const saved = loadFromStorage()

state = {
  currentProject: null,
  projects: saved?.projects ?? [],
  selectedObjectId: null,
  undoStack: [],
  redoStack: [],
  ...actions,
}

// ============================================================================
// Hook
// ============================================================================

export const useBuilderStore = ((selector) => {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state),
  )
}) as UseBuilderStore

useBuilderStore.getState = () => state
useBuilderStore.setState = setState
useBuilderStore.subscribe = subscribe

export default useBuilderStore