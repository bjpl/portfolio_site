# Component Architecture Design Specification

## Overview

This document defines the component architecture for the Next.js 14 portfolio site, focusing on scalability, maintainability, and performance optimization through server-first design principles.

## Architecture Principles

### 1. Server-First Design
- **Default to Server Components**: All components are Server Components unless interactivity is required
- **Strategic Client Components**: Use `'use client'` directive only when necessary
- **Progressive Enhancement**: Build from working non-JavaScript baseline

### 2. Component Hierarchy

```
Component Architecture Hierarchy
┌─────────────────────────────────┐
│         Layout Components        │
│ ├── RootLayout (app/layout.tsx) │
│ ├── AuthLayout (admin layout)   │
│ ├── PublicLayout (main site)    │
│ └── ErrorLayout (error pages)   │
├─────────────────────────────────┤
│         Page Components          │
│ ├── HomePage                    │
│ ├── BlogPage                    │
│ ├── ProjectPage                 │
│ └── AdminDashboard              │
├─────────────────────────────────┤
│       Feature Components        │
│ ├── ContentEditor               │
│ ├── MediaLibrary                │
│ ├── UserProfile                 │
│ └── Analytics Dashboard         │
├─────────────────────────────────┤
│         UI Components           │
│ ├── Button                      │
│ ├── Input                       │
│ ├── Modal                       │
│ └── DataTable                   │
└─────────────────────────────────┘
```

### 3. Component Categories

#### Server Components (Default)
- **Purpose**: Data fetching, SEO optimization, performance
- **Characteristics**: No client-side JavaScript, can access server resources
- **Use Cases**: Content display, layout, data presentation

#### Client Components (Selective)
- **Purpose**: User interaction, browser APIs, state management
- **Characteristics**: Hydrated on client, can use hooks and event handlers
- **Use Cases**: Forms, real-time updates, interactive features

## Component Design Patterns

### 1. Container-Presenter Pattern

```typescript
// Container Component (Server)
async function BlogPageContainer({ slug }: { slug: string }) {
  const post = await getBlogPost(slug);
  
  return <BlogPresenter post={post} />;
}

// Presenter Component (Server)
function BlogPresenter({ post }: { post: BlogPost }) {
  return (
    <article className="prose max-w-4xl mx-auto">
      <BlogHeader post={post} />
      <BlogContent content={post.content} />
      <BlogFooter post={post} />
    </article>
  );
}

// Interactive Component (Client)
'use client';
function BlogInteractions({ postId }: { postId: string }) {
  const [liked, setLiked] = useState(false);
  
  return (
    <div className="flex gap-4">
      <LikeButton postId={postId} liked={liked} onToggle={setLiked} />
      <ShareButton postId={postId} />
      <CommentButton postId={postId} />
    </div>
  );
}
```

### 2. Compound Components Pattern

```typescript
// Main Component
function DataTable({ children, ...props }: DataTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200" {...props}>
        {children}
      </table>
    </div>
  );
}

// Sub-components
DataTable.Header = function DataTableHeader({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-gray-50">
      <tr>{children}</tr>
    </thead>
  );
};

DataTable.Body = function DataTableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-gray-200">{children}</tbody>;
};

DataTable.Row = function DataTableRow({ children }: { children: React.ReactNode }) {
  return <tr className="hover:bg-gray-50">{children}</tr>;
};

DataTable.Cell = function DataTableCell({ children }: { children: React.ReactNode }) {
  return <td className="px-6 py-4 whitespace-nowrap text-sm">{children}</td>;
};
```

### 3. Render Props Pattern

```typescript
// Flexible data fetching component
async function DataProvider<T>({
  fetcher,
  children
}: {
  fetcher: () => Promise<T>;
  children: (data: T) => React.ReactNode;
}) {
  const data = await fetcher();
  
  return <>{children(data)}</>;
}

// Usage
function ProjectsList() {
  return (
    <DataProvider fetcher={() => getProjects()}>
      {(projects) => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </DataProvider>
  );
}
```

## Core Component Specifications

### Layout Components

#### 1. Root Layout
```typescript
// app/layout.tsx
import { Inter } from 'next/font/google';
import { UserProvider } from '@auth0/nextjs-auth0/client';
import { ThemeProvider } from './providers/theme-provider';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="antialiased">
        <UserProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <div className="min-h-screen bg-background font-sans antialiased">
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </ThemeProvider>
        </UserProvider>
      </body>
    </html>
  );
}
```

