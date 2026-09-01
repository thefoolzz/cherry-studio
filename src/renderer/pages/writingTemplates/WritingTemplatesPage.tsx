import {
  Badge,
  Button,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  PageHeader,
  Scrollbar,
  Switch,
  Textarea
} from '@cherrystudio/ui'
import { useMutation, useQuery } from '@data/hooks/useDataApi'
import { loggerService } from '@logger'
import { toast } from '@renderer/services/toast'
import type {
  PublishingTemplate,
  PublishingTemplateBlueprint,
  PublishingTemplateSection,
  PublishingTemplateVariable
} from '@shared/data/types/publishing'
import { BookOpenText, ExternalLink, PencilLine, Plus, Trash2 } from 'lucide-react'
import { type Dispatch, type SetStateAction, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

const logger = loggerService.withContext('WritingTemplatesPage')
const EMPTY_TEMPLATES: readonly PublishingTemplate[] = Object.freeze([])
const SOURCE_LABEL_KEYS = {
  generated: 'writing_templates.source.generated',
  pasted: 'writing_templates.source.pasted',
  url: 'writing_templates.source.url'
} as const

interface TemplateForm {
  id?: string
  name: string
  description: string
  sourceType: PublishingTemplate['sourceType']
  sourceTitle?: string
  sourceUrl?: string
  blueprint: PublishingTemplateBlueprint
}

const listToText = (items: string[]) => items.join('\n')
const textToList = (value: string) =>
  value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)

function emptyForm(defaultContentType: string): TemplateForm {
  return {
    name: '',
    description: '',
    sourceType: 'pasted',
    blueprint: {
      contentType: defaultContentType,
      summary: '',
      voice: [],
      structure: [{ role: '', guidance: '', required: true }],
      writingRules: [],
      avoid: [],
      variables: [],
      qualityChecks: []
    }
  }
}

function templateToForm(template: PublishingTemplate): TemplateForm {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    sourceType: template.sourceType,
    sourceTitle: template.sourceTitle,
    sourceUrl: template.sourceUrl,
    blueprint: structuredClone(template.blueprint)
  }
}

function isValidForm(form: TemplateForm): boolean {
  return Boolean(
    form.name.trim() &&
      form.description.trim() &&
      form.blueprint.contentType.trim() &&
      form.blueprint.summary.trim() &&
      form.blueprint.structure.length > 0 &&
      form.blueprint.structure.every((section) => section.role.trim() && section.guidance.trim()) &&
      form.blueprint.variables.every((variable) => variable.name.trim() && variable.description.trim())
  )
}

