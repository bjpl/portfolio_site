'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

const Footer = () => {
  const [navigationData, setNavigationData] = useState({ footer: [] });
  const [currentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    // Load navigation data for footer links
    const loadNavigationData = async () => {
      try {
        const response = await fetch('/data/navigation.json');
        if (response.ok) {
          const data = await response.json();
          setNavigationData(data);
        } else {
          // Fallback footer data
          setNavigationData({
            footer: [
              { name: "Contact", url: "/contact/", weight: 10 },
              { name: "Privacy", url: "/privacy/", weight: 20 }
            ]
          });
        }
      } catch (error) {
        console.warn('Failed to load footer navigation data:', error);
        setNavigationData({
          footer: [
            { name: "Contact", url: "/contact/", weight: 10 },
            { name: "Privacy", url: "/privacy/", weight: 20 }
          ]
        });
      }
    };

    loadNavigationData();
  }, []);

  // Sort footer items by weight
  const sortedFooterItems = navigationData.footer?.sort((a, b) => a.weight - b.weight) || [];

  const socialLinks = [
    {
      name: 'LinkedIn',
      href: 'https://linkedin.com/in/brandonjplambert',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      ),
    },
    {
      name: 'GitHub',
      href: 'https://github.com/brandonjplambert',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
        </svg>
      ),
    },
    {
      name: 'Twitter',
      href: 'https://twitter.com/brandonjplambert',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
        </svg>
      ),
    },
  ];

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-content">
          {/* About Section */}
          <div className="footer-section">
            <h3>Brandon JP Lambert</h3>
            <p className="text-sm text-gray-400 mb-4">
              Educator, Developer & Language Learning Enthusiast. 
              Helping people learn languages through innovative technology and proven teaching methods.
            </p>
            
            {/* Social Links */}
            <div className="flex space-x-4">
              {socialLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="header-social-link"
                  title={`Follow on ${link.name}`}
                >
                  <span className="sr-only">{link.name}</span>
                  {link.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links Section */}
          <div className="footer-section">
            <h3>Quick Links</h3>
            <ul className="footer-links space-y-2">
              <li>
                <Link href="/teaching-learning/" className="hover:text-blue-400 transition-colors">
                  Teaching & Learning
                </Link>
              </li>
              <li>
                <Link href="/tools/" className="hover:text-blue-400 transition-colors">
                  Tools & Resources
                </Link>
              </li>
              <li>
                <Link href="/writing/" className="hover:text-blue-400 transition-colors">
                  Writing & Poetry
                </Link>
              </li>
              <li>
                <Link href="/photography/" className="hover:text-blue-400 transition-colors">
                  Photography
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Legal Section */}
          <div className="footer-section">
            <h3>Contact & Legal</h3>
            <ul className="footer-links space-y-2">
              {sortedFooterItems.map((item) => (
                <li key={item.url}>
                  <Link href={item.url} className="hover:text-blue-400 transition-colors">
                    {item.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/sitemap.xml" className="hover:text-blue-400 transition-colors">
                  Sitemap
                </Link>
              </li>
            </ul>

            {/* Admin Access */}
            <Link 
              href="/admin" 
              className="btn-admin-footer mt-4"
              title="Admin Dashboard"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
                />
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
                />
              </svg>
              Admin Panel
            </Link>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <p>
            &copy; {currentYear} Brandon JP Lambert. All rights reserved.
          </p>
          <p className="footer-hint mt-2">
            Built with Next.js, Tailwind CSS, and passion for education.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;