#### 2. Admin Layout (Protected)
```typescript
// app/admin/layout.tsx
import { redirect } from 'next/navigation';
import { getSession } from '@auth0/nextjs-auth0';
import { AdminSidebar } from '@/components/admin/sidebar';
import { AdminHeader } from '@/components/admin/header';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  
  if (!session?.user) {
    redirect('/api/auth/login?returnTo=/admin');
  }
  
  if (!hasAdminRole(session.user)) {
    redirect('/unauthorized');
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar user={session.user} />
      <div className="flex-1 flex flex-col">
        <AdminHeader user={session.user} />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### UI Components

#### 1. Button Component
```typescript
// components/ui/Button.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "underline-offset-4 hover:underline text-primary"
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3 rounded-md",
        lg: "h-11 px-8 rounded-md",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
```

#### 2. Data Table Component
```typescript
// components/ui/DataTable.tsx
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

  return (
    <div className="space-y-4">
      {searchKey && (
        <div className="flex items-center justify-between">
          <Input
            placeholder={searchPlaceholder || "Search..."}
            value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn(searchKey)?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
          <DataTableViewOptions table={table} />
        </div>
      )}
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <DataTablePagination table={table} />
    </div>
  );
}
```

### Feature Components

#### 1. Content Editor (Client Component)
```typescript
// components/content/ContentEditor.tsx
'use client';

import { useState, useCallback } from 'react';
import { useEditor } from '@/hooks/useEditor';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { RichTextEditor } from './RichTextEditor';

interface ContentEditorProps {
  content?: {
    id?: string;
    title: string;
    slug: string;
    content: string;
    status: 'draft' | 'published';
  };
  onSave: (content: any) => Promise<void>;
  onCancel: () => void;
}

export function ContentEditor({ content, onSave, onCancel }: ContentEditorProps) {
  const [formData, setFormData] = useState({
    title: content?.title || '',
    slug: content?.slug || '',
    content: content?.content || '',
    status: content?.status || 'draft' as const
  });

  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await onSave(formData);
    } finally {
      setIsLoading(false);
    }
  }, [formData, onSave]);

  const updateField = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-generate slug from title
    if (field === 'title' && !content?.id) {
      const slug = value.toLowerCase()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      setFormData(prev => ({ ...prev, slug }));
    }
  }, [content?.id]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Input
            label="Title"
            value={formData.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="Enter content title..."
            required
          />
          
          <Input
            label="Slug"
            value={formData.slug}
            onChange={(e) => updateField('slug', e.target.value)}
            placeholder="url-friendly-slug"
            pattern="^[a-z0-9-]+$"
            required
          />
          
          <div>
            <label className="block text-sm font-medium mb-2">Content</label>
            <RichTextEditor
              value={formData.content}
              onChange={(value) => updateField('content', value)}
              placeholder="Start writing..."
            />
          </div>
        </div>
        
        <div className="space-y-6">
          <ContentMetadata
            status={formData.status}
            onStatusChange={(status) => updateField('status', status)}
          />
          
          <MediaPicker
            onSelect={(media) => {
              // Insert media into content
            }}
          />
        </div>
      </div>
      
      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        
        <div className="flex gap-2">
          <Button
            type="submit"
            variant="outline"
            disabled={isLoading}
            onClick={() => updateField('status', 'draft')}
          >
            Save Draft
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            onClick={() => updateField('status', 'published')}
          >
            {isLoading ? 'Publishing...' : 'Publish'}
          </Button>
        </div>
      </div>
    </form>
  );
}
```

#### 2. Media Library Component
```typescript
// components/media/MediaLibrary.tsx
import { getMediaFiles } from '@/lib/db/media';
import { MediaGrid } from './MediaGrid';
import { MediaUpload } from './MediaUpload';
import { MediaFilters } from './MediaFilters';

interface MediaLibraryProps {
  selectable?: boolean;
  onSelect?: (media: MediaFile) => void;
  filters?: {
    type?: 'image' | 'video' | 'document';
    category?: string;
  };
}