function TemplateEditor({
  form,
  setForm
}: {
  form: TemplateForm
  setForm: Dispatch<SetStateAction<TemplateForm | null>>
}) {
  const { t } = useTranslation()
  const updateBlueprint = (updates: Partial<PublishingTemplateBlueprint>) =>
    setForm((current) => (current ? { ...current, blueprint: { ...current.blueprint, ...updates } } : current))
  const updateSection = (index: number, updates: Partial<PublishingTemplateSection>) =>
    updateBlueprint({
      structure: form.blueprint.structure.map((section, itemIndex) =>
        itemIndex === index ? { ...section, ...updates } : section
      )
    })
  const updateVariable = (index: number, updates: Partial<PublishingTemplateVariable>) =>
    updateBlueprint({
      variables: form.blueprint.variables.map((variable, itemIndex) =>
        itemIndex === index ? { ...variable, ...updates } : variable
      )
    })

  return (
    <div className="grid gap-5 py-2">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 font-medium text-sm">
          {t('common.name')}
          <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </label>
        <label className="grid gap-2 font-medium text-sm">
          {t('writing_templates.content_type')}
          <Input
            value={form.blueprint.contentType}
            onChange={(event) => updateBlueprint({ contentType: event.target.value })}
          />
        </label>
      </div>

      <label className="grid gap-2 font-medium text-sm">
        {t('common.description')}
        <Textarea.Input
          rows={2}
          value={form.description}
          onValueChange={(description) => setForm({ ...form, description })}
        />
      </label>

      <label className="grid gap-2 font-medium text-sm">
        {t('writing_templates.strategy_summary')}
        <Textarea.Input
          rows={3}
          value={form.blueprint.summary}
          onValueChange={(summary) => updateBlueprint({ summary })}
        />
      </label>

      <label className="grid gap-2 font-medium text-sm">
        {t('writing_templates.voice')}
        <Textarea.Input
          rows={4}
          value={listToText(form.blueprint.voice)}
          onValueChange={(value) => updateBlueprint({ voice: textToList(value) })}
          placeholder={t('writing_templates.one_per_line')}
        />
      </label>

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-medium text-sm">{t('writing_templates.structure')}</h3>
            <p className="text-muted-foreground text-xs">{t('writing_templates.structure_hint')}</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              updateBlueprint({
                structure: [...form.blueprint.structure, { role: '', guidance: '', required: false }]
              })
            }>
            <Plus size={14} />
            {t('writing_templates.add_section')}
          </Button>
        </div>
        {form.blueprint.structure.map((section, index) => (
          <div key={`${index}-${section.role}`} className="grid gap-3 rounded-lg border border-border-subtle p-3">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
              <Input
                aria-label={t('writing_templates.section_role')}
                placeholder={t('writing_templates.section_role')}
                value={section.role}
                onChange={(event) => updateSection(index, { role: event.target.value })}
              />
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={section.required} onCheckedChange={(required) => updateSection(index, { required })} />
                {t('writing_templates.required')}
              </label>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={t('writing_templates.remove_section')}
                disabled={form.blueprint.structure.length === 1}
                onClick={() =>
                  updateBlueprint({ structure: form.blueprint.structure.filter((_, itemIndex) => itemIndex !== index) })
                }>
                <Trash2 size={14} />
              </Button>
            </div>
            <Textarea.Input
              rows={2}
              aria-label={t('writing_templates.section_guidance')}
              placeholder={t('writing_templates.section_guidance')}
              value={section.guidance}
              onValueChange={(guidance) => updateSection(index, { guidance })}
            />
          </div>
        ))}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 font-medium text-sm">
          {t('writing_templates.writing_rules')}
          <Textarea.Input
            rows={5}
            value={listToText(form.blueprint.writingRules)}
            onValueChange={(value) => updateBlueprint({ writingRules: textToList(value) })}
            placeholder={t('writing_templates.one_per_line')}
          />
        </label>
        <label className="grid gap-2 font-medium text-sm">
          {t('writing_templates.avoid')}
          <Textarea.Input
            rows={5}
            value={listToText(form.blueprint.avoid)}
            onValueChange={(value) => updateBlueprint({ avoid: textToList(value) })}
            placeholder={t('writing_templates.one_per_line')}
          />
        </label>
      </div>

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-medium text-sm">{t('writing_templates.variables')}</h3>
            <p className="text-muted-foreground text-xs">{t('writing_templates.variables_hint')}</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              updateBlueprint({
                variables: [...form.blueprint.variables, { name: '', description: '', required: false }]
              })
            }>
            <Plus size={14} />
            {t('writing_templates.add_variable')}
          </Button>
        </div>
        {form.blueprint.variables.map((variable, index) => (
          <div
            key={`${index}-${variable.name}`}
            className="grid gap-3 rounded-lg border border-border-subtle p-3 sm:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)_auto_auto] sm:items-center">
            <Input
              aria-label={t('writing_templates.variable_name')}
              placeholder={t('writing_templates.variable_name')}
              value={variable.name}
              onChange={(event) => updateVariable(index, { name: event.target.value })}
            />
            <Input
              aria-label={t('writing_templates.variable_description')}
              placeholder={t('writing_templates.variable_description')}
              value={variable.description}
              onChange={(event) => updateVariable(index, { description: event.target.value })}
            />
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={variable.required} onCheckedChange={(required) => updateVariable(index, { required })} />
              {t('writing_templates.required')}
            </label>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={t('writing_templates.remove_variable')}
              onClick={() =>
                updateBlueprint({ variables: form.blueprint.variables.filter((_, itemIndex) => itemIndex !== index) })
              }>
              <Trash2 size={14} />
            </Button>
          </div>
        ))}
      </section>

      <label className="grid gap-2 font-medium text-sm">
        {t('writing_templates.quality_checks')}
        <Textarea.Input
          rows={4}
          value={listToText(form.blueprint.qualityChecks)}
          onValueChange={(value) => updateBlueprint({ qualityChecks: textToList(value) })}
          placeholder={t('writing_templates.one_per_line')}
        />
      </label>
    </div>
  )
}

