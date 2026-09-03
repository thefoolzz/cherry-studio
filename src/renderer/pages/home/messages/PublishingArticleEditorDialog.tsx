import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Skeleton
} from '@cherrystudio/ui'
import { loggerService } from '@logger'
import RichEditor from '@renderer/components/RichEditor/RichEditor'
import { ipcApi } from '@renderer/ipc'
import { getImageBlobFromSource } from '@renderer/utils/image'
import { toSafeFileUrl } from '@shared/utils/file'
import { Save } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

const logger = loggerService.withContext('PublishingArticleEditorDialog')
const DISABLED_ARTICLE_EDITOR_COMMANDS = ['heading1', 'image', 'inlineMath'] as const
const ATTACHMENT_SOURCE_PATTERN = /attachment:\/\/([\w.-]+)/g

function replaceAttachmentSources(markdown: string, previewUrlById: ReadonlyMap<string, string>): string {
  return markdown.replace(ATTACHMENT_SOURCE_PATTERN, (source, id: string) => previewUrlById.get(id) ?? source)
}

function restoreAttachmentSources(markdown: string, sourceByPreviewUrl: ReadonlyMap<string, string>): string {
  let restored = markdown
  for (const [previewUrl, source] of sourceByPreviewUrl) {
    restored = restored.replaceAll(previewUrl, source)
  }
  return restored
}

export interface PublishingArticleDraft {
  title: string
  markdown: string
}

interface PublishingArticleEditorDialogProps {
  draft: PublishingArticleDraft
  onCancel: () => void
  onSave: (draft: PublishingArticleDraft) => Promise<void>
}

export function PublishingArticleEditorDialog({ draft, onCancel, onSave }: PublishingArticleEditorDialogProps) {
  const { t } = useTranslation()
  const [title, setTitle] = useState(draft.title)
  const [markdown, setMarkdown] = useState(draft.markdown)
  const [saving, setSaving] = useState(false)
  const attachmentIds = useMemo(
    () => [...new Set([...draft.markdown.matchAll(ATTACHMENT_SOURCE_PATTERN)].map((match) => match[1]))],
    [draft.markdown]
  )
  const [editorInitialMarkdown, setEditorInitialMarkdown] = useState<string | null>(() =>
    attachmentIds.length === 0 ? draft.markdown : null
  )
  const [sourceByPreviewUrl, setSourceByPreviewUrl] = useState<ReadonlyMap<string, string>>(new Map())
  const canSave = !saving && editorInitialMarkdown !== null && title.trim().length > 0 && markdown.trim().length > 0

  useEffect(() => {
    if (attachmentIds.length === 0) return

    let cancelled = false
    const objectUrls: string[] = []
    void ipcApi
      .request('file.batch_get_physical_paths', { ids: attachmentIds })
      .then(async (paths) => {
        const previews = await Promise.all(
          attachmentIds.map(async (id) => {
            const path = paths[id]
            if (!path) return null
            try {
              const blob = await getImageBlobFromSource(toSafeFileUrl(path, null))
              // An object URL keeps the edited document small; a data URL would inline the whole image
              // into the editor content and every markdown round trip.
              const previewUrl = URL.createObjectURL(blob)
              if (cancelled) {
                URL.revokeObjectURL(previewUrl)
                return null
              }
              objectUrls.push(previewUrl)
              return [id, previewUrl] as const
            } catch (error) {
              logger.warn('Failed to load publishing attachment preview', error as Error)
              return null
            }
          })
        )
        if (cancelled) return

        const previewUrlById = new Map(previews.flatMap((entry) => (entry ? [entry] : [])))
        setSourceByPreviewUrl(
          new Map([...previewUrlById].map(([id, previewUrl]) => [previewUrl, `attachment://${id}`]))
        )
        setEditorInitialMarkdown(replaceAttachmentSources(draft.markdown, previewUrlById))
      })
      .catch((error) => {
        if (cancelled) return
        logger.warn('Failed to resolve publishing attachment previews', error as Error)
        setEditorInitialMarkdown(draft.markdown)
      })

    return () => {
      cancelled = true
      for (const objectUrl of objectUrls) URL.revokeObjectURL(objectUrl)
      objectUrls.length = 0
    }
  }, [attachmentIds, draft.markdown])

  const handleMarkdownChange = useCallback(
    (nextMarkdown: string) => setMarkdown(restoreAttachmentSources(nextMarkdown, sourceByPreviewUrl)),
    [sourceByPreviewUrl]
  )

  const handleSave = useCallback(async () => {
    if (!canSave) return
    setSaving(true)
    try {
      await onSave({ title: title.trim(), markdown: markdown.trim() })
    } finally {
      setSaving(false)
    }
  }, [canSave, markdown, onSave, title])

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onCancel()}>
      <DialogContent
        closeOnOverlayClick={false}
        className="h-[min(780px,calc(100vh-2rem))] max-h-[calc(100vh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-[960px]">
        <DialogHeader className="border-border-subtle border-b px-6 py-5 pr-12">
          <DialogTitle>{t('chat.publishing.editor.title')}</DialogTitle>
          <DialogDescription>{t('chat.publishing.editor.description')}</DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 min-w-0 flex-col gap-4 overflow-hidden px-6 py-5">
          <div className="min-w-0 shrink-0">
            <Label htmlFor="publishing-article-editor-title" className="mb-1.5 text-muted-foreground text-xs">
              {t('chat.publishing.dialog.article_title')}
            </Label>
            <Input
              id="publishing-article-editor-title"
              autoFocus
              disabled={saving}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5">
            <span className="shrink-0 text-muted-foreground text-xs">{t('chat.publishing.editor.content')}</span>
            {editorInitialMarkdown === null ? (
              <div role="status" aria-live="polite" className="space-y-3 rounded-md border border-border-subtle p-4">
                <span className="sr-only">{t('common.loading')}</span>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : (
              <RichEditor
                initialContent={editorInitialMarkdown}
                onMarkdownChange={handleMarkdownChange}
                placeholder={t('chat.publishing.editor.placeholder')}
                ariaLabel={t('chat.publishing.editor.content')}
                className="min-h-0 flex-1 overflow-hidden"
                autoFocus={false}
                editable={!saving}
                enableImageInsertion={false}
                disabledCommands={DISABLED_ARTICLE_EDITOR_COMMANDS}
                showToolbar
                isFullWidth
              />
            )}
          </div>
        </div>

        <DialogFooter className="border-border-subtle border-t px-6 py-4">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => void handleSave()} disabled={!canSave} loading={saving}>
            <Save size={14} />
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