export async function MediaLibrary({ 
  selectable = false, 
  onSelect,
  filters 
}: MediaLibraryProps) {
  const media = await getMediaFiles(filters);
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Media Library</h2>
        <MediaUpload onUpload={() => router.refresh()} />
      </div>
      
      <MediaFilters currentFilters={filters} />
      
      <MediaGrid
        media={media}
        selectable={selectable}
        onSelect={onSelect}
      />
    </div>
  );
}
```

## Component Performance Optimization

### 1. Server Component Optimization

```typescript
// Efficient data fetching with caching
import { cache } from 'react';
import { unstable_cache } from 'next/cache';

// Cache expensive database queries
const getCachedProjects = cache(async () => {
  return await getProjects();
});

// Cache with Next.js cache for longer duration
const getCachedBlogPosts = unstable_cache(
  async () => await getBlogPosts(),
  ['blog-posts'],
  { revalidate: 3600 } // 1 hour
);
```

### 2. Client Component Optimization

```typescript
// Lazy loading and code splitting
import dynamic from 'next/dynamic';
import { lazy, Suspense } from 'react';

const RichTextEditor = dynamic(
  () => import('./RichTextEditor'),
  { 
    ssr: false,
    loading: () => <div>Loading editor...</div>
  }
);

// React.memo for expensive renders
const ProjectCard = React.memo(function ProjectCard({ project }: { project: Project }) {
  return (
    <div className="border rounded-lg p-6">
      <h3 className="text-xl font-semibold">{project.title}</h3>
      <p className="text-gray-600">{project.description}</p>
    </div>
  );
});
```

### 3. Bundle Optimization

```typescript
// Tree-shaking friendly imports
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';

// Avoid importing entire libraries
import { format } from 'date-fns/format';
import { parseISO } from 'date-fns/parseISO';
```

## Accessibility Standards

### 1. ARIA Implementation
```typescript
// Proper ARIA attributes
function Modal({ isOpen, onClose, children }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <div className="bg-black bg-opacity-50" onClick={onClose} />
      <div className="bg-white rounded-lg p-6">
        {children}
      </div>
    </div>
  );
}
```

### 2. Keyboard Navigation
```typescript
// Keyboard event handling
function useKeyboardNavigation(onEscape: () => void) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onEscape();
      }
    }
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onEscape]);
}
```

### 3. Focus Management
```typescript
// Focus trap for modals
import { useFocusTrap } from '@/hooks/useFocusTrap';

function Modal({ isOpen, children }: ModalProps) {
  const trapRef = useFocusTrap(isOpen);
  
  return (
    <div ref={trapRef}>
      {children}
    </div>
  );
}
```

## Testing Strategy

### 1. Component Testing
```typescript
// components/ui/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('calls onClick handler', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies variant classes correctly', () => {
    render(<Button variant="destructive">Delete</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-destructive');
  });
});
```

### 2. Integration Testing
```typescript
// components/content/ContentEditor.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContentEditor } from './ContentEditor';

describe('ContentEditor', () => {
  it('saves content correctly', async () => {
    const handleSave = jest.fn();
    render(<ContentEditor onSave={handleSave} onCancel={() => {}} />);
    
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Test Post' }
    });
    
    fireEvent.click(screen.getByText('Publish'));
    
    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledWith({
        title: 'Test Post',
        slug: 'test-post',
        content: '',
        status: 'published'
      });
    });
  });
});
```

## Component Library Organization

### 1. Directory Structure
```
components/
├── ui/                    # Base UI components
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Modal.tsx
│   └── index.ts          # Barrel exports
├── layout/               # Layout components
│   ├── Header.tsx
│   ├── Footer.tsx
│   └── Navigation.tsx
├── content/              # Content-related components
│   ├── BlogCard.tsx
│   ├── ProjectCard.tsx
│   └── ContentEditor.tsx
├── admin/               # Admin panel components
│   ├── Dashboard.tsx
│   ├── UserManager.tsx
│   └── Analytics.tsx
└── providers/           # Context providers
    ├── ThemeProvider.tsx
    └── AuthProvider.tsx
```

### 2. Export Strategy
```typescript
// components/ui/index.ts
export { Button } from './Button';
export { Input } from './Input';
export { Modal } from './Modal';
export { DataTable } from './DataTable';

// Usage
import { Button, Input, Modal } from '@/components/ui';
```

This component architecture provides a solid foundation for building a scalable, maintainable, and performant Next.js application with clear separation of concerns and optimal rendering strategies.