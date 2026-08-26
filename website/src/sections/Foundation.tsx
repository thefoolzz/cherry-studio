import { Section } from '../components/Section'

const ITEMS = [
  { label: '自动配图', body: '封面图和正文插图一起生成，按语义插到该在的位置。' },
  { label: '联网核实', body: '写稿前先去查，事实不靠印象凑。' },
  { label: '多模型', body: '云端和本地模型都能接，写稿用哪个由你定。' },
  { label: '知识库', body: '把产品资料、活动规则喂进去，稿子有底。' },
  { label: '逐篇编辑', body: '改标题或正文只作用于当前这一篇。' },
  { label: '三端桌面', body: 'Windows、macOS、Linux，本地运行。' }
]

export function Foundation() {
  return (
    <Section eyebrow="还有这些" title="写稿之外的部分">
      <dl className="mx-auto grid max-w-[820px] gap-x-12 gap-y-7 text-left sm:grid-cols-2">
        {ITEMS.map((item) => (
          <div className="border-t border-ink/25 pt-4" key={item.label}>
            <dt className="mono-label">{item.label}</dt>
            <dd className="mt-2 text-[0.95rem] leading-relaxed">{item.body}</dd>
          </div>
        ))}
      </dl>
    </Section>
  )
}
