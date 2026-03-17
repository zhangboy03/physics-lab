import { Link } from 'react-router-dom'
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

  return (
    <div className="space-y-8 pb-8">
      <section className="lab-shell hero-grid paper-grid grain relative overflow-hidden rounded-[2rem] px-6 py-8 sm:px-10 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="max-w-[720px]">
            <div className="section-eyebrow">Visual Thinking For Gaokao Physics</div>
            <h1 className="display-title mt-6 text-[clamp(3.2rem,9vw,6.5rem)] leading-[0.92] text-[var(--color-ink)]">
              把题目
              <br />
              还原成过程
            </h1>
            <p className="mt-5 max-w-[620px] text-[16px] leading-8 text-[var(--color-ink-soft)] sm:text-[18px]">
              这个实验室把高中物理里最容易“只会代公式、不会看过程”的模块拆开做成交互实验。
              从单摆、抛体到波动和干涉，学生可以一边调参数，一边看到轨迹、能量和图像如何联动。
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/experiment/pendulum" className="primary-button">
                进入实验室
              </Link>
              <Link to="/challenge/ion-injection" className="secondary-button">
                打开离子注入真题页
              </Link>
              <button
                type="button"
                onClick={() =>
                  document.getElementById('curriculum')?.scrollIntoView({ behavior: 'smooth' })
                }
                className="secondary-button cursor-pointer border-0"
              >
                浏览知识框架
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <FeatureCard
              title="已开放实验"
              value={`${availableCount}`}
              body="覆盖力学与波动中的核心可视化知识点，适合拍摄演示，也适合学生直接上手。"
            />
            <FeatureCard
              title="课程节点"
              value={`${totalTopics}`}
              body="整个站点按高中物理知识树组织，已开放与待扩展内容会在同一框架中持续补全。"
            />
            <FeatureCard
              title="真题互动"
              value="01"
              body="离子注入题单独做成可调参数页面，左边看推导，右边直接做磁分析器实验。"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="lab-panel rounded-[1.8rem] p-6 sm:p-8">
          <div className="panel-caption">Open Modules</div>
          <div className="paper-rule mt-4" />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {availableTopics.map(topic => (
              <Link
                key={topic.id}
                to={`/experiment/${topic.id}`}
                className="topic-card lab-shell rounded-[1.4rem] p-4 no-underline"
              >
                <div className="flex items-start justify-between gap-4">
                  <div
                    className="badge-mark"
                    style={{ backgroundColor: hexToRgbString(topic.color, 0.12) }}
                  >
                    {getTopicMark(topic.id, topic.title)}
                  </div>
                  <span
                    className="topic-tag"
                    style={{ color: topic.color }}
                  >
                    可交互
                  </span>
                </div>
                <h3 className="mt-5 text-[18px] font-semibold tracking-[0.01em] text-[var(--color-ink)]">
                  {topic.title}
                </h3>
                <p className="mt-2 text-[14px] leading-6 text-[var(--color-ink-soft)]">
                  {topic.description}
                </p>
              </Link>
            ))}
          </div>
        </div>

        <div className="lab-panel rounded-[1.8rem] p-6 sm:p-8">
          <div className="panel-caption">Featured Challenge</div>
          <div className="paper-rule mt-4" />
          <div className="mt-6 space-y-5">
            <div className="flex items-start gap-4">
              <div className="badge-mark bg-[rgba(49,92,168,0.08)]">ION</div>
              <div>
                <h2 className="display-title text-[2rem] leading-tight text-[var(--color-ink)]">
                  离子注入磁分析器
                </h2>
                <p className="mt-2 text-[15px] leading-7 text-[var(--color-ink-soft)]">
                  这页会把题干、关键计算和磁场轨迹实验放在同一屏里。学生既能读懂
                  `r₁ = 2r`、`r₂ = 14√11/11 r` 的来源，也能直接验证 BF₂⁺
                  为什么进不了晶圆。
                </p>
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
                  动态检查 BF₂⁺ 是否会从 `cd` 边射出并进入晶圆。
                </p>
              </div>
            </div>

            <Link to="/challenge/ion-injection" className="primary-button mt-2 w-fit">
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

        <div className="mt-8 space-y-6">
          {curriculum.map(section => (
            <div key={section.id} className="lab-shell rounded-[1.6rem] p-5 sm:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
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

              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                {section.categories.map(category => (
                  <div key={category.id} className="topic-card lab-panel rounded-[1.4rem] p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="badge-mark">
                          {getCategoryMark(category.id, category.title)}
                        </div>
                        <div>
                          <h4 className="text-[17px] font-semibold text-[var(--color-ink)]">
                            {category.title}
                          </h4>
                          <div className="text-[12px] text-[var(--color-ink-soft)]">
                            {category.topics.length} 个知识点
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3">
                      {category.topics.map(topic => {
                        const content = (
                          <>
                            <div
                              className="badge-mark"
                              style={{ backgroundColor: hexToRgbString(topic.color, 0.1) }}
                            >
                              {getTopicMark(topic.id, topic.title)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[15px] font-medium text-[var(--color-ink)]">
                                  {topic.title}
                                </span>
                                <span
                                  className="topic-tag"
                                  style={{
                                    color: topic.available
                                      ? 'var(--color-accent-green)'
                                      : 'var(--color-ink-soft)',
                                  }}
                                >
                                  {topic.available ? '已完成' : '待补全'}
                                </span>
                              </div>
                              <p className="mt-1 text-[13px] leading-6 text-[var(--color-ink-soft)]">
                                {topic.description}
                              </p>
                            </div>
                          </>
                        )

                        return topic.available ? (
                          <Link
                            key={topic.id}
                            to={`/experiment/${topic.id}`}
                            className="sidebar-link rounded-[1.1rem] border border-[rgba(64,52,36,0.08)] bg-[rgba(255,255,255,0.46)] no-underline"
                          >
                            {content}
                          </Link>
                        ) : (
                          <div
                            key={topic.id}
                            className="sidebar-link rounded-[1.1rem] border border-dashed border-[rgba(64,52,36,0.08)] bg-[rgba(255,255,255,0.28)] opacity-75"
                          >
                            {content}
                          </div>
                        )
                      })}
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
