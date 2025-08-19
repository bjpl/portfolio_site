#!/usr/bin/env python3
"""
Improve tagging for all Instagram links in the links page.
Adds comprehensive, consistent tags for better searchability.
"""

import re
from typing import List, Set, Tuple

def extract_location_from_text(text: str) -> Set[str]:
    """Extract location information from link text."""
    locations = set()
    
    # Common cities
    cities = {
        'Seattle': ['seattle', 'washington', 'usa', 'north-america', 'pacific-northwest'],
        'La Paz': ['la-paz', 'bolivia', 'south-america', 'andes'],
        'Ottawa': ['ottawa', 'canada', 'north-america', 'ontario'],
        'Santiago': ['santiago', 'chile', 'south-america', 'pacific'],
        'Bogotá': ['bogota', 'colombia', 'south-america', 'andean'],
        'Bogota': ['bogota', 'colombia', 'south-america', 'andean'],
        'Guatemala': ['guatemala-city', 'guatemala', 'central-america'],
        'Rome': ['rome', 'italy', 'europe', 'mediterranean'],
        'Tokyo': ['tokyo', 'japan', 'asia', 'east-asia'],
        'Beirut': ['beirut', 'lebanon', 'middle-east', 'mediterranean'],
        'Lima': ['lima', 'peru', 'south-america', 'pacific'],
        'Madrid': ['madrid', 'spain', 'europe', 'iberian'],
        'Montevideo': ['montevideo', 'uruguay', 'south-america', 'rio-de-la-plata'],
        'Washington': ['washington-dc', 'usa', 'north-america', 'capital'],
        'DC': ['washington-dc', 'usa', 'north-america', 'capital'],
        'Caracas': ['caracas', 'venezuela', 'south-america', 'caribbean'],
        'Mexico City': ['mexico-city', 'mexico', 'north-america', 'cdmx', 'capital'],
        'Paris': ['paris', 'france', 'europe', 'western-europe'],
        'London': ['london', 'uk', 'britain', 'europe', 'england'],
        'Buenos Aires': ['buenos-aires', 'argentina', 'south-america', 'rio-de-la-plata'],
        'Atlanta': ['atlanta', 'georgia', 'usa', 'north-america', 'southeast'],
        'Boston': ['boston', 'massachusetts', 'usa', 'north-america', 'new-england'],
        'Los Angeles': ['los-angeles', 'california', 'usa', 'north-america', 'west-coast'],
        'LA': ['los-angeles', 'california', 'usa', 'north-america', 'west-coast'],
        'Vienna': ['vienna', 'austria', 'europe', 'central-europe'],
        'Copenhagen': ['copenhagen', 'denmark', 'europe', 'scandinavia', 'nordic'],
        'Quito': ['quito', 'ecuador', 'south-america', 'andes'],
        'San Salvador': ['san-salvador', 'el-salvador', 'central-america'],
        'Accra': ['accra', 'ghana', 'africa', 'west-africa'],
        'New Delhi': ['new-delhi', 'india', 'asia', 'south-asia'],
        'Seoul': ['seoul', 'korea', 'south-korea', 'asia', 'east-asia'],
        'Medellín': ['medellin', 'colombia', 'antioquia', 'south-america'],
        'Medellin': ['medellin', 'colombia', 'antioquia', 'south-america'],
        'Cali': ['cali', 'colombia', 'valle-del-cauca', 'south-america', 'pacific'],
        'Barranquilla': ['barranquilla', 'colombia', 'atlantico', 'south-america', 'caribbean'],
        'Cartagena': ['cartagena', 'colombia', 'bolivar', 'south-america', 'caribbean', 'coast'],
        'Bucaramanga': ['bucaramanga', 'colombia', 'santander', 'south-america'],
        'Pereira': ['pereira', 'colombia', 'risaralda', 'south-america', 'coffee-region'],
        'Manizales': ['manizales', 'colombia', 'caldas', 'south-america', 'coffee-region'],
        'Armenia': ['armenia', 'colombia', 'quindio', 'south-america', 'coffee-region'],
        'Ibagué': ['ibague', 'colombia', 'tolima', 'south-america'],
        'Villavicencio': ['villavicencio', 'colombia', 'meta', 'south-america', 'llanos'],
        'Pasto': ['pasto', 'colombia', 'narino', 'south-america', 'andes'],
        'Montería': ['monteria', 'colombia', 'cordoba', 'south-america'],
        'Valledupar': ['valledupar', 'colombia', 'cesar', 'south-america'],
        'Tunja': ['tunja', 'colombia', 'boyaca', 'south-america', 'andes'],
        'Popayán': ['popayan', 'colombia', 'cauca', 'south-america'],
        'Neiva': ['neiva', 'colombia', 'huila', 'south-america'],
        'Riohacha': ['riohacha', 'colombia', 'la-guajira', 'south-america', 'caribbean'],
        'Sincelejo': ['sincelejo', 'colombia', 'sucre', 'south-america'],
        'Yopal': ['yopal', 'colombia', 'casanare', 'south-america', 'llanos'],
        'Florencia': ['florencia', 'colombia', 'caqueta', 'south-america', 'amazon'],
        'Mocoa': ['mocoa', 'colombia', 'putumayo', 'south-america', 'amazon'],
        'Leticia': ['leticia', 'colombia', 'amazonas', 'south-america', 'amazon', 'tri-border'],
        'Arauca': ['arauca', 'colombia', 'arauca', 'south-america', 'llanos', 'border'],
        'Quibdó': ['quibdo', 'colombia', 'choco', 'south-america', 'pacific', 'rainforest'],
        'San Andrés': ['san-andres', 'colombia', 'caribbean', 'island'],
        'Santa Marta': ['santa-marta', 'colombia', 'magdalena', 'south-america', 'caribbean', 'coast']
    }
    
    for city, tags in cities.items():
        if city.lower() in text.lower():
            locations.update(tags)
    
    return locations

