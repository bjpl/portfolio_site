'use client'

import React from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
  Github, 
  Linkedin, 
  Twitter, 
  Mail, 
  Phone, 
  MapPin,
  Heart,
  ArrowUp,
  ExternalLink
} from 'lucide-react'

export const EnhancedFooter = () => {
  const currentYear = new Date().getFullYear()

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const socialLinks = [
    { 
      href: 'https://github.com', 
      icon: Github, 
      label: 'GitHub',
      color: 'hover:text-gray-900 dark:hover:text-white'
    },
    { 
      href: 'https://linkedin.com', 
      icon: Linkedin, 
      label: 'LinkedIn',
      color: 'hover:text-blue-600'
    },
    { 
      href: 'https://twitter.com', 
      icon: Twitter, 
      label: 'Twitter',
      color: 'hover:text-blue-400'
    },
    { 
      href: 'mailto:your.email@example.com', 
      icon: Mail, 
      label: 'Email',
      color: 'hover:text-red-500'
    }
  ]

  const navigationLinks = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/projects', label: 'Projects' },
    { href: '/blog', label: 'Blog' },
    { href: '/contact', label: 'Contact' }
  ]

  const serviceLinks = [
    { href: '/services/web-development', label: 'Web Development' },
    { href: '/services/ui-design', label: 'UI/UX Design' },
    { href: '/services/consulting', label: 'Consulting' },
    { href: '/services/maintenance', label: 'Maintenance' }
  ]

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <footer className="relative bg-surface border-t border-border/20">
      {/* Main Footer Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand & Description */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <Link href="/" className="inline-block mb-4">
              <h3 className="text-2xl font-bold text-gradient">Your Name</h3>
            </Link>
            <p className="text-text-secondary leading-relaxed mb-6 max-w-md">
              Crafting exceptional digital experiences through innovative design 
              and clean, efficient code. Let's build something amazing together.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-text-muted">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <a 
                  href="mailto:your.email@example.com"
                  className="hover:text-primary transition-colors duration-200"
                >
                  your.email@example.com
                </a>
              </div>
              <div className="flex items-center space-x-3 text-text-muted">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <a 
                  href="tel:+1234567890"
                  className="hover:text-primary transition-colors duration-200"
                >
                  +1 (234) 567-8900
                </a>
              </div>
              <div className="flex items-center space-x-3 text-text-muted">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span>Your City, Country</span>
              </div>
            </div>
          </motion.div>

          {/* Navigation Links */}
          <motion.div variants={itemVariants}>
            <h4 className="text-lg font-semibold text-text-primary mb-4">Navigation</h4>
            <ul className="space-y-3">
              {navigationLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-text-secondary hover:text-primary transition-colors duration-200 flex items-center space-x-2 group"
                  >
                    <span>{label}</span>
                    <motion.div
                      animate={{ x: 0 }}
                      whileHover={{ x: 4 }}
                      transition={{ duration: 0.2 }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                      <ArrowUp className="w-3 h-3 rotate-45" />
                    </motion.div>
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Services Links */}
          <motion.div variants={itemVariants}>
            <h4 className="text-lg font-semibold text-text-primary mb-4">Services</h4>
            <ul className="space-y-3">
              {serviceLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-text-secondary hover:text-primary transition-colors duration-200 flex items-center space-x-2 group"
                  >
                    <span>{label}</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Social Links & Newsletter */}
        <motion.div 
          variants={itemVariants}
          className="mt-12 pt-8 border-t border-border/20"
        >
          <div className="flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0">
            {/* Social Links */}
            <div className="flex items-center space-x-6">
              <span className="text-text-muted text-sm font-medium">Follow me:</span>
              {socialLinks.map(({ href, icon: Icon, label, color }) => (
                <motion.a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className={`p-2 rounded-lg bg-surface-alt/50 text-text-muted transition-all duration-200 focus-ring ${color}`}
                  aria-label={label}
                >
                  <Icon className="w-5 h-5" />
                </motion.a>
              ))}
            </div>

            {/* Newsletter Signup */}
            <div className="flex items-center space-x-3">
              <span className="text-text-muted text-sm font-medium">Stay updated:</span>
              <div className="flex">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="px-4 py-2 bg-surface-alt border border-border/20 rounded-l-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 bg-primary text-white rounded-r-lg hover:bg-primary-hover transition-colors duration-200 text-sm font-medium"
                >
                  Subscribe
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Bottom Bar */}
      <div className="border-t border-border/20 bg-surface-alt/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
            {/* Copyright */}
            <div className="flex items-center space-x-2 text-text-muted text-sm">
              <span>© {currentYear} Your Name. Made with</span>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity, repeatDelay: 3 }}
              >
                <Heart className="w-4 h-4 text-red-500 fill-current" />
              </motion.div>
              <span>using Next.js & Tailwind CSS</span>
            </div>

            {/* Scroll to Top */}
            <motion.button
              onClick={scrollToTop}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center space-x-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors duration-200 focus-ring text-sm font-medium"
            >
              <ArrowUp className="w-4 h-4" />
              <span>Back to Top</span>
            </motion.button>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default EnhancedFooter