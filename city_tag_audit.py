#!/usr/bin/env python3
"""
Audit and add city-specific tags to improve local search.
"""

import re
from collections import defaultdict

def audit_city_tags(filepath):
    """Check for missing city tags."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract all links
    link_pattern = r'<a href="([^"]+)"[^>]*data-tags="([^"]*)"[^>]*>([^<]+)</a>'
    links = re.findall(link_pattern, content)
    
    print(f"🏙️ CITY TAG AUDIT - Checking {len(links)} links\n")
    
    city_mapping = {
        # Colombian cities
        'Bogotá': ['bogota', 'colombia', 'capital-city', 'distrito-capital'],
        'Bogota': ['bogota', 'colombia', 'capital-city', 'distrito-capital'],
        'Medellín': ['medellin', 'colombia', 'antioquia', 'city-of-eternal-spring'],
        'Medellin': ['medellin', 'colombia', 'antioquia', 'city-of-eternal-spring'],
        'Cali': ['cali', 'colombia', 'valle-del-cauca', 'salsa-capital'],
        'Barranquilla': ['barranquilla', 'colombia', 'atlantico', 'golden-gate'],
        'Cartagena': ['cartagena', 'colombia', 'bolivar', 'heroic-city', 'unesco-heritage'],
        'Bucaramanga': ['bucaramanga', 'colombia', 'santander', 'city-of-parks'],
        'Pereira': ['pereira', 'colombia', 'risaralda', 'coffee-axis'],
        'Manizales': ['manizales', 'colombia', 'caldas', 'coffee-axis'],
        'Armenia': ['armenia', 'colombia', 'quindio', 'coffee-axis'],
        'Popayán': ['popayan', 'colombia', 'cauca', 'white-city'],
        'Popayan': ['popayan', 'colombia', 'cauca', 'white-city'],
        'Santa Marta': ['santa-marta', 'colombia', 'magdalena', 'caribbean-coast'],
        
        # Mexican cities
        'Mexico City': ['mexico-city', 'cdmx', 'mexico', 'capital-city', 'megalopolis'],
        'Guadalajara': ['guadalajara', 'mexico', 'jalisco', 'pearl-of-west'],
        'Monterrey': ['monterrey', 'mexico', 'nuevo-leon', 'sultan-of-north'],
        
        # US cities
        'Washington': ['washington-dc', 'usa', 'capital-city', 'district-columbia'],
        'DC': ['washington-dc', 'usa', 'capital-city', 'district-columbia'],
        'Seattle': ['seattle', 'usa', 'washington-state', 'emerald-city', 'pacific-northwest'],
        'Atlanta': ['atlanta', 'usa', 'georgia', 'peach-state', 'southeast'],
        'Boston': ['boston', 'usa', 'massachusetts', 'new-england', 'beantown'],
        'Los Angeles': ['los-angeles', 'usa', 'california', 'la', 'city-of-angels'],
        'New York': ['new-york', 'usa', 'nyc', 'big-apple', 'empire-state'],
        'Chicago': ['chicago', 'usa', 'illinois', 'windy-city', 'midwest'],
        'Miami': ['miami', 'usa', 'florida', 'magic-city', 'southeast'],
        
        # South American cities
        'Buenos Aires': ['buenos-aires', 'argentina', 'capital-city', 'paris-of-south'],
        'São Paulo': ['sao-paulo', 'brazil', 'sampa', 'concrete-jungle'],
        'Rio': ['rio-de-janeiro', 'brazil', 'marvelous-city', 'cidade-maravilhosa'],
        'Lima': ['lima', 'peru', 'capital-city', 'city-of-kings'],
        'Santiago': ['santiago', 'chile', 'capital-city', 'metropolitan-region'],
        'Caracas': ['caracas', 'venezuela', 'capital-city', 'santiago-de-leon'],
        'Montevideo': ['montevideo', 'uruguay', 'capital-city', 'rio-de-la-plata'],
        'Quito': ['quito', 'ecuador', 'capital-city', 'middle-of-world'],
        'La Paz': ['la-paz', 'bolivia', 'administrative-capital', 'highest-capital'],
        
        # European cities
        'Madrid': ['madrid', 'spain', 'capital-city', 'villa-y-corte'],
        'Paris': ['paris', 'france', 'capital-city', 'city-of-light'],
        'Rome': ['rome', 'italy', 'capital-city', 'eternal-city'],
        'London': ['london', 'uk', 'capital-city', 'great-britain'],
        'Berlin': ['berlin', 'germany', 'capital-city', 'hauptstadt'],
        
        # Asian cities
        'Tokyo': ['tokyo', 'japan', 'capital-city', 'greater-tokyo'],
        'Seoul': ['seoul', 'south-korea', 'capital-city', 'special-city'],
        'Beijing': ['beijing', 'china', 'capital-city', 'peking'],
        'New Delhi': ['new-delhi', 'india', 'capital-city', 'ncr'],
        
        # Middle East
        'Beirut': ['beirut', 'lebanon', 'capital-city', 'paris-of-middle-east'],
    }
    
    fixes_needed = defaultdict(list)
    
    for url, tags, text in links:
        tag_list = tags.split() if tags else []
        
        # Check each city
        for city, city_tags in city_mapping.items():
            if city in text:
                for tag in city_tags:
                    if tag not in tag_list:
                        fixes_needed[(text, url)].append(tag)
    
    return fixes_needed

def apply_city_tags(filepath, fixes):
    """Apply city tag fixes."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    applied = defaultdict(int)
    
    for (text, url), tags_to_add in fixes.items():
        # Find the link
        pattern = f'<a href="{re.escape(url)}"[^>]*data-tags="([^"]*)"[^>]*>{re.escape(text)}</a>'
        match = re.search(pattern, content)
        
        if match:
            current_tags = set(match.group(1).split()) if match.group(1) else set()
            new_tags = current_tags | set(tags_to_add)
            
            old_link = match.group(0)
            new_tags_str = ' '.join(sorted(new_tags))
            new_link = re.sub(r'data-tags="[^"]*"', f'data-tags="{new_tags_str}"', old_link)
            
            content = content.replace(old_link, new_link)
            
            for tag in tags_to_add:
                applied[tag] += 1
    
    # Save
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return applied

def main():
    filepath = r"C:\Users\brand\Development\Project_Workspace\portfolio_site\content\me\links\_index.md"
    
    # Audit city tags
    fixes = audit_city_tags(filepath)
    
    if fixes:
        total_fixes = sum(len(tags) for tags in fixes.values())
        print(f"📍 Found {total_fixes} missing city tags across {len(fixes)} links\n")
        
        # Show examples
        for (text, url), tags in list(fixes.items())[:5]:
            print(f"• {text[:50]}")
            print(f"  Missing: {', '.join(tags[:3])}")
        
        if len(fixes) > 5:
            print(f"\n... and {len(fixes) - 5} more links need city tags")
        
        # Apply fixes
        if input("\n❓ Apply city tag fixes? (y/n): ").lower() == 'y':
            applied = apply_city_tags(filepath, fixes)
            
            print(f"\n✅ Applied {sum(applied.values())} city tags:")
            for tag, count in sorted(applied.items(), key=lambda x: x[1], reverse=True)[:15]:
                print(f"  • {tag:25} : {count} links")
    else:
        print("✅ All city tags appear complete!")

if __name__ == "__main__":
    main()