def extract_country_from_text(text: str) -> Set[str]:
    """Extract country information from link text."""
    countries = set()
    
    country_map = {
        'Mexico': ['mexico', 'mexican', 'north-america', 'latin-america', 'nafta'],
        'Colombia': ['colombia', 'colombian', 'south-america', 'latin-america', 'andean'],
        'Venezuela': ['venezuela', 'venezuelan', 'south-america', 'latin-america', 'caribbean'],
        'USA': ['usa', 'united-states', 'american', 'north-america'],
        'United States': ['usa', 'united-states', 'american', 'north-america'],
        'Canada': ['canada', 'canadian', 'north-america', 'commonwealth'],
        'Brazil': ['brazil', 'brazilian', 'south-america', 'latin-america', 'portuguese'],
        'Argentina': ['argentina', 'argentinian', 'south-america', 'latin-america', 'southern-cone'],
        'Chile': ['chile', 'chilean', 'south-america', 'latin-america', 'pacific', 'southern-cone'],
        'Peru': ['peru', 'peruvian', 'south-america', 'latin-america', 'andean', 'pacific'],
        'Ecuador': ['ecuador', 'ecuadorian', 'south-america', 'latin-america', 'andean'],
        'Bolivia': ['bolivia', 'bolivian', 'south-america', 'latin-america', 'andean', 'landlocked'],
        'Uruguay': ['uruguay', 'uruguayan', 'south-america', 'latin-america', 'southern-cone'],
        'Paraguay': ['paraguay', 'paraguayan', 'south-america', 'latin-america', 'landlocked'],
        'Guatemala': ['guatemala', 'guatemalan', 'central-america', 'latin-america'],
        'El Salvador': ['el-salvador', 'salvadoran', 'central-america', 'latin-america'],
        'Honduras': ['honduras', 'honduran', 'central-america', 'latin-america'],
        'Nicaragua': ['nicaragua', 'nicaraguan', 'central-america', 'latin-america'],
        'Costa Rica': ['costa-rica', 'costa-rican', 'central-america', 'latin-america'],
        'Panama': ['panama', 'panamanian', 'central-america', 'latin-america'],
        'Cuba': ['cuba', 'cuban', 'caribbean', 'latin-america', 'island'],
        'Dominican Republic': ['dominican-republic', 'dominican', 'caribbean', 'latin-america', 'island'],
        'Spain': ['spain', 'spanish', 'europe', 'iberian', 'eu', 'mediterranean'],
        'France': ['france', 'french', 'europe', 'eu', 'western-europe'],
        'Germany': ['germany', 'german', 'europe', 'eu', 'central-europe'],
        'Italy': ['italy', 'italian', 'europe', 'eu', 'mediterranean'],
        'UK': ['uk', 'britain', 'british', 'europe', 'commonwealth'],
        'Britain': ['uk', 'britain', 'british', 'europe', 'commonwealth'],
        'Ireland': ['ireland', 'irish', 'europe', 'eu'],
        'Belgium': ['belgium', 'belgian', 'europe', 'eu', 'benelux'],
        'Netherlands': ['netherlands', 'dutch', 'europe', 'eu', 'benelux'],
        'Switzerland': ['switzerland', 'swiss', 'europe', 'alpine', 'neutral'],
        'Austria': ['austria', 'austrian', 'europe', 'eu', 'alpine'],
        'Denmark': ['denmark', 'danish', 'europe', 'eu', 'nordic', 'scandinavia'],
        'Sweden': ['sweden', 'swedish', 'europe', 'eu', 'nordic', 'scandinavia'],
        'Norway': ['norway', 'norwegian', 'europe', 'nordic', 'scandinavia'],
        'Finland': ['finland', 'finnish', 'europe', 'eu', 'nordic'],
        'Poland': ['poland', 'polish', 'europe', 'eu', 'eastern-europe'],
        'Ukraine': ['ukraine', 'ukrainian', 'europe', 'eastern-europe'],
        'Russia': ['russia', 'russian', 'eurasia', 'eastern-europe'],
        'Japan': ['japan', 'japanese', 'asia', 'east-asia', 'pacific'],
        'China': ['china', 'chinese', 'asia', 'east-asia'],
        'Korea': ['korea', 'korean', 'asia', 'east-asia'],
        'India': ['india', 'indian', 'asia', 'south-asia', 'commonwealth'],
        'Australia': ['australia', 'australian', 'oceania', 'commonwealth', 'pacific'],
        'New Zealand': ['new-zealand', 'kiwi', 'oceania', 'commonwealth', 'pacific'],
        'South Africa': ['south-africa', 'african', 'africa', 'commonwealth'],
        'Ghana': ['ghana', 'ghanaian', 'africa', 'west-africa', 'commonwealth'],
        'Lebanon': ['lebanon', 'lebanese', 'middle-east', 'arab', 'mediterranean'],
        'Jordan': ['jordan', 'jordanian', 'middle-east', 'arab'],
        'Qatar': ['qatar', 'qatari', 'middle-east', 'arab', 'gulf'],
        'UAE': ['uae', 'emirates', 'middle-east', 'arab', 'gulf'],
        'Turkey': ['turkey', 'turkish', 'middle-east', 'mediterranean', 'eurasia'],
        'Israel': ['israel', 'israeli', 'middle-east', 'mediterranean'],
        'Barbados': ['barbados', 'barbadian', 'caribbean', 'island', 'commonwealth']
    }
    
    for country, tags in country_map.items():
        if country.lower() in text.lower():
            countries.update(tags)
    
    return countries

