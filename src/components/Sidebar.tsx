import { Link, useParams } from 'react-router-dom'
import { curriculum } from '../data/curriculum'
import { getSectionMark, getTopicMark, hexToRgbString } from '../lib/topicMarks'

export default function Sidebar() {
  const { id } = useParams()

  return (
    <aside className="hidden xl:block xl:w-[300px] xl:shrink-0">
      <div className="lab-panel sticky top-28 rounded-[1.6rem] p-4">
        <div className="panel-caption px-2">Experiment Index</div>
        <div className="mt-4 space-y-4">
          {curriculum.map(section => (
            <div key={section.id} className="rounded-[1.2rem] border border-[rgba(64,52,36,0.08)] bg-[rgba(255,255,255,0.28)] p-3">
              <div className="flex items-center gap-3 px-2">
                <div className="badge-mark bg-[rgba(49,92,168,0.08)]">
                  {getSectionMark(section.id, section.title)}
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-[var(--color-ink)]">
                    {section.title}
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-ink-soft)]">
                    {section.categories.flatMap(category => category.topics).length} Topics
                  </div>
                </div>
              </div>

              <div className="mt-3 space-y-1">
                {section.categories.flatMap(category => category.topics).map(topic => {
                  const active = topic.id === id

                  const content = (
                    <>
                      <div
                        className="badge-mark h-9 min-w-9 px-0 text-[12px]"
                        style={{ backgroundColor: hexToRgbString(topic.color, 0.1) }}
                      >
                        {getTopicMark(topic.id, topic.title)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[14px] font-medium text-[var(--color-ink)]">
                          {topic.title}
                        </div>
                        <div className="text-[12px] text-[var(--color-ink-soft)]">
                          {topic.available ? '已开放实验' : '待开发'}
                        </div>
                      </div>
                    </>
                  )

                  return topic.available ? (
                    <Link
                      key={topic.id}
                      to={`/experiment/${topic.id}`}
                      className={`sidebar-link ${active ? 'is-active' : ''}`}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div
                      key={topic.id}
                      className="sidebar-link cursor-not-allowed opacity-60"
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
    </aside>
  )
}
