'use client'

import React from 'react'
import ProtectedLayout from '@/components/ProtectedLayout'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  BookOpen, 
  FileText, 
  GraduationCap, 
  Award,
  ArrowRight
} from 'lucide-react'

const academicSections = [
  {
    title: 'Homework Management',
    description: 'View, submit, and track your homework assignments',
    href: '/academics/homework',
    icon: <FileText size={28} />,
    color: 'from-blue-400 to-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    title: 'Coursework Management',
    description: 'Access course materials, syllabi, and learning resources',
    href: '/academics/coursework',
    icon: <GraduationCap size={28} />,
    color: 'from-purple-400 to-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    title: 'Grades',
    description: 'View your academic performance and grade reports',
    href: '/academics/grades',
    icon: <Award size={28} />,
    color: 'from-amber-400 to-amber-600',
    bgColor: 'bg-amber-50',
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

export default function AcademicsPage() {
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
              <div className="p-2 bg-mps-blue-100 rounded-xl">
                <BookOpen className="text-mps-blue-600" size={24} />
              </div>
              <h1 className="font-display text-3xl font-bold text-slate-800">Academics</h1>
            </div>
            <p className="text-slate-500 ml-14">
              Manage your academic journey - homework, coursework, and grades all in one place.
            </p>
          </motion.div>

          {/* Academic Sections */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {academicSections.map((section, index) => (
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
