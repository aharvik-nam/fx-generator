import JSZip from 'jszip'
import type { ImageProject } from '@/types'
import { exportImage, stripExtension } from './imageExport'
import { generateRecipeMarkdown } from './recipeGenerator'

export type ZipExportOptions = {
  sourceBitmap: ImageBitmap
  originalFile: File
  project: ImageProject
}

export type ZipExportResult = { blob: Blob; filename: string }

/** Bundles the rendered image, recipe.md, and project.json (the full project for later reload). */
export async function buildProjectZip(options: ZipExportOptions): Promise<ZipExportResult> {
  const { sourceBitmap, originalFile, project } = options

  const imageResult = await exportImage({
    sourceBitmap,
    originalFile,
    effects: project.effects,
    settings: project.exportSettings,
    baseName: project.name,
  })

  const recipeMarkdown = generateRecipeMarkdown(project)

  const zip = new JSZip()
  zip.file(imageResult.filename, imageResult.blob)
  zip.file('recipe.md', recipeMarkdown)
  zip.file('project.json', JSON.stringify(project, null, 2))

  const blob = await zip.generateAsync({ type: 'blob' })
  return { blob, filename: `${stripExtension(project.name)}-fx-package.zip` }
}
