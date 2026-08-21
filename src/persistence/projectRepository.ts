import type { ImageProject } from '@/types'
import { getDb } from './db'

export async function saveProject(project: ImageProject, originalBlob: Blob): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(['projects', 'originals'], 'readwrite')
  await tx.objectStore('projects').put(project)
  await tx.objectStore('originals').put(originalBlob, project.originalImageId)
  await tx.done
}

/** Most recently updated first. */
export async function listProjects(): Promise<ImageProject[]> {
  const db = await getDb()
  const projects = await db.getAllFromIndex('projects', 'by-updatedAt')
  return projects.toReversed()
}

export async function loadProjectOriginal(originalImageId: string): Promise<Blob | undefined> {
  const db = await getDb()
  return db.get('originals', originalImageId)
}

export async function deleteProject(project: ImageProject): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(['projects', 'originals'], 'readwrite')
  await tx.objectStore('projects').delete(project.id)
  await tx.objectStore('originals').delete(project.originalImageId)
  await tx.done
}
