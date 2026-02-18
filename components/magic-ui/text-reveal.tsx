"use client"

import { motion } from "framer-motion"

interface TextRevealProps {
  text: string
  className?: string
  delay?: number
}

export function TextReveal({
  text,
  className = "",
  delay = 0,
}: TextRevealProps) {
  return (
    <motion.h1
      className={className}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay,
        ease: "easeOut",
      }}
    >
      {text}
    </motion.h1>
  )
}
