import { Section } from '../components/Section'
import { Frame } from '../demo/Frame'

const ROWS = ['微信公众号', '抖音', '小红书', '知乎']

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
            {ROWS.map((platform) => (
              <li
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-ink/12 px-5 py-4 last:border-b-0"
                key={platform}>
                <span className="flex items-center gap-3">
                  <span aria-hidden="true" className="inline-block size-2 rounded-full bg-vermilion" />
                  <span className="font-display text-lg font-black">{platform}</span>
                </span>
                <span className="text-[0.85rem]">
                  <span className="marker">自动创建草稿</span>
                </span>
              </li>
            ))}
          </ul>
        </Frame>
      </div>
    </Section>
  )
}