def extract_org_type(text: str) -> Set[str]:
    """Extract organization type from link text."""
    org_types = set()
    
    # Embassy/Consulate detection
    if any(word in text.lower() for word in ['embassy', 'embajada', 'embaixada', 'ambassade']):
        org_types.update(['embassy', 'diplomatic', 'foreign-affairs', 'international-relations'])
    if any(word in text.lower() for word in ['consulate', 'consulado', 'consulat']):
        org_types.update(['consulate', 'diplomatic', 'consular-services', 'international'])
    
    # Cultural organizations
    if any(word in text.lower() for word in ['museum', 'museo', 'gallery', 'galeria']):
        org_types.update(['museum', 'culture', 'art', 'heritage', 'education'])
    if any(word in text.lower() for word in ['theater', 'theatre', 'teatro']):
        org_types.update(['theater', 'culture', 'performing-arts', 'entertainment'])
    if any(word in text.lower() for word in ['library', 'biblioteca']):
        org_types.update(['library', 'education', 'culture', 'research', 'books'])
    if any(word in text.lower() for word in ['cultural', 'cultura']):
        org_types.update(['culture', 'cultural-center', 'arts'])
    
    # Government
    if any(word in text.lower() for word in ['ministry', 'ministerio', 'department', 'departamento']):
        org_types.update(['government', 'ministry', 'public-sector', 'administration'])
    if any(word in text.lower() for word in ['governor', 'gobernador', 'alcalde', 'mayor']):
        org_types.update(['government', 'local-government', 'politics', 'administration'])
    if any(word in text.lower() for word in ['tourism', 'turismo']):
        org_types.update(['tourism', 'travel', 'promotion', 'destination-marketing'])
    
    # Education
    if any(word in text.lower() for word in ['university', 'universidad', 'college', 'school']):
        org_types.update(['education', 'university', 'academic', 'higher-education'])
    if any(word in text.lower() for word in ['institute', 'instituto']):
        org_types.update(['education', 'institute', 'research', 'academic'])
    
    # Food & Restaurants
    if any(word in text.lower() for word in ['restaurant', 'restaurante', 'cafe', 'café', 'coffee']):
        org_types.update(['food', 'restaurant', 'dining', 'hospitality'])
    if any(word in text.lower() for word in ['food', 'comida', 'cocina', 'kitchen']):
        org_types.update(['food', 'cuisine', 'gastronomy'])
    if any(word in text.lower() for word in ['bakery', 'panaderia', 'pasteleria']):
        org_types.update(['food', 'bakery', 'pastry', 'dessert'])
    
    # Business & Brands
    if any(word in text.lower() for word in ['brand', 'marca', 'company', 'empresa']):
        org_types.update(['business', 'brand', 'commercial', 'corporate'])
    if any(word in text.lower() for word in ['store', 'tienda', 'shop']):
        org_types.update(['retail', 'shopping', 'commerce', 'business'])
    
    # Media & Communication
    if any(word in text.lower() for word in ['news', 'noticias', 'media', 'press']):
        org_types.update(['media', 'news', 'journalism', 'communication'])
    if any(word in text.lower() for word in ['radio', 'tv', 'television']):
        org_types.update(['media', 'broadcasting', 'entertainment', 'communication'])
    
    # Travel & Tourism
    if any(word in text.lower() for word in ['travel', 'viaje', 'trip']):
        org_types.update(['travel', 'tourism', 'destination', 'adventure'])
    if any(word in text.lower() for word in ['hotel', 'hostel', 'accommodation']):
        org_types.update(['hospitality', 'accommodation', 'tourism', 'travel'])
    
    return org_types

