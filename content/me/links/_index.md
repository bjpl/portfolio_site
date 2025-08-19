---
title: "Links & Resources"
date: 2025-01-18
draft: false
description: "Curated collection of inspiring content from Instagram, YouTube, and around the web"
layout: "links"
---

# Weekly Links Roundup

A curated collection of content I find inspiring, educational, or just plain interesting. Updated weekly.

## Instagram Highlights

<div class="instagram-grid">
    <!-- Example Instagram embeds - replace with actual embed codes -->
    <div class="instagram-post">
        <blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="https://www.instagram.com/p/EXAMPLE1/" style="width: 100%;">
            <div style="padding: 16px;">
                <p>Loading Instagram content...</p>
            </div>
        </blockquote>
    </div>
    
    <div class="instagram-post">
        <blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="https://www.instagram.com/p/EXAMPLE2/" style="width: 100%;">
            <div style="padding: 16px;">
                <p>Loading Instagram content...</p>
            </div>
        </blockquote>
    </div>
</div>

## YouTube Picks

<div class="youtube-grid">
    <!-- Example YouTube embeds - replace with actual video IDs -->
    <div class="youtube-video">
        <iframe width="560" height="315" 
                src="https://www.youtube.com/embed/dQw4w9WgXcQ" 
                title="YouTube video player" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen>
        </iframe>
    </div>
    
    <div class="youtube-video">
        <iframe width="560" height="315" 
                src="https://www.youtube.com/embed/dQw4w9WgXcQ" 
                title="YouTube video player" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen>
        </iframe>
    </div>
</div>

## Web Discoveries

<div class="web-links">
    <article class="link-card">
        <h3><a href="https://example.com" target="_blank" rel="noopener">Interesting Article Title</a></h3>
        <p>Brief description of why this article is worth reading. This could be about education, technology, or language learning.</p>
        <span class="link-source">Source: Example.com</span>
    </article>
    
    <article class="link-card">
        <h3><a href="https://example.com" target="_blank" rel="noopener">Another Great Resource</a></h3>
        <p>Description of this resource and why it's valuable for educators or language learners.</p>
        <span class="link-source">Source: Example.com</span>
    </article>
    
    <article class="link-card">
        <h3><a href="https://example.com" target="_blank" rel="noopener">Tool or Platform Discovery</a></h3>
        <p>A new tool or platform that's changing how we approach education or language learning.</p>
        <span class="link-source">Source: Example.com</span>
    </article>
</div>

## Podcasts & Audio

<div class="podcast-list">
    <div class="podcast-item">
        <h4>🎧 Podcast Episode Title</h4>
        <p>Brief description of the episode and key takeaways.</p>
        <a href="#" target="_blank" rel="noopener" class="listen-link">Listen →</a>
    </div>
    
    <div class="podcast-item">
        <h4>🎧 Another Great Episode</h4>
        <p>What made this episode particularly insightful or interesting.</p>
        <a href="#" target="_blank" rel="noopener" class="listen-link">Listen →</a>
    </div>
</div>

<style>
.instagram-grid, .youtube-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    margin: 2rem 0;
}

.instagram-post, .youtube-video {
    background: var(--color-surface, #f7f7f7);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.youtube-video iframe {
    width: 100%;
    height: auto;
    aspect-ratio: 16/9;
}

.web-links {
    display: grid;
    gap: 1.5rem;
    margin: 2rem 0;
}

.link-card {
    padding: 1.5rem;
    background: var(--color-surface, #f7f7f7);
    border-radius: 12px;
    border-left: 4px solid #667eea;
    transition: transform 0.2s, box-shadow 0.2s;
}

.link-card:hover {
    transform: translateX(4px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
}

.link-card h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
}

.link-card h3 a {
    color: var(--color-text-primary, #1a202c);
    text-decoration: none;
    border-bottom: 2px solid transparent;
    transition: border-color 0.2s;
}

.link-card h3 a:hover {
    border-bottom-color: #667eea;
}

.link-card p {
    color: var(--color-text-secondary, #4a5568);
    line-height: 1.6;
    margin: 0.5rem 0;
}

.link-source {
    display: inline-block;
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: var(--color-text-muted, #718096);
    font-style: italic;
}

.podcast-list {
    display: grid;
    gap: 1rem;
    margin: 2rem 0;
}

.podcast-item {
    padding: 1.25rem;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05));
    border-radius: 12px;
    border: 1px solid rgba(102, 126, 234, 0.2);
}

.podcast-item h4 {
    margin: 0 0 0.5rem 0;
    color: var(--color-text-primary, #1a202c);
}

.podcast-item p {
    color: var(--color-text-secondary, #4a5568);
    margin: 0.5rem 0;
}

.listen-link {
    display: inline-block;
    margin-top: 0.5rem;
    color: #667eea;
    text-decoration: none;
    font-weight: 600;
    transition: transform 0.2s;
}

.listen-link:hover {
    transform: translateX(4px);
}

/* Dark mode adjustments */
[data-theme="dark"] .link-card,
[data-theme="dark"] .instagram-post,
[data-theme="dark"] .youtube-video {
    background: var(--color-surface, #2d3748);
}

[data-theme="dark"] .podcast-item {
    background: linear-gradient(135deg, rgba(159, 122, 234, 0.1), rgba(139, 92, 192, 0.1));
    border-color: rgba(159, 122, 234, 0.3);
}

/* Responsive design */
@media (max-width: 768px) {
    .instagram-grid, .youtube-grid {
        grid-template-columns: 1fr;
    }
}
</style>

<!-- Instagram embed script -->
<script async src="//www.instagram.com/embed.js"></script>