'use client';

import Link from 'next/link';

export default function LayoutTestPage() {
  return (
    <div className="space-y-8">
      {/* Header Test */}
      <section className="bg-brand-surface p-6 rounded-lg border border-brand-border">
        <h1 className="text-3xl font-bold text-brand-text-primary mb-4">
          Layout System Test Page
        </h1>
        <p className="text-brand-text-secondary mb-4">
          This page tests all the layout components and styling system we've created.
        </p>
        
        <div className="space-y-2 text-sm text-brand-text-muted">
          <p><strong>Header:</strong> Sticky navigation with logo and theme toggle</p>
          <p><strong>Navigation:</strong> Responsive menu from navigation.json data</p>
          <p><strong>Footer:</strong> Professional footer with social links</p>
          <p><strong>Theme:</strong> Dark/light mode with smooth transitions</p>
        </div>
      </section>

      {/* Color Palette Test */}
      <section className="bg-brand-surface p-6 rounded-lg border border-brand-border">
        <h2 className="text-2xl font-semibold text-brand-text-primary mb-6">
          Color Palette Test
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <div className="w-full h-16 bg-brand-primary rounded-lg"></div>
            <p className="text-xs text-brand-text-muted">Primary</p>
          </div>
          
          <div className="space-y-2">
            <div className="w-full h-16 bg-brand-accent rounded-lg"></div>
            <p className="text-xs text-brand-text-muted">Accent</p>
          </div>
          
          <div className="space-y-2">
            <div className="w-full h-16 bg-brand-success rounded-lg"></div>
            <p className="text-xs text-brand-text-muted">Success</p>
          </div>
          
          <div className="space-y-2">
            <div className="w-full h-16 bg-brand-surface-alt rounded-lg border border-brand-border"></div>
            <p className="text-xs text-brand-text-muted">Surface Alt</p>
          </div>
        </div>
      </section>

      {/* Typography Test */}
      <section className="bg-brand-surface p-6 rounded-lg border border-brand-border">
        <h2 className="text-2xl font-semibold text-brand-text-primary mb-6">
          Typography Test
        </h2>
        
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-brand-text-primary">Heading 1</h1>
          <h2 className="text-3xl font-semibold text-brand-text-primary">Heading 2</h2>
          <h3 className="text-2xl font-medium text-brand-text-primary">Heading 3</h3>
          <p className="text-lg text-brand-text-secondary">
            Large paragraph text with good readability and line height.
          </p>
          <p className="text-base text-brand-text-secondary">
            Regular paragraph text that should be comfortable to read in both light and dark modes.
          </p>
          <p className="text-sm text-brand-text-muted">
            Small text for captions and secondary information.
          </p>
        </div>
      </section>

      {/* Button Test */}
      <section className="bg-brand-surface p-6 rounded-lg border border-brand-border">
        <h2 className="text-2xl font-semibold text-brand-text-primary mb-6">
          Button Styles Test
        </h2>
        
        <div className="flex flex-wrap gap-4">
          <button className="btn-primary">Primary Button</button>
          <button className="btn-secondary">Secondary Button</button>
          <button className="btn-accent">Accent Button</button>
        </div>
      </section>

      {/* Navigation Test */}
      <section className="bg-brand-surface p-6 rounded-lg border border-brand-border">
        <h2 className="text-2xl font-semibold text-brand-text-primary mb-6">
          Navigation Links Test
        </h2>
        
        <div className="space-y-2">
          {[
            { name: "Teaching & Learning", url: "/teaching-learning/" },
            { name: "Tools", url: "/tools/" },
            { name: "Writing", url: "/writing/" },
            { name: "Photography", url: "/photography/" },
            { name: "About", url: "/me/" }
          ].map((item) => (
            <div key={item.name}>
              <Link 
                href={item.url}
                className="text-brand-primary hover:text-brand-primary-hover transition-colors duration-200"
              >
                {item.name}
              </Link>
              <span className="text-brand-text-muted text-sm ml-2">→ {item.url}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Responsive Test */}
      <section className="bg-brand-surface p-6 rounded-lg border border-brand-border">
        <h2 className="text-2xl font-semibold text-brand-text-primary mb-6">
          Responsive Design Test
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-brand-surface-alt p-4 rounded-lg">
            <h3 className="font-semibold text-brand-text-primary mb-2">Mobile First</h3>
            <p className="text-sm text-brand-text-secondary">
              Single column on mobile devices
            </p>
          </div>
          
          <div className="bg-brand-surface-alt p-4 rounded-lg">
            <h3 className="font-semibold text-brand-text-primary mb-2">Tablet</h3>
            <p className="text-sm text-brand-text-secondary">
              Two columns on medium screens
            </p>
          </div>
          
          <div className="bg-brand-surface-alt p-4 rounded-lg">
            <h3 className="font-semibold text-brand-text-primary mb-2">Desktop</h3>
            <p className="text-sm text-brand-text-secondary">
              Three columns on large screens
            </p>
          </div>
        </div>
      </section>

      {/* Back to Home */}
      <section className="text-center">
        <Link href="/" className="btn-primary">
          ← Back to Home
        </Link>
      </section>
    </div>
  );
}