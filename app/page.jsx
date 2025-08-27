'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import ProjectGallery from '../components/ProjectGallery';

const HomePage = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Skills data from JSON structure
  const skillsData = {
    "categories": [
      {
        "name": "Teaching & Learning",
        "skills": ["Curriculum Design", "Educational Technology", "Assessment", "Online Learning", "SLA Theory", "TESOL"]
      },
      {
        "name": "Technical",
        "skills": ["Web Development", "Hugo", "JavaScript", "TypeScript", "SCSS", "React", "Next.js", "Python"]
      },
      {
        "name": "Research & Development",
        "skills": ["Data Analysis", "Academic Writing", "Literature Review", "Qualitative Methods", "AI Integration"]
      }
    ]
  };

  // Recent blog posts
  const recentPosts = [
    {
      title: "The AI Revolution in Language Learning: Beyond ChatGPT",
      excerpt: "How AI is transforming language education beyond simple chatbots, creating personalized, adaptive learning experiences at scale.",
      date: "January 17, 2025",
      href: "/blog/ai-language-learning-revolution/",
      tags: ["AI", "EdTech", "Innovation"]
    },
    {
      title: "VR Language Immersion: Lessons from Coaching Instructors",
      excerpt: "Insights from working with VR instructors and creating immersive language learning environments.",
      date: "January 10, 2025",
      href: "/blog/vr-language-immersion/",
      tags: ["VR", "Immersion", "Teaching"]
    },
    {
      title: "Scaling Education for 800,000+ Learners",
      excerpt: "Lessons learned from developing curriculum and tools for massive scale language education programs.",
      date: "December 28, 2024",
      href: "/blog/scaling-education-800k-learners/",
      tags: ["Scale", "Curriculum", "EdTech"]
    }
  ];

  // Featured projects
  const featuredProjects = [
    {
      title: "Vocab Tool",
      description: "Python-based vocabulary management tool with Docker support and modern development practices for efficient vocabulary learning.",
      tech: ["Python", "Docker", "Testing"],
      href: "/tools/built/vocab-tool/",
      status: "Active"
    },
    {
      title: "Language Tool Suite",
      description: "Comprehensive language learning tools including conjugation practice, subjunctive exercises, and interactive dashboards.",
      tech: ["JavaScript", "React", "Educational Design"],
      href: "/tools/built/langtool/",
      status: "Featured"
    },
    {
      title: "Multimodal Learning Strategies",
      description: "Research-backed strategies for virtual immersion, chaos-to-curriculum methodology, and precision escalation techniques.",
      tech: ["Pedagogy", "Research", "SLA Theory"],
      href: "/tools/strategies/",
      status: "Research"
    }
  ];

  return (
    <>
      {/* Hero Section */}
      <section className={`hero-section ${isVisible ? 'animate-fade-in' : ''}`}>
        <div className="container">
          <div className="text-center max-w-4xl mx-auto relative">
            <div className="hero-badge">
              📍 Mountain View, CA → Medellín, Colombia (Late 2025)
            </div>
            
            <h1 className="hero-title">
              <span className="gradient-text">Brandon JP Lambert</span>
              <span className="subtitle">Fourth-Generation Educator & EdTech Developer</span>
            </h1>
            
            <p className="hero-description">
              MA-TESOL educator with 10 years in language education and edtech - from teaching graduate-level 
              art and design courses to scoping curriculum for 800,000+ young Chinese learners, designing 
              specialized programs for diplomats, coaching VR instructors, and developing custom AI-powered tools.
            </p>
            
            <div className="hero-stats">
              <div className="stat">
                <div className="stat-number">800K+</div>
                <div className="stat-label">Learners Reached</div>
              </div>
              <div className="stat">
                <div className="stat-number">10+</div>
                <div className="stat-label">Years Experience</div>
              </div>
              <div className="stat">
                <div className="stat-number">4th</div>
                <div className="stat-label">Generation Educator</div>
              </div>
            </div>
            
            <div className="hero-actions">
              <Link href="/blog/" className="btn-primary">
                Read My Insights
              </Link>
              <Link href="/tools/" className="btn-secondary">
                Explore My Tools
              </Link>
              <Link href="/me/" className="btn-accent">
                About My Journey
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="about-section">
        <div className="container">
          <div className="about-content">
            <div className="about-text">
              <h2 className="section-title">Bridging Education & Technology</h2>
              <div className="about-description">
                <p>
                  As a fourth-generation educator with an MA-TESOL, I've spent the last decade at the 
                  intersection of language education and cutting-edge technology. My journey spans from 
                  teaching graduate-level art and design courses to developing curriculum for hundreds of 
                  thousands of learners across diverse cultural and educational contexts.
                </p>
                <p>
                  I specialize in creating scalable, research-backed educational solutions that leverage 
                  AI, VR, and modern web technologies to make language learning more effective, engaging, 
                  and accessible. My work includes coaching VR instructors, designing programs for diplomats, 
                  and building custom tools that solve real pedagogical challenges.
                </p>
              </div>
              <div className="about-highlights">
                <div className="highlight">
                  <div className="highlight-icon">🎓</div>
                  <div>
                    <h4>Educational Innovation</h4>
                    <p>Curriculum design for 800,000+ learners with measurable outcomes</p>
                  </div>
                </div>
                <div className="highlight">
                  <div className="highlight-icon">🚀</div>
                  <div>
                    <h4>Technology Integration</h4>
                    <p>AI-powered tools and VR experiences for immersive learning</p>
                  </div>
                </div>
                <div className="highlight">
                  <div className="highlight-icon">🌍</div>
                  <div>
                    <h4>Global Impact</h4>
                    <p>Cross-cultural programs from diplomats to young learners</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="about-image">
              <div className="image-placeholder">
                <div className="image-content">
                  <span className="image-text">Brandon JP Lambert</span>
                  <span className="image-subtitle">Educator & Developer</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Skills Section */}
      <section className="skills-section">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="section-title">Skills & Expertise</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              A diverse skill set combining educational expertise with modern web development technologies, 
              backed by research and real-world application.
            </p>
          </div>
          
          <div className="skills-categories">
            {skillsData.categories.map((category, index) => (
              <div key={category.name} className={`skill-category ${isVisible ? 'animate-slide-up' : ''}`} 
                   style={{animationDelay: `${index * 0.2}s`}}>
                <h3 className="category-title">{category.name}</h3>
                <div className="skills-grid">
                  {category.skills.map((skill) => (
                    <span key={skill} className="skill-tag">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          <div className="section-footer">
            <Link href="/cv/" className="btn-accent">
              View Full CV
            </Link>
          </div>
        </div>
      </section>

      {/* Recent Blog Posts Section */}
      <section className="blog-section">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="section-title">Recent Insights</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Thoughts on education, technology, and the intersection of AI and pedagogy from 
              a practitioner's perspective.
            </p>
          </div>
          
          <div className="blog-grid">
            {recentPosts.map((post, index) => (
              <article key={post.href} className={`blog-card ${isVisible ? 'animate-fade-in' : ''}`}
                       style={{animationDelay: `${index * 0.1}s`}}>
                <div className="blog-meta">
                  <time className="blog-date">{post.date}</time>
                  <div className="blog-tags">
                    {post.tags.map(tag => (
                      <span key={tag} className="blog-tag">{tag}</span>
                    ))}
                  </div>
                </div>
                <h3 className="blog-title">
                  <Link href={post.href}>{post.title}</Link>
                </h3>
                <p className="blog-excerpt">{post.excerpt}</p>
                <Link href={post.href} className="blog-read-more">
                  Read More →
                </Link>
              </article>
            ))}
          </div>
          
          <div className="section-footer">
            <Link href="/blog/" className="btn-primary">
              View All Posts
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Projects Section - New Component */}
      <ProjectGallery 
        showFeatured={true}
        showAll={false}
        limit={3}
        title="Featured Projects"
        subtitle="From research-backed learning tools to scalable educational platforms, these projects showcase practical solutions to real pedagogical challenges."
      />

      {/* Call to Action Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <div className="cta-text">
              <h2 className="cta-title">
                Ready to Transform Language Education?
              </h2>
              <p className="cta-description">
                Whether you're interested in collaborating on educational technology, discussing 
                research-backed teaching methods, or exploring innovative learning solutions, 
                I'd love to connect and share insights.
              </p>
              
              <div className="cta-features">
                <div className="cta-feature">
                  <span className="cta-feature-icon">💡</span>
                  <span>Educational Consulting & Curriculum Design</span>
                </div>
                <div className="cta-feature">
                  <span className="cta-feature-icon">🛠️</span>
                  <span>Custom EdTech Tool Development</span>
                </div>
                <div className="cta-feature">
                  <span className="cta-feature-icon">🎯</span>
                  <span>Research-Backed Teaching Strategies</span>
                </div>
              </div>
            </div>
            
            <div className="cta-actions">
              <Link href="/services/" className="btn-primary">
                Explore Services
              </Link>
              <Link href="/me/" className="btn-secondary">
                About My Journey
              </Link>
              <div className="contact-hint">
                <p>Or connect directly:</p>
                <a href="https://linkedin.com/in/brandonjplambert" className="contact-link" target="_blank" rel="noopener noreferrer">
                  LinkedIn Profile →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Development Links - Remove in production */}
      <section className="py-8 bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-200 dark:border-yellow-700">
        <div className="container">
          <div className="text-center">
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">Development Tools:</p>
            <div className="flex gap-4 justify-center">
              <Link 
                href="/test-db" 
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition text-sm"
              >
                Test Database
              </Link>
              <Link 
                href="/admin" 
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm"
              >
                Admin Panel
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default HomePage;