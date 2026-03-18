import { Link, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'

function NavLink({
  to,
  label,
  active,
}: {
  to: string
  label: string
  active: boolean
}) {
  return (
    <Link to={to} className={`nav-link text-[13px] font-medium ${active ? 'is-active' : ''}`}>
      {label}
    </Link>
  )
}

export default function Layout() {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  const isHome = location.pathname === '/'
  const isChallenge = location.pathname === '/challenge/ion-injection'

  return (
    <div className="min-h-screen">
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5">
        <div className="lab-shell mx-auto flex max-w-[1480px] items-center justify-between rounded-[1.6rem] px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-3 no-underline">
            <div className="badge-mark bg-[rgba(142,57,40,0.08)]">φ</div>
            <div>
              <div className="text-[15px] font-semibold tracking-[0.02em] text-[var(--color-ink)]">
                高中物理可视化实验室
              </div>
              <div className="text-[11px] tracking-[0.18em] text-[var(--color-ink-soft)] uppercase">
                See The Process
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <NavLink to="/" label="实验总览" active={isHome} />
            <NavLink
              to="/challenge/ion-injection"
              label="真题可视化"
              active={isChallenge}
            />
          </nav>

          <div className="hidden text-right md:block">
            <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-soft)]">
              分享链接已就绪
            </div>
            <div className="text-[12px] text-[var(--color-ink)]">GitHub Pages · Hash routing</div>
          </div>
        </div>
      </header>

      <main className="px-3 pb-10 pt-24 sm:px-5 sm:pt-28">
        <div className="mx-auto max-w-[1480px]">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
