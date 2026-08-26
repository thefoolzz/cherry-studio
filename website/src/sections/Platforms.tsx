import { Section } from '../components/Section'
import { Frame } from '../demo/Frame'

const ROWS = [
  { platform: '微信公众号', status: '就绪', draft: '自动创建草稿', ready: true },
  { platform: '抖音', status: '已绑定', draft: '自动建草稿开发中', ready: false },
  { platform: '小红书', status: '已绑定', draft: '自动建草稿开发中', ready: false },
  { platform: '知乎', status: '已绑定', draft: '自动建草稿开发中', ready: false }
]

export function Platforms() {
  return (
    <Section
      eyebrow="平台"
      id="platforms"
      lead="在弹出的登录窗口里扫码就绑好了，不用填 AppID 或 AppSecret。每个账号一份独立会话，互不串号。"
      title="现在能接的账号">
      <div className="mx-auto max-w-[640px]">
        <Frame badge="4 个平台" title="平台账号">
          <ul>
            {ROWS.map((row) => (
              <li
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-ink/12 px-5 py-4 last:border-b-0"
                key={row.platform}>
                <span className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={`inline-block size-2 rounded-full ${row.ready ? 'bg-vermilion' : 'bg-lead/50'}`}
                  />
                  <span className="font-display text-lg font-black">{row.platform}</span>
                  <span className="text-[0.7rem] text-lead">{row.status}</span>
                </span>
                <span className={`text-[0.85rem] ${row.ready ? '' : 'text-lead'}`}>
                  {row.ready ? <span className="marker">{row.draft}</span> : row.draft}
                </span>
              </li>
            ))}
          </ul>
        </Frame>
      </div>
    </Section>
  )
}
