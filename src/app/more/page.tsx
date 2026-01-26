'use client'

import React from 'react'
import ProtectedLayout from '@/components/ProtectedLayout'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  MoreHorizontal, 
  CreditCard, 
  Bus, 
  Calendar,
  ArrowRight
} from 'lucide-react'

const moreSections = [
  {
    title: 'Fee Manager',
    description: 'View fee structure, payment history, and make payments',
    href: '/more/fees',
    icon: <CreditCard size={28} />,
    color: 'from-emerald-400 to-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  {
    title: 'School Bus Manager',
    description: 'Track bus routes, timings, and transportation details',
    href: '/more/bus',
    icon: <Bus size={28} />,
    color: 'from-rose-400 to-rose-600',
    bgColor: 'bg-rose-50',
  },
  {
    title: 'Leave Manager',
    description: 'Apply for leave, view leave balance, and track applications',
    href: '/more/leave',
    icon: <Calendar size={28} />,
    color: 'from-cyan-400 to-cyan-600',
    bgColor: 'bg-cyan-50',
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

export default function MorePage() {
  return (
    <ProtectedLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-slate-100 rounded-xl">
                <MoreHorizontal className="text-slate-600" size={24} />
              </div>
              <h1 className="font-display text-3xl font-bold text-slate-800">More Services</h1>
            </div>
            <p className="text-slate-500 ml-14">
              Additional services to help manage your school experience.
            </p>
          </motion.div>

          {/* More Sections */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {moreSections.map((section, index) => (
              <motion.div key={section.href} variants={itemVariants}>
                <Link href={section.href}>
                  <div className="glass rounded-2xl p-6 h-full card-hover group">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${section.color} flex items-center justify-center text-white mb-5 shadow-lg group-hover:shadow-xl transition-shadow`}>
                      {section.icon}
                    </div>
                    <h3 className="font-display text-xl font-bold text-slate-800 mb-2 group-hover:text-mps-blue-600 transition-colors">
                      {section.title}
                    </h3>
                    <p className="text-slate-500 text-sm mb-4">
                      {section.description}
                    </p>
                    <div className="flex items-center text-mps-blue-600 font-medium text-sm">
                      <span>Open</span>
                      <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </ProtectedLayout>
  )
}
