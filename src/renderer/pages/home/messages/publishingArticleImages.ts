const ATTACHMENT_IMAGE_PATTERN = /!\[[^\]]*\]\(attachment:\/\/([\w.-]+)\)/g

export function getEmbeddedImageFileIds(markdown: string): string[] {
  return [...new Set([...markdown.matchAll(ATTACHMENT_IMAGE_PATTERN)].map((match) => match[1]))]
}

export function embedPublishingImages(markdown: string, imageFileIds: string[]): string {
  const uniqueIds = [...new Set(imageFileIds)]
  let generatedReferenceIndex = 0
  const normalizedMarkdown = markdown.replace(ATTACHMENT_IMAGE_PATTERN, (reference, referencedId: string) => {
    const matchedId = uniqueIds.find((id) => referencedId === id || referencedId.endsWith(id))
    if (!matchedId) return reference
    const generatedId = uniqueIds[generatedReferenceIndex] ?? matchedId
    generatedReferenceIndex += 1
    return generatedId ? reference.replace(`attachment://${referencedId}`, `attachment://${generatedId}`) : reference
  })
  const embeddedIds = new Set(getEmbeddedImageFileIds(normalizedMarkdown))
  if (uniqueIds.every((id) => embeddedIds.has(id))) return normalizedMarkdown

  const blocks = normalizedMarkdown.trim().split(/\n{2,}/)
  if (blocks.length === 0) return normalizedMarkdown

  const titleIndex = blocks.findIndex((block) => /^#\s+/.test(block))
  const contentIndices = blocks.flatMap((block, index) =>
    /^#{1,6}\s+/.test(block) || /^!\[[^\]]*\]\(/.test(block) ? [] : [index]
  )
  const insertAfter = new Map<number, string[]>()

  const addAfter = (blockIndex: number, image: string) => {
    insertAfter.set(blockIndex, [...(insertAfter.get(blockIndex) ?? []), image])
  }

  uniqueIds.forEach((id, index) => {
    if (embeddedIds.has(id)) return

    const image = index === 0 ? `![Cover image](attachment://${id})` : `![Article image ${index}](attachment://${id})`
    if (index === 0) {
      addAfter(titleIndex, image)
      return
    }

    const targetOffset = Math.min(
      contentIndices.length - 1,
      Math.max(0, Math.round((index / uniqueIds.length) * Math.max(0, contentIndices.length - 1)))
    )
    addAfter(contentIndices[targetOffset] ?? blocks.length - 1, image)
  })

  const result = [...(insertAfter.get(-1) ?? [])]
  blocks.forEach((block, index) => {
    result.push(block, ...(insertAfter.get(index) ?? []))
  })
  return result.join('\n\n')
}