def improve_link_tags(link_html: str) -> str:
    """Improve tags for a single link."""
    # Extract existing content
    match = re.match(r'<a href="([^"]+)" target="_blank"(?:\s+data-tags="([^"]*)")?>([^<]+)</a>', link_html)
    if not match:
        return link_html
    
    url, existing_tags, text = match.groups()
    existing_tags = existing_tags or ""
    
    # Build comprehensive tag set
    all_tags = set()
    
    # Keep existing tags
    if existing_tags:
        all_tags.update(existing_tags.split())
    
    # Extract username from Instagram URL
    username = url.replace('https://instagram.com/', '').replace('/', '')
    all_tags.add(username.lower())
    
    # Add location tags
    all_tags.update(extract_location_from_text(text))
    
    # Add country tags
    all_tags.update(extract_country_from_text(text))
    
    # Add organization type tags
    all_tags.update(extract_org_type(text))
    
    # Add specific tags based on content patterns
    if '🇲🇽' in text or 'Mexico' in text:
        all_tags.update(['mexico', 'mexican', 'mx'])
    if '🇨🇴' in text or 'Colombia' in text:
        all_tags.update(['colombia', 'colombian', 'co'])
    if '🇻🇪' in text or 'Venezuela' in text:
        all_tags.update(['venezuela', 'venezuelan', 've'])
    if '🇺🇸' in text or 'USA' in text or 'US' in text:
        all_tags.update(['usa', 'united-states', 'american'])
    if '🇪🇺' in text or 'EU' in text:
        all_tags.update(['eu', 'european-union', 'europe'])
    
    # Add language tags where relevant
    if any(country in text for country in ['Mexico', 'Colombia', 'Venezuela', 'Spain', 'Argentina', 'Chile', 'Peru']):
        all_tags.add('spanish-speaking')
    if 'Brazil' in text:
        all_tags.add('portuguese-speaking')
    if any(country in text for country in ['USA', 'UK', 'Canada', 'Australia']):
        all_tags.add('english-speaking')
    if 'France' in text or 'French' in text:
        all_tags.add('french-speaking')
    
    # Sort and clean tags
    all_tags = sorted([tag.lower().replace(' ', '-') for tag in all_tags if tag])
    
    # Rebuild link with improved tags
    return f'<a href="{url}" target="_blank" data-tags="{" ".join(all_tags)}">{text}</a>'

def process_file(filepath: str):
    """Process the entire links file and improve all tags."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find all links and improve their tags
    def replace_link(match):
        return improve_link_tags(match.group(0))
    
    # Process all links
    improved_content = re.sub(
        r'<a href="[^"]+" target="_blank"[^>]*>[^<]+</a>',
        replace_link,
        content
    )
    
    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(improved_content)
    
    print(f"✅ Improved tags in {filepath}")
    
    # Count statistics
    all_links = re.findall(r'<a href="[^"]+" target="_blank"[^>]*>[^<]+</a>', improved_content)
    links_with_tags = [l for l in all_links if 'data-tags=' in l]
    
    print(f"📊 Statistics:")
    print(f"   Total links: {len(all_links)}")
    print(f"   Links with tags: {len(links_with_tags)}")
    print(f"   Coverage: {len(links_with_tags)/len(all_links)*100:.1f}%")

if __name__ == "__main__":
    process_file(r"C:\Users\brand\Development\Project_Workspace\portfolio_site\content\me\links\_index.md")