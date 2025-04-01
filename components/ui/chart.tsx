"use client"

import * as React from "react"
import { type ResponsiveContainerProps, ResponsiveContainer } from "recharts"

import { cn } from "@/lib/utils"

export interface ChartConfig {
  [key: string]: {
    label: string
    color: string
  }
}

type ChartContainerProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode
  config?: ChartConfig
  responsiveContainerProps?: ResponsiveContainerProps
}

export function ChartContainer({
  children,
  className,
  config,
  responsiveContainerProps,
  ...props
}: ChartContainerProps) {
  const styles = React.useMemo(() => {
    if (!config) return {}

    return Object.entries(config).reduce((acc, [key, value]) => {
      return {
        ...acc,
        [`--color-${key}`]: value.color,
      }
    }, {})
  }, [config])

  return (
    <div className={cn("space-y-4", className)} style={styles as React.CSSProperties} {...props}>
      <ResponsiveContainer width="100%" height={300} {...responsiveContainerProps}>
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  )
} 