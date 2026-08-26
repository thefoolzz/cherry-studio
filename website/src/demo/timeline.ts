/** 演示时间轴：每一步的时长（毫秒）与文案。案例取自真实运行结果，不夸大能力。 */
export const STEPS = [
  { key: 'ask', label: '提问', duration: 3600 },
  { key: 'think', label: '理解', duration: 2800 },
  { key: 'draft', label: '成稿', duration: 3600 },
  { key: 'proof', label: '校样', duration: 3000 },
  { key: 'publish', label: '建草稿', duration: 4200 }
] as const

export type StepKey = (typeof STEPS)[number]['key']

export const PROMPT = '写一篇海南 ID.4 旅行租车的公众号推文，配一张傍晚出行的实拍图。价格和取车门店还没定，别编。'

export const TRACE = ['已理解目标与受众', '已联网核实公开信息', '已生成封面图 1 张', '已生成母稿 · 2 处待确认']

export const ARTICLE = {
  title: '在海南，用一辆 ID.4 慢慢开',
  paragraphs: [
    '早上睡到自然醒，再决定今天去哪里。',
    '下午沿着海边慢慢开，看到喜欢的风景就停下来；傍晚等一场落日，再从容返回住宿地。'
  ],
  heading: '这些人，尤其适合自驾',
  tail: '它更像一个安静可靠的移动空间：放得下行李，也容得下临时改变的计划。'
}

/** 校样一节里被划掉的内容：这些是用户没提供的信息，模型不会替他编。 */
export const FABRICATED = ['日租 299 元起', '美兰机场店']

export const CHECKS = ['日租价格与押金规则', '取还车门店与接送方式']

export const ACCOUNT = { name: '晨微示例号', platform: '微信公众号' }

export const TASK_STATES = ['已就绪', '打开公众号后台', '上传配图', '创建草稿']
