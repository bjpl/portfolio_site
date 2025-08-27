import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * GET /api/links
 * Returns all links data with optional filtering and search
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const category = searchParams.get('category');
    const section = searchParams.get('section');
    const limit = parseInt(searchParams.get('limit') || '0');

    // Read links data
    const filePath = path.join(process.cwd(), 'data', 'links.json');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const linksData = JSON.parse(fileContents);

    let filteredData = { ...linksData };

    // Filter by section if specified
    if (section) {
      filteredData.sections = filteredData.sections.filter(s => s.id === section);
    }

    // Search functionality
    if (query) {
      const searchTerm = query.toLowerCase();
      
      filteredData.sections = filteredData.sections.map(section => ({
        ...section,
        categories: section.categories.map(cat => ({
          ...cat,
          links: cat.links.filter(link => 
            link.title.toLowerCase().includes(searchTerm) ||
            link.description.toLowerCase().includes(searchTerm) ||
            link.tags.some(tag => tag.toLowerCase().includes(searchTerm))
          )
        })).filter(cat => cat.links.length > 0)
      })).filter(section => section.categories.length > 0);
    }

    // Filter by category if specified
    if (category) {
      filteredData.sections = filteredData.sections.map(section => ({
        ...section,
        categories: section.categories.filter(cat => 
          cat.title.toLowerCase().includes(category.toLowerCase())
        )
      })).filter(section => section.categories.length > 0);
    }

    // Apply limit if specified
    if (limit > 0) {
      filteredData.sections = filteredData.sections.map(section => ({
        ...section,
        categories: section.categories.map(cat => ({
          ...cat,
          links: cat.links.slice(0, limit)
        }))
      }));
    }

    return NextResponse.json(filteredData);
  } catch (error) {
    console.error('Error fetching links:', error);
    return NextResponse.json(
      { error: 'Failed to fetch links' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/links/stats
 * Returns statistics about the links collection
 */
export async function HEAD(request) {
  try {
    const filePath = path.join(process.cwd(), 'data', 'links.json');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const linksData = JSON.parse(fileContents);
    
    const stats = {
      totalSections: linksData.sections.length,
      totalCategories: linksData.sections.reduce((acc, section) => acc + section.categories.length, 0),
      totalLinks: linksData.sections.reduce((acc, section) => 
        acc + section.categories.reduce((catAcc, category) => catAcc + category.links.length, 0), 0
      ),
      sectionStats: linksData.sections.map(section => ({
        id: section.id,
        title: section.title,
        categories: section.categories.length,
        links: section.categories.reduce((acc, category) => acc + category.links.length, 0)
      }))
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error getting links stats:', error);
    return NextResponse.json(
      { error: 'Failed to get links statistics' },
      { status: 500 }
    );
  }
}