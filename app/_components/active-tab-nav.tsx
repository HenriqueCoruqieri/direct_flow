"use client"

import { useEffect, useRef } from "react"

interface ActiveTabNavProps extends React.ComponentProps<"nav"> {
  activeKey: string
}

const ActiveTabNav = ({ activeKey, children, ...props }: ActiveTabNavProps) => {
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const nav = navRef.current
    if (nav === null) return

    const active = nav.querySelector<HTMLElement>('[aria-current="page"]')
    if (active === null) return

    const navRect = nav.getBoundingClientRect()
    const activeRect = active.getBoundingClientRect()
    if (activeRect.left >= navRect.left && activeRect.right <= navRect.right) {
      return
    }

    nav.scrollLeft +=
      activeRect.left - navRect.left - (navRect.width - activeRect.width) / 2
  }, [activeKey])

  return (
    <nav ref={navRef} {...props}>
      {children}
    </nav>
  )
}

export default ActiveTabNav
