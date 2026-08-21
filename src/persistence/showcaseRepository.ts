import type { ShowcaseProject } from '@/types'
import { getDb } from './db'

export async function saveShowcase(showcase: ShowcaseProject): Promise<void> {
  const db = await getDb()
  await db.put('showcases', showcase)
}

/** One showcase per source project for the MVP — the first (only) match wins. */
export async function loadShowcaseByProjectId(
  projectId: string,
): Promise<ShowcaseProject | undefined> {
  const db = await getDb()
  const matches = await db.getAllFromIndex('showcases', 'by-projectId', projectId)
  return matches[0]
}

export async function deleteShowcase(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('showcases', id)
}