export default function WritingTemplatesPage() {
  const { t, i18n } = useTranslation()
  const [form, setForm] = useState<TemplateForm | null>(null)
  const [deleteTemplate, setDeleteTemplate] = useState<PublishingTemplate | null>(null)
  const { data, isLoading } = useQuery('/publishing-templates', { query: { limit: 200 } })
  const { trigger: createTemplate, isLoading: isCreating } = useMutation('POST', '/publishing-templates', {
    refresh: ['/publishing-templates']
  })
  const { trigger: updateTemplate, isLoading: isUpdating } = useMutation('PATCH', '/publishing-templates/:id', {
    refresh: ['/publishing-templates']
  })
  const { trigger: removeTemplate, isLoading: isDeleting } = useMutation('DELETE', '/publishing-templates/:id', {
    refresh: ['/publishing-templates']
  })
  const templates = data?.items ?? EMPTY_TEMPLATES
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }),
    [i18n.language]
  )
  const saving = isCreating || isUpdating

  const handleSave = async () => {
    if (!form || !isValidForm(form)) return
    const body = {
      name: form.name.trim(),
      description: form.description.trim(),
      sourceType: form.sourceType,
      ...(form.sourceTitle ? { sourceTitle: form.sourceTitle } : {}),
      ...(form.sourceUrl ? { sourceUrl: form.sourceUrl } : {}),
      blueprint: form.blueprint
    }
    try {
      if (form.id) {
        await updateTemplate({ params: { id: form.id }, body })
      } else {
        await createTemplate({ body })
      }
      setForm(null)
      toast.success(t('writing_templates.saved'))
    } catch (error) {
      logger.error('Failed to save writing template', error as Error)
      toast.error(error instanceof Error ? error.message : t('common.save_failed'))
    }
  }

  const handleDelete = async () => {
    if (!deleteTemplate) return
    try {
      await removeTemplate({ params: { id: deleteTemplate.id } })
      setDeleteTemplate(null)
      toast.success(t('writing_templates.deleted'))
    } catch (error) {
      logger.error('Failed to delete writing template', error as Error)
      toast.error(error instanceof Error ? error.message : t('common.delete_failed'))
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <PageHeader
        bordered
        title={t('writing_templates.title')}
        action={
          <Button onClick={() => setForm(emptyForm(t('writing_templates.default_content_type')))}>
            <Plus size={14} />
            {t('writing_templates.new')}
          </Button>
        }
      />

      <Scrollbar className="min-h-0 flex-1">
        <main className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-5 px-5 py-5">
          <div>
            <h1 className="font-semibold text-foreground text-lg">{t('writing_templates.library_title')}</h1>
            <p className="mt-1 text-muted-foreground text-sm">{t('writing_templates.subtitle')}</p>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-muted-foreground text-sm">{t('common.loading')}</div>
          ) : templates.length === 0 ? (
            <EmptyState
              icon={BookOpenText}
              title={t('writing_templates.empty_title')}
              description={t('writing_templates.empty_description')}
              actionLabel={t('writing_templates.new')}
              onAction={() => setForm(emptyForm(t('writing_templates.default_content_type')))}
            />
          ) : (
            <div className="grid min-w-0 gap-3 md:grid-cols-2">
              {templates.map((template) => (
                <article
                  key={template.id}
                  className="flex min-w-0 flex-col gap-4 rounded-lg border border-border-subtle bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <h2 className="max-w-full truncate font-medium text-foreground">{template.name}</h2>
                        <Badge
                          className="max-w-full justify-start"
                          variant="secondary"
                          title={template.blueprint.contentType}>
                          <span className="min-w-0 truncate">{template.blueprint.contentType}</span>
                        </Badge>
                      </div>
                      <p className="mt-2 line-clamp-2 text-muted-foreground text-sm">{template.description}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={t('writing_templates.edit_action', { name: template.name })}
                        onClick={() => setForm(templateToForm(template))}>
                        <PencilLine size={14} />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={t('writing_templates.delete_action', { name: template.name })}
                        onClick={() => setDeleteTemplate(template)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-border-subtle border-t pt-3 text-muted-foreground text-xs">
                    <span>{t(SOURCE_LABEL_KEYS[template.sourceType])}</span>
                    <span>{t('writing_templates.section_count', { count: template.blueprint.structure.length })}</span>
                    <span>{dateFormatter.format(new Date(template.updatedAt))}</span>
                    {template.sourceUrl ? (
                      <a
                        href={template.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-auto inline-flex items-center gap-1 text-link hover:underline">
                        <ExternalLink size={12} />
                        {t('writing_templates.source_link')}
                      </a>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>
      </Scrollbar>

      <Dialog open={form !== null} onOpenChange={(open) => !open && !saving && setForm(null)}>
        <DialogContent aria-describedby={undefined} className="flex max-h-[88vh] flex-col sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {form?.id ? t('writing_templates.edit_title') : t('writing_templates.create_title')}
            </DialogTitle>
            <DialogDescription>{t('writing_templates.editor_description')}</DialogDescription>
          </DialogHeader>
          <Scrollbar className="min-h-0 flex-1 pr-3">
            {form ? <TemplateEditor form={form} setForm={setForm} /> : null}
          </Scrollbar>
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setForm(null)}>
              {t('common.cancel')}
            </Button>
            <Button loading={saving} disabled={!form || !isValidForm(form)} onClick={() => void handleSave()}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTemplate !== null}
        onOpenChange={(open) => !open && setDeleteTemplate(null)}
        title={t('writing_templates.delete_title')}
        description={t('writing_templates.delete_description', { name: deleteTemplate?.name ?? '' })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        destructive
        confirmLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  )
}
