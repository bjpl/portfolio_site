#!/usr/bin/env python3
"""
Extract all links to CSV with columns for Instagram, YouTube, and Website URLs.
"""

import re
import csv

def extract_links_to_csv(filepath, output_file):
    """Extract all links and create CSV with social media URLs."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract all links
    link_pattern = r'<a href="([^"]+)"[^>]*data-tags="([^"]*)"[^>]*>([^<]+)</a>'
    links = re.findall(link_pattern, content)
    
    # Prepare CSV data
    csv_data = []
    
    for url, tags, text in links:
        # Extract username from Instagram URL
        username = ''
        if 'instagram.com/' in url:
            username = url.split('instagram.com/')[-1].strip('/')
        
        # Clean up text (remove emojis and extra spaces)
        clean_text = text.strip()
        
        # Determine category based on tags
        category = 'Other'
        if 'embassy' in tags or 'consulate' in tags:
            category = 'Diplomatic'
        elif 'museum' in tags or 'culture' in tags or 'teatro' in tags or 'library' in tags:
            category = 'Cultural'
        elif 'government' in tags or 'ministry' in tags or 'alcaldia' in tags:
            category = 'Government'
        elif 'food' in tags or 'restaurant' in tags or 'coffee' in tags:
            category = 'Food & Beverage'
        elif 'university' in tags or 'education' in tags:
            category = 'Education'
        elif 'travel' in tags or 'tourism' in tags:
            category = 'Travel'
        elif 'ngo' in tags or 'organization' in tags:
            category = 'Organization'
        
        # Add placeholder URLs for YouTube and Website
        youtube_url = ''
        website_url = ''
        
        # Known mappings (can be expanded)
        website_mappings = {
            'embamexcol': 'https://embamex.sre.gob.mx/colombia/',
            'embamexeua': 'https://embamex.sre.gob.mx/eua/',
            'alcaldiabogota': 'https://bogota.gov.co/',
            'presidenciacol': 'https://www.presidencia.gov.co/',
            'mincultura': 'https://www.mincultura.gov.co/',
            'mineducacioncol': 'https://www.mineducacion.gov.co/',
            'mintrabajocol': 'https://www.mintrabajo.gov.co/',
            'minsaludcol': 'https://www.minsalud.gov.co/',
            'banrepcultural': 'https://www.banrepcultural.org/',
            'museonacional': 'https://museonacional.gov.co/',
            'mambo': 'https://mambogota.com/',
            'uniandes': 'https://uniandes.edu.co/',
            'uninorte': 'https://www.uninorte.edu.co/',
            'transmilenio': 'https://www.transmilenio.gov.co/',
            'metrodebogota': 'https://www.metrodebogota.gov.co/',
            'bancodebogota': 'https://www.bancodebogota.com/',
            'bancolombia': 'https://www.bancolombia.com/',
        }
        
        youtube_mappings = {
            'presidenciacol': 'https://www.youtube.com/@presidenciacolombia',
            'alcaldiabogota': 'https://www.youtube.com/@AlcaldiaBogota',
            'banrepcultural': 'https://www.youtube.com/@BanrepCultural',
            'museonacional': 'https://www.youtube.com/@museonacionaldecolombia',
            'mincultura': 'https://www.youtube.com/@MinisterioCulturaColombia',
            'mineducacioncol': 'https://www.youtube.com/@Mineducacion',
        }
        
        # Check for known mappings
        if username in website_mappings:
            website_url = website_mappings[username]
        if username in youtube_mappings:
            youtube_url = youtube_mappings[username]
        
        csv_data.append({
            'Name': clean_text,
            'Category': category,
            'Instagram_Username': username,
            'Instagram_URL': url,
            'YouTube_URL': youtube_url,
            'Website_URL': website_url,
            'Tags': tags
        })
    
    # Write to CSV
    with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['Name', 'Category', 'Instagram_Username', 'Instagram_URL', 'YouTube_URL', 'Website_URL', 'Tags']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        
        writer.writeheader()
        for row in csv_data:
            writer.writerow(row)
    
    return len(csv_data)

def main():
    filepath = r"C:\Users\brand\Development\Project_Workspace\portfolio_site\content\me\links\_index.md"
    output_file = r"C:\Users\brand\Development\Project_Workspace\portfolio_site\instagram_links_directory.csv"
    
    print("📊 EXTRACTING LINKS TO CSV")
    print("=" * 40)
    
    count = extract_links_to_csv(filepath, output_file)
    
    print(f"\n✅ Successfully exported {count} links to CSV")
    print(f"📁 File saved as: instagram_links_directory.csv")
    print("\nColumns included:")
    print("  - Name: Display name of the account")
    print("  - Category: Type of organization")
    print("  - Instagram_Username: Instagram handle")
    print("  - Instagram_URL: Full Instagram URL")
    print("  - YouTube_URL: YouTube channel (where known)")
    print("  - Website_URL: Official website (where known)")
    print("  - Tags: All search tags")

if __name__ == "__main__":
    main()