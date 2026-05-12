import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  value: string
  className?: string
}

export default function RollingNumber({ value, className }: Props) {
  const [prev, setPrev] = useState<string | null>(null)
  const [current, setCurrent] = useState(value)

  useEffect(() => {
    if (value === current) return
    setPrev(current)
    setCurrent(value)
    const t = setTimeout(() => setPrev(null), 400)
    return () => clearTimeout(t)
  }, [value, current])

  return (
    <span className={cn('relative overflow-hidden inline-block', className)}>
      {prev !== null && (
        <span className="absolute inset-0 animate-roll-out" aria-hidden>
          {prev}
        </span>
      )}
      <span className={prev !== null ? 'animate-roll-in block' : 'block'}>
        {current}
      </span>
    </span>
  )
}
