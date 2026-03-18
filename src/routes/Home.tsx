import { Link } from 'react-router-dom'
import MathText from '../components/MathText'
import { curriculum, getAvailableTopics } from '../data/curriculum'
import {
  getCategoryMark,
  getSectionMark,
  getTopicMark,
  hexToRgbString,
} from '../lib/topicMarks'

function FeatureCard({
  title,
  body,
  value,
}: {
  title: string
  body: string
  value: string
}) {
  return (
    <div className="metric-tile">
      <div className="panel-caption">{title}</div>
      <div className="metric-value mt-4 text-[var(--color-ink)]">{value}</div>
      <p className="mt-3 text-[14px] leading-6 text-[var(--color-ink-soft)]">{body}</p>
    </div>
  )
}

export default function Home() {
  const availableTopics = getAvailableTopics()
  const availableCount = availableTopics.length
  const totalTopics = curriculum.flatMap(section =>
    section.categories.flatMap(category => category.topics),
  ).length
  const sectionHighlights = curriculum.map(section => {
    const topics = section.categories.flatMap(category => category.topics).filter(topic => topic.available)

    return {
      id: section.id,
      title: section.title,
      mark: getSectionMark(section.id, section.title),
      count: topics.length,
      color: topics[0]?.color ?? '#8e3928',
      categories: section.categories,
      topics,
      summary: section.categories.map(category => category.title).join(' · '),
    }
  })

  return (
    <div className="space-y-8 pb-8">
      <section className="home-hero lab-shell paper-grid grain relative overflow-hidden rounded-[2rem] px-6 py-8 sm:px-10 sm:py-12">
        <div className="grid gap-8 xl:grid-cols-[0.98fr_1.02fr] xl:items-stretch">
          <div className="max-w-[720px]">
            <div className="section-eyebrow">Visual Physics For Gaokao</div>
            <h1 className="display-title mt-6 text-[clamp(3.2rem,8vw,6.8rem)] leading-[0.88] text-[var(--color-ink)]">
              把物理
              <br />
              从答案
              <br />
              变成过程
            </h1>
            <p className="mt-5 max-w-[640px] text-[16px] leading-8 text-[var(--color-ink-soft)] sm:text-[18px]">
              这里不是把题目做成一张“会动的海报”，而是把公式背后的过程拆成学生能拖、能看、能验证的实验室。
              从运动学到电磁学，参数变化、图像变化和结论变化会被放在同一屏里。
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <FeatureCard
                title="已开放实验"
                value={`${availableCount}`}
                body="18 个交互实验已全部接入，可直接用于录屏、讲题和课堂演示。"
              />
              <FeatureCard
                title="课程节点"
                value={`${totalTopics}`}
                body="课程树保持完整结构，方便你继续扩展，也方便学生理解知识图谱。"
              />
              <FeatureCard
                title="真题互动"
                value="01"
                body="离子注入题单独拆成“题目 + 解析 + 实验”同屏页面。"
              />
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/experiment/pendulum" className="primary-button">
                进入实验室
              </Link>
              <Link to="/challenge/ion-injection" className="secondary-button">
                打开真题交互页
              </Link>
              <button
                type="button"
                onClick={() =>
                  document.getElementById('curriculum')?.scrollIntoView({ behavior: 'smooth' })
                }
                className="secondary-button cursor-pointer border-0"
              >
                查看知识框架
              </button>
            </div>
          </div>

          <div className="home-hero-board lab-panel rounded-[1.8rem] p-6 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="panel-caption">How Students Read It</div>
                <h2 className="display-title mt-3 text-[2.1rem] leading-tight text-[var(--color-ink)]">
                  一眼先看现象
                  <br />
                  然后自己推结论
                </h2>
              </div>
              <div className="topic-tag text-[var(--color-accent-blue)]">参数联动 + 图像联动</div>
            </div>

            <div className="paper-rule mt-5" />

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {sectionHighlights.slice(0, 4).map(section => (
                <div
                  key={section.id}
                  className="home-signal-card rounded-[1.25rem] p-4"
                  style={{ '--signal-color': section.color } as React.CSSProperties}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div
                      className="badge-mark"
                      style={{ backgroundColor: hexToRgbString(section.color, 0.12) }}
                    >
                      {section.mark}
                    </div>
                    <div className="mono-data text-[13px] font-semibold text-[var(--color-ink-soft)]">
                      {section.count} topics
                    </div>
                  </div>
                  <h3 className="mt-4 text-[18px] font-semibold text-[var(--color-ink)]">
                    {section.title}
                  </h3>
                  <p className="mt-2 text-[13px] leading-6 text-[var(--color-ink-soft)]">
                    {section.summary}
                  </p>
                </div>
              ))}
            </div>

            <div className="paper-rule mt-5" />

            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              <Link to="/experiment/wave" className="topic-card lab-shell rounded-[1.2rem] p-4 no-underline">
                <div className="panel-caption">Wave Demo</div>
                <div className="mt-3 text-[18px] font-semibold text-[var(--color-ink)]">看波怎么传</div>
                <p className="mt-2 text-[13px] leading-6 text-[var(--color-ink-soft)]">
                  振幅、频率、波速一起变，学生能直接观察波形和图像联动。
                </p>
              </Link>
              <Link to="/experiment/collision" className="topic-card lab-shell rounded-[1.2rem] p-4 no-underline">
                <div className="panel-caption">Momentum Demo</div>
                <div className="mt-3 text-[18px] font-semibold text-[var(--color-ink)]">看量守恒</div>
                <p className="mt-2 text-[13px] leading-6 text-[var(--color-ink-soft)]">
                  直接拖质量和速度，碰撞前后动量、动能变化一眼就能看懂。
                </p>
              </Link>
              <Link to="/challenge/ion-injection" className="topic-card lab-shell rounded-[1.2rem] p-4 no-underline">
                <div className="panel-caption">Exam Visualizer</div>
                <div className="mt-3 text-[18px] font-semibold text-[var(--color-ink)]">看题怎么解</div>
                <p className="mt-2 text-[13px] leading-6 text-[var(--color-ink-soft)]">
                  题干、公式推导、磁分析器实验室放在同一屏里，适合讲题录屏。
                </p>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="lab-panel rounded-[1.8rem] p-6 sm:p-8">
          <div className="panel-caption">Open Modules</div>
          <h2 className="display-title mt-4 text-[2.2rem] text-[var(--color-ink)]">已开放实验</h2>
          <div className="paper-rule mt-4" />
          <p className="mt-4 max-w-[680px] text-[15px] leading-7 text-[var(--color-ink-soft)]">
            这里先按学科大块给学生建立心智地图，再进入具体实验。比起把 18 张小卡片平铺在一起，这种排法更容易知道自己该点哪里。
          </p>

          <div className="mt-6 grid gap-4">
            {sectionHighlights.map(section => (
              <div key={section.id} className="home-section-card rounded-[1.4rem] p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="badge-mark"
                      style={{ backgroundColor: hexToRgbString(section.color, 0.12) }}
                    >
                      {section.mark}
                    </div>
                    <div>
                      <h3 className="text-[20px] font-semibold text-[var(--color-ink)]">
                        {section.title}
                      </h3>
                      <div className="text-[13px] leading-6 text-[var(--color-ink-soft)]">
                        {section.summary}
                      </div>
                    </div>
                  </div>
                  <div className="topic-tag w-fit" style={{ color: section.color }}>
                    {section.count} 个可交互知识点
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2.5">
                  {section.topics.map(topic => (
                    <Link
                      key={topic.id}
                      to={`/experiment/${topic.id}`}
                      className="home-topic-pill"
                      style={{ '--topic-color': topic.color } as React.CSSProperties}
                    >
                      <span
                        className="badge-mark h-9 min-w-9 px-0 text-[12px]"
                        style={{ backgroundColor: hexToRgbString(topic.color, 0.12) }}
                      >
                        {getTopicMark(topic.id, topic.title)}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[14px] font-medium text-[var(--color-ink)]">
                          {topic.title}
                        </span>
                        <span className="block text-[12px] text-[var(--color-ink-soft)]">
                          {topic.description}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lab-panel rounded-[1.8rem] p-6 sm:p-8">
          <div className="panel-caption">Featured Challenge</div>
          <h2 className="display-title mt-4 text-[2.2rem] text-[var(--color-ink)]">真题可视化</h2>
          <div className="paper-rule mt-4" />
          <div className="mt-6 space-y-5">
            <div className="rounded-[1.5rem] border border-[rgba(64,52,36,0.08)] bg-[rgba(255,255,255,0.5)] p-5">
              <div className="flex items-start gap-4">
                <div className="badge-mark bg-[rgba(49,92,168,0.08)]">ION</div>
                <div>
                  <h3 className="display-title text-[2rem] leading-tight text-[var(--color-ink)]">
                    离子注入磁分析器
                  </h3>
                  <p className="mt-2 text-[15px] leading-7 text-[var(--color-ink-soft)]">
                    这页把题干、关键计算和磁场轨迹实验放在同一屏里。学生既能读懂
                    <MathText math={String.raw`r_1 = 2r`} className="math-inline" />、
                    <MathText math={String.raw`r_2 = \frac{14\sqrt{11}}{11}r`} className="math-inline" /> 的来源，也能直接验证 BF₂⁺
                    为什么进不了晶圆。
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="formula-chip px-4 py-4">
                  <div className="panel-caption">速度比</div>
                  <div className="mt-3 text-[22px] font-semibold text-[var(--color-ink)]">
                    <MathText math={String.raw`7 : \sqrt{11}`} className="math-inline" />
                  </div>
                </div>
                <div className="formula-chip px-4 py-4">
                  <div className="panel-caption">题设半径</div>
                  <div className="mt-3 text-[22px] font-semibold text-[var(--color-ink)]">
                    <MathText math={String.raw`r_1 = 2r`} className="math-inline" />
                  </div>
                </div>
                <div className="formula-chip px-4 py-4">
                  <div className="panel-caption">最终结论</div>
                  <div className="mt-3 text-[22px] font-semibold text-[var(--color-accent-green)]">
                    BF₂⁺ 不入晶圆
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="topic-card lab-shell rounded-[1.25rem] p-4">
                <div className="panel-caption">Part 1</div>
                <p className="mt-3 text-[14px] leading-6 text-[var(--color-ink)]">
                  同一加速电压下比较两种离子的入射速度。
                </p>
              </div>
              <div className="topic-card lab-shell rounded-[1.25rem] p-4">
                <div className="panel-caption">Part 2</div>
                <p className="mt-3 text-[14px] leading-6 text-[var(--color-ink)]">
                  根据 B⁺ 的命中条件反推磁场强度。
                </p>
              </div>
              <div className="topic-card lab-shell rounded-[1.25rem] p-4">
                <div className="panel-caption">Part 3</div>
                <p className="mt-3 text-[14px] leading-6 text-[var(--color-ink)]">
                  动态检查 BF₂⁺ 是否会从 <MathText math={String.raw`cd`} className="math-inline" /> 边射出并进入晶圆。
                </p>
              </div>
            </div>

            <Link to="/challenge/ion-injection" className="primary-button mt-1 w-fit">
              进入题目交互页
            </Link>
          </div>
        </div>
      </section>

      <section id="curriculum" className="lab-panel rounded-[1.8rem] px-6 py-8 sm:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="section-eyebrow">Curriculum Map</div>
            <h2 className="display-title mt-5 text-[clamp(2.2rem,5vw,3.6rem)] leading-tight">
              知识框架
            </h2>
          </div>
          <p className="max-w-[520px] text-[15px] leading-7 text-[var(--color-ink-soft)]">
            当前重点是“最适合做可视化演示”的模块。首页保持完整课程树，便于你继续往下扩内容，也便于视频里展示选题逻辑。
          </p>
        </div>

        <div className="mt-8 grid gap-4 xl:grid-cols-2">
          {curriculum.map(section => (
            <div key={section.id} className="curriculum-shell rounded-[1.6rem] p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="badge-mark bg-[rgba(142,57,40,0.08)]">
                    {getSectionMark(section.id, section.title)}
                  </div>
                  <div>
                    <h3 className="text-[22px] font-semibold text-[var(--color-ink)]">
                      {section.title}
                    </h3>
                    <div className="text-[12px] uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">
                      {section.categories.length} 个知识分组
                    </div>
                  </div>
                </div>
                <div className="topic-tag w-fit text-[var(--color-accent-green)]">
                  已开放 {section.categories.flatMap(item => item.topics).filter(item => item.available).length} /{' '}
                  {section.categories.flatMap(item => item.topics).length}
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {section.categories.map(category => (
                  <div key={category.id} className="rounded-[1.25rem] border border-[rgba(64,52,36,0.08)] bg-[rgba(255,255,255,0.42)] p-4">
                    <div className="flex items-center gap-3">
                      <div className="badge-mark">
                        {getCategoryMark(category.id, category.title)}
                      </div>
                      <div>
                        <h4 className="text-[16px] font-semibold text-[var(--color-ink)]">
                          {category.title}
                        </h4>
                        <div className="text-[12px] text-[var(--color-ink-soft)]">
                          {category.topics.length} 个知识点
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2.5">
                      {category.topics.map(topic => (
                        <Link
                          key={topic.id}
                          to={`/experiment/${topic.id}`}
                          className="home-topic-pill"
                          style={{ '--topic-color': topic.color } as React.CSSProperties}
                        >
                          <span
                            className="badge-mark h-9 min-w-9 px-0 text-[12px]"
                            style={{ backgroundColor: hexToRgbString(topic.color, 0.1) }}
                          >
                            {getTopicMark(topic.id, topic.title)}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[14px] font-medium text-[var(--color-ink)]">
                              {topic.title}
                            </span>
                            <span className="block text-[12px] text-[var(--color-ink-soft)]">
                              {topic.description}
                            </span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="px-2 pt-2 text-center text-[12px] leading-6 text-[var(--color-ink-soft)]">
        适合 GitHub Pages 分享，也适合录制演示视频。
        <br />
        从“看不见过程”到“拖动参数直接看见它”。
      </footer>
    </div>
  )
}
