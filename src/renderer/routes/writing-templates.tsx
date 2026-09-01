import WritingTemplatesPage from '@renderer/pages/writingTemplates/WritingTemplatesPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/writing-templates')({
  component: WritingTemplatesPage
})
