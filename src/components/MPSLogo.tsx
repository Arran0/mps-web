'use client'

import React from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'

interface MPSLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  withRipple?: boolean
  className?: string
}

const sizeMap = {
  sm: { container: 'w-10 h-10', image: 40 },
  md: { container: 'w-12 h-12', image: 48 },
  lg: { container: 'w-32 h-32 xl:w-40 xl:h-40', image: 160 },
  xl: { container: 'w-48 h-48', image: 192 },
}

export default function MPSLogo({ size = 'md', withRipple = false, className = '' }: MPSLogoProps) {
  const { container, image } = sizeMap[size]

  if (withRipple) {
    return (
      <div className={`relative ${className}`}>
        {/* Ripple effects - positioned behind logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border-2 border-white/30"
              style={{ opacity: 0.6 - i * 0.1 }}
              animate={{
                width: ['128px', '800px'],
                height: ['128px', '800px'],
                opacity: [0.6 - i * 0.1, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeOut",
                delay: i,
              }}
            />
          ))}
        </div>

        {/* Logo */}
        <motion.div
          className={`relative z-10 ${container} rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-2xl overflow-hidden ring-4 ring-white/30`}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Image
            src="/logo.png"
            alt="MPS Logo"
            width={image}
            height={image}
            className="object-cover w-full h-full rounded-full"
          />
        </motion.div>
      </div>
    )
  }

  return (
    <div className={`${container} rounded-full overflow-hidden shadow-md flex-shrink-0 ${className}`}>
      <Image
        src="/logo.png"
        alt="MPS Logo"
        width={image}
        height={image}
        className="object-cover w-full h-full rounded-full"
      />
    </div>
  )
}
