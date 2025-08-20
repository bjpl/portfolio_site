#!/usr/bin/env python3
"""
Analyze links data to identify missing information and verify completeness.
"""

import re
from collections import defaultdict

def analyze_links_data(filepath):
    """Analyze all links and generate statistics."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract all links
    link_pattern = r'<a href="([^"]+)"[^>]*data-tags="([^"]*)"[^>]*>([^<]+)</a>'
    links = re.findall(link_pattern, content)
    
    # Statistics
    stats = {
        'total_links': len(links),
        'categories': defaultdict(int),
        'countries': defaultdict(int),
        'missing_tags': [],
        'duplicate_usernames': defaultdict(list),
        'potential_typos': []
    }
    
    # Track usernames for duplicates
    usernames_seen = {}
    
    # Analyze each link
    for url, tags, text in links:
        # Extract username
        username = ''
        if 'instagram.com/' in url:
            username = url.split('instagram.com/')[-1].strip('/')
        
        # Check for duplicates
        if username in usernames_seen:
            stats['duplicate_usernames'][username].append(text)
        else:
            usernames_seen[username] = text
        
        # Count categories from tags
        if 'embassy' in tags or 'consulate' in tags:
            stats['categories']['Diplomatic'] += 1
        elif 'museum' in tags or 'culture' in tags or 'teatro' in tags:
            stats['categories']['Cultural'] += 1
        elif 'government' in tags or 'ministry' in tags or 'alcaldia' in tags:
            stats['categories']['Government'] += 1
        elif 'food' in tags or 'restaurant' in tags or 'coffee' in tags:
            stats['categories']['Food & Beverage'] += 1
        elif 'university' in tags or 'education' in tags:
            stats['categories']['Education'] += 1
        elif 'travel' in tags or 'tourism' in tags:
            stats['categories']['Travel'] += 1
        else:
            stats['categories']['Other'] += 1
        
        # Extract country from emoji/text
        if '🇨🇴' in text or 'Colombia' in text:
            stats['countries']['Colombia'] += 1
        elif '🇲🇽' in text or 'Mexico' in text or 'Mexican' in text:
            stats['countries']['Mexico'] += 1
        elif '🇻🇪' in text or 'Venezuela' in text:
            stats['countries']['Venezuela'] += 1
        elif '🇺🇸' in text or 'USA' in text:
            stats['countries']['USA'] += 1
        elif '🇧🇷' in text or 'Brazil' in text:
            stats['countries']['Brazil'] += 1
        elif '🇦🇷' in text or 'Argentina' in text:
            stats['countries']['Argentina'] += 1
        elif '🇨🇱' in text or 'Chile' in text:
            stats['countries']['Chile'] += 1
        elif '🇵🇪' in text or 'Peru' in text:
            stats['countries']['Peru'] += 1
        else:
            stats['countries']['Other'] += 1
        
        # Check for missing or minimal tags
        if len(tags.split()) < 5:
            stats['missing_tags'].append(f"{text} ({username})")
        
        # Check for potential typos in usernames
        if username and ('_' in username and '-' in username):
            stats['potential_typos'].append(f"{text} ({username})")
    
    return stats, links

def find_missing_social_urls():
    """Identify accounts that could have website/YouTube URLs."""
    
    # Read current JavaScript mappings
    js_file = r"C:\Users\brand\Development\Project_Workspace\portfolio_site\static\js\links-hover-menu.js"
    with open(js_file, 'r', encoding='utf-8') as f:
        js_content = f.read()
    
    # Major brands/organizations that should have websites
    should_have_website = [
        'coca-cola', 'pepsi', 'nestle', 'unilever', 'pg', 'nike', 'adidas',
        'samsung', 'lg', 'sony', 'microsoft', 'google', 'facebook', 'twitter',
        'netflix', 'spotify', 'uber', 'airbnb', 'amazon', 'mercadolibre',
        'rappi', 'didi', 'cabify', 'falabella', 'exito', 'jumbo', 'carulla',
        'olimpica', 'ara', 'd1', 'justo&bueno', 'makro', 'pricesmart',
        'homecenter', 'easy', 'constructor', 'corona', 'argos', 'cemex',
        'ecopetrol', 'isagen', 'epm', 'codensa', 'gasnatural', 'claro',
        'movistar', 'tigo', 'virgin', 'wom', 'avantel', 'directv', 'telmex'
    ]
    
    # Government/institutional that should have websites
    should_have_gov_website = [
        'dane', 'dian', 'invima', 'supersociedades', 'superindustria',
        'creg', 'cra', 'anla', 'ideam', 'igac', 'sgc', 'ins', 'invias',
        'aerocivil', 'supertransporte', 'mintransporte', 'minvivienda',
        'findeter', 'fiduprevisora', 'fogafin', 'fna', 'icbf', 'sena',
        'colpensiones', 'positiva', 'satena', 'ecopetrol', 'isa', 'isagen'
    ]
    
    return should_have_website, should_have_gov_website

def generate_completion_report(filepath):
    """Generate a report of what needs to be completed."""
    stats, links = analyze_links_data(filepath)
    brands, gov = find_missing_social_urls()
    
    print("=" * 60)
    print("LINKS DATA ANALYSIS REPORT")
    print("=" * 60)
    
    print(f"\n📊 OVERALL STATISTICS:")
    print(f"  Total Links: {stats['total_links']}")
    print(f"  Unique Usernames: {len(set([l[0].split('/')[-1].strip('/') for l in links]))}")
    
    print(f"\n📁 CATEGORIES BREAKDOWN:")
    for category, count in sorted(stats['categories'].items(), key=lambda x: x[1], reverse=True):
        print(f"  {category}: {count}")
    
    print(f"\n🌍 COUNTRIES BREAKDOWN:")
    for country, count in sorted(stats['countries'].items(), key=lambda x: x[1], reverse=True):
        print(f"  {country}: {count}")
    
    if stats['duplicate_usernames']:
        print(f"\n⚠️ DUPLICATE USERNAMES FOUND:")
        for username, appearances in stats['duplicate_usernames'].items():
            if len(appearances) > 1:
                print(f"  @{username}: {', '.join(appearances)}")
    
    if stats['missing_tags']:
        print(f"\n🏷️ LINKS WITH MINIMAL TAGS (<5):")
        for link in stats['missing_tags'][:10]:  # Show first 10
            print(f"  {link}")
        if len(stats['missing_tags']) > 10:
            print(f"  ... and {len(stats['missing_tags']) - 10} more")
    
    # Check for major brands in our links
    print(f"\n🏢 MAJOR BRANDS TO ADD WEBSITES FOR:")
    brand_matches = []
    for url, tags, text in links:
        username = url.split('/')[-1].strip('/').lower()
        for brand in brands:
            if brand in username or brand in text.lower():
                brand_matches.append(f"  {text} (@{username})")
                break
    
    if brand_matches:
        for match in brand_matches[:20]:  # Show first 20
            print(match)
    
    # Suggest improvements
    print(f"\n💡 RECOMMENDATIONS:")
    print(f"  1. Add website URLs for {len(brand_matches)} major brands")
    print(f"  2. Enhance tags for {len(stats['missing_tags'])} links with minimal tags")
    print(f"  3. Check {len(stats['duplicate_usernames'])} potential duplicate accounts")
    print(f"  4. Add YouTube channels for media organizations and brands")
    print(f"  5. Verify all Instagram URLs are still active")
    
    return stats, links

def main():
    filepath = r"C:\Users\brand\Development\Project_Workspace\portfolio_site\content\me\links\_index.md"
    stats, links = generate_completion_report(filepath)
    
    # Generate a list of usernames for batch verification
    print(f"\n📝 GENERATING USERNAME LIST FOR VERIFICATION...")
    usernames = []
    for url, _, _ in links:
        if 'instagram.com/' in url:
            username = url.split('instagram.com/')[-1].strip('/')
            usernames.append(username)
    
    # Save usernames to file for batch checking
    with open('instagram_usernames.txt', 'w', encoding='utf-8') as f:
        for username in sorted(set(usernames)):
            f.write(f"{username}\n")
    
    print(f"✅ Saved {len(set(usernames))} unique usernames to instagram_usernames.txt")

if __name__ == "__main__":
    main()