"use client"

import { motion } from "framer-motion"
import type { ReactNode } from "react"

interface BlurFadeProps {
  children: ReactNode
  delay?: number
  duration?: number
}

export function BlurFade({
  children,
  delay = 0,
  duration = 0.6,
}: BlurFadeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, filter: "blur(10px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      transition={{ duration, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  )
}
