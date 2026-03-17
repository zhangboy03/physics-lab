import { Suspense, lazy } from 'react'
import type { ComponentType, LazyExoticComponent } from 'react'
import { Link, useParams } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { curriculum, getAvailableTopics } from '../data/curriculum'
import { getSectionMark, getTopicMark, hexToRgbString } from '../lib/topicMarks'

const experimentComponents: Record<string, LazyExoticComponent<ComponentType>> = {
  'uniform-accel': lazy(() => import('../experiments/uniform-accel/UniformAccelSim')),
  pendulum: lazy(() => import('../experiments/pendulum/PendulumSim')),
  projectile: lazy(() => import('../experiments/projectile/ProjectileSim')),
  circular: lazy(() => import('../experiments/circular/CircularSim')),
  newton: lazy(() => import('../experiments/newton/NewtonSim')),
  gravity: lazy(() => import('../experiments/gravity/GravitySim')),
  wave: lazy(() => import('../experiments/wave/WaveSim')),
  spring: lazy(() => import('../experiments/spring/SpringSim')),
  energy: lazy(() => import('../experiments/energy/EnergySim')),
  collision: lazy(() => import('../experiments/collision/CollisionSim')),
  interference: lazy(() => import('../experiments/interference/InterferenceSim')),
  coulomb: lazy(() => import('../experiments/coulomb/CoulombSim')),
  ohm: lazy(() => import('../experiments/ohm/OhmSim')),
  lorentz: lazy(() => import('../experiments/lorentz/LorentzSim')),
  faraday: lazy(() => import('../experiments/faraday/FaradaySim')),
  brownian: lazy(() => import('../experiments/brownian/BrownianSim')),
  refraction: lazy(() => import('../experiments/refraction/RefractionSim')),
  photoelectric: lazy(() => import('../experiments/photoelectric/PhotoelectricSim')),
}

export default function ExperimentPage() {
  const { id } = useParams<{ id: string }>()

  const section = curriculum.find(current =>
    current.categories.some(category => category.topics.some(topic => topic.id === id)),
  )
  const category = section?.categories.find(current =>
    current.topics.some(topic => topic.id === id),
  )
  const topic = category?.topics.find(current => current.id === id)

  const SimComponent = id ? experimentComponents[id] : null

  if (!topic || !SimComponent) {
    return (
      <div className="lab-panel rounded-[1.8rem] px-6 py-16 text-center">
        <div className="badge-mark mx-auto bg-[rgba(142,57,40,0.08)]">404</div>
        <h1 className="display-title mt-6 text-[2.6rem] text-[var(--color-ink)]">
          实验未找到
        </h1>
        <p className="mx-auto mt-4 max-w-[520px] text-[15px] leading-7 text-[var(--color-ink-soft)]">
          这个实验还没有接入页面，或者对应的路由还没补好。你可以先返回首页继续浏览当前已开放的模块。
        </p>
        <Link to="/" className="primary-button mt-8">
          返回实验总览
        </Link>
      </div>
    )
  }

  const relatedTopics = getAvailableTopics().filter(item => item.id !== topic.id).slice(0, 5)

  return (
    <div className="space-y-6">
      <section className="lab-shell hero-grid paper-grid grain overflow-hidden rounded-[1.9rem] px-6 py-8 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <div className="section-eyebrow">
              {section ? getSectionMark(section.id, section.title) : 'LAB'}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div
                className="badge-mark"
                style={{ backgroundColor: hexToRgbString(topic.color, 0.14) }}
              >
                {getTopicMark(topic.id, topic.title)}
              </div>
              <div className="topic-tag" style={{ color: topic.color }}>
                {category?.title ?? '实验模块'}
              </div>
            </div>
            <h1 className="display-title mt-5 text-[clamp(2.4rem,6vw,4.4rem)] leading-[0.94] text-[var(--color-ink)]">
              {topic.title}
            </h1>
            <p className="mt-4 max-w-[720px] text-[16px] leading-8 text-[var(--color-ink-soft)]">
              {topic.description}。页面里的参数控制、图像和动画都应该直接对应物理过程，而不是仅仅做一个“会动的示意图”。
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="metric-tile">
              <div className="panel-caption">Section</div>
              <div className="mt-4 text-[18px] font-semibold text-[var(--color-ink)]">
                {section?.title}
              </div>
            </div>
            <div className="metric-tile">
              <div className="panel-caption">Module</div>
              <div className="mt-4 text-[18px] font-semibold text-[var(--color-ink)]">
                {category?.title}
              </div>
            </div>
            <div className="metric-tile">
              <div className="panel-caption">Status</div>
              <div className="mt-4 text-[18px] font-semibold text-[var(--color-accent-green)]">
                已开放
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3 overflow-x-auto pb-1 xl:hidden">
          {getAvailableTopics().map(item => (
            <Link
              key={item.id}
              to={`/experiment/${item.id}`}
              className={`topic-tag whitespace-nowrap no-underline ${
                item.id === topic.id ? 'ring-1 ring-[rgba(64,52,36,0.18)]' : ''
              }`}
              style={{
                color: item.id === topic.id ? 'var(--color-ink)' : item.color,
                backgroundColor:
                  item.id === topic.id
                    ? 'rgba(255,255,255,0.82)'
                    : hexToRgbString(item.color, 0.08),
              }}
            >
              {item.title}
            </Link>
          ))}
        </div>
      </section>

      <div className="flex gap-6">
        <Sidebar />

        <div className="min-w-0 flex-1 space-y-6">
          <div className="lab-panel rounded-[1.8rem] p-4 sm:p-6">
            <Suspense
              fallback={(
                <div className="rounded-[1.4rem] border border-[rgba(64,52,36,0.08)] bg-[rgba(255,255,255,0.5)] px-6 py-16 text-center text-[15px] text-[var(--color-ink-soft)]">
                  正在加载实验模块…
                </div>
              )}
            >
              <SimComponent />
            </Suspense>
          </div>

          <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="lab-panel rounded-[1.6rem] p-5">
              <div className="panel-caption">How To Use</div>
              <div className="paper-rule mt-4" />
              <div className="mt-5 space-y-3 text-[15px] leading-7 text-[var(--color-ink-soft)]">
                <p>先在右侧控制区改变关键物理量，观察画面、图像和数值的联动变化。</p>
                <p>再尝试只改一个参数，判断公式中哪些量会变，哪些量不会变。</p>
                <p>如果这是你的录屏页面，优先展示“参数变化前后能直接看出来”的现象差异。</p>
              </div>
            </div>

            <div className="lab-panel rounded-[1.6rem] p-5">
              <div className="panel-caption">Continue With</div>
              <div className="paper-rule mt-4" />
              <div className="mt-5 grid gap-3">
                {relatedTopics.map(item => (
                  <Link
                    key={item.id}
                    to={`/experiment/${item.id}`}
                    className="sidebar-link rounded-[1.1rem] border border-[rgba(64,52,36,0.08)] bg-[rgba(255,255,255,0.44)] no-underline"
                  >
                    <div
                      className="badge-mark"
                      style={{ backgroundColor: hexToRgbString(item.color, 0.1) }}
                    >
                      {getTopicMark(item.id, item.title)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[15px] font-medium text-[var(--color-ink)]">
                        {item.title}
                      </div>
                      <div className="text-[13px] text-[var(--color-ink-soft)]">
                        {item.description}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
