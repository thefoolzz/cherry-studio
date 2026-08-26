import { Section } from '../components/Section'
import { Frame } from '../demo/Frame'
import { Article, Checks } from '../demo/parts'
import { useInView } from '../hooks/useInView'

export function Proof() {
  const [ref, inView] = useInView<HTMLDivElement>()

  return (
    <Section
      eyebrow="不编造"
      id="proof"
      lead="价格、时间、地点、规格、联系方式，只用你提供或已经核实的信息。缺的集中列在文末，不在正文里留占位符。"
      title={
        <>
          你没给的，
          <span className="marker">它不写</span>。
        </>
      }>
      <div className="mx-auto max-w-[640px]" ref={ref}>
        <Frame badge="红笔 = 你没给的信息" title="母稿 · 校样">
          <div className="px-5 py-6 md:px-7 md:py-7">
            <Article drawn={inView} struck />
            <Checks />
          </div>
        </Frame>
      </div>
    </Section>
  )
}
