'use client'

import React from 'react'
import { Construction, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

interface UnderConstructionProps {
  title: string
  description?: string
  icon?: React.ReactNode
  backLink?: string
  backLabel?: string
}

export default function UnderConstruction({
  title,
  description = "We're working hard to bring you this feature. Check back soon!",
  icon,
  backLink = '/home',
  backLabel = 'Back to Home'
}: UnderConstructionProps) {
  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md"
      >
        {/* Animated Icon Container */}
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="relative w-32 h-32 mx-auto mb-8"
        >
          {/* Background circles */}
          <div className="absolute inset-0 bg-gradient-to-br from-mps-blue-100 to-mps-green-100 rounded-full animate-pulse-soft" />
          <div className="absolute inset-2 bg-gradient-to-br from-mps-blue-50 to-mps-green-50 rounded-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            {icon || (
              <Construction className="w-14 h-14 text-mps-blue-500" strokeWidth={1.5} />
            )}
          </div>
          
          {/* Decorative elements */}
          <motion.div 
            className="absolute -top-2 -right-2 w-6 h-6 bg-amber-400 rounded-full"
            animate={{ y: [-5, 5, -5] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
          <motion.div 
            className="absolute -bottom-1 -left-1 w-4 h-4 bg-mps-green-400 rounded-full"
            animate={{ y: [5, -5, 5] }}
            transition={{ repeat: Infinity, duration: 2.5 }}
          />
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <span className="construction-badge mb-4">
            <Construction size={16} />
            Under Construction
          </span>
          
          <h1 className="font-display text-3xl font-bold text-slate-800 mt-4 mb-3">
            {title}
          </h1>
          
          <p className="text-slate-500 leading-relaxed mb-8">
            {description}
          </p>

          {/* Progress indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500 mb-2">
              <span>Building in progress</span>
            </div>
            <div className="w-48 h-2 bg-slate-100 rounded-full mx-auto overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-mps-blue-500 to-mps-green-500 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: "35%" }}
                transition={{ delay: 0.6, duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Back button */}
          <Link href={backLink}>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-ghost inline-flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              {backLabel}
            </motion.button>
          </Link>
        </motion.div>

        {/* Background decoration */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="floating-shape w-64 h-64 bg-mps-blue-200 top-20 -left-32" />
          <div className="floating-shape w-96 h-96 bg-mps-green-200 bottom-20 -right-48" style={{ animationDelay: '2s' }} />
        </div>
      </motion.div>
    </div>
  )
}
