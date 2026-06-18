import { useSyncExternalStore } from 'react'

export interface BuilderProject {
  id: string
  name: string
  kind: 'poly-builder' | 'scene'
  createdAt: number
  updatedAt: number
  objects: unknown[]
}

export interface BuilderState {
  currentProject: BuilderProject | null
  projects: BuilderProject[]
  createProject: (name?: string) => BuilderProject
  openProject: (projectId: string) => void
  closeProject: () => void
  updateCurrentProject: (patch: Partial<BuilderProject>) => void
}

type Listener = () => void

type UseBuilderStore = {
  <T>(selector: (state: BuilderState) => T): T
  getState: () => BuilderState
  setState: (patch: Partial<BuilderState>) => void
  subscribe: (listener: Listener) => () => void
}

const listeners = new Set<Listener>()

function emit() {
  listeners.forEach(listener => listener())
}

function createId(prefix = 'project') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

let state: BuilderState

function setState(patch: Partial<BuilderState>) {
  state = { ...state, ...patch }
  emit()
}

const actions = {
  createProject(name = 'Untitled EtherForge Project'): BuilderProject {
    const now = Date.now()
    const project: BuilderProject = {
      id: createId('forge'),
      name,
      kind: 'poly-builder',
      createdAt: now,
      updatedAt: now,
      objects: []
    }
    setState({
      currentProject: project,
      projects: [project, ...state.projects]
    })
    return project
  },

  openProject(projectId: string): void {
    const project = state.projects.find(p => p.id === projectId) || null
    setState({ currentProject: project })
  },

  closeProject(): void {
    setState({ currentProject: null })
  },

  updateCurrentProject(patch: Partial<BuilderProject>): void {
    if (!state.currentProject) return
    const updated: BuilderProject = {
      ...state.currentProject,
      ...patch,
      updatedAt: Date.now()
    }
    setState({
      currentProject: updated,
      projects: state.projects.map(project => project.id === updated.id ? updated : project)
    })
  }
}

state = {
  currentProject: null,
  projects: [],
  ...actions
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const useBuilderStore = ((selector) => {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state)
  )
}) as UseBuilderStore

useBuilderStore.getState = () => state
useBuilderStore.setState = setState
useBuilderStore.subscribe = subscribe

export default useBuilderStore
