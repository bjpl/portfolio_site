#!/usr/bin/env python3
"""
Enrich the hover menu JavaScript with YouTube URLs.
"""

youtube_mappings = {
    # Presidential/Government Offices
    'infopresidencia': 'https://www.youtube.com/@PresidenciaColombiaOficial',
    'gobmexico': 'https://www.youtube.com/@gobiernodemexico',
    'presidenciamx': 'https://www.youtube.com/@PresidenciaMexico',
    
    # Colombian Ministries
    'mincultura': 'https://www.youtube.com/@MinisterioCulturaColombia',
    'mineducacion': 'https://www.youtube.com/@Mineducacion',
    'mindefensa': 'https://www.youtube.com/@MindefensaColombia',
    'minhacienda': 'https://www.youtube.com/@MinHaciendaColombia',
    'minsaludcol': 'https://www.youtube.com/@MinSaludColombia',
    'minticscolombia': 'https://www.youtube.com/@MinTICColombia',
    'mintrabajocol': 'https://www.youtube.com/@MintrabajoColombia',
    'mintransporteco': 'https://www.youtube.com/@Mintransporte',
    'mincomercio': 'https://www.youtube.com/@MincomercioColombia',
    'minvivienda': 'https://www.youtube.com/@MinVivienda',
    'minagricultura': 'https://www.youtube.com/@MinAgricultura',
    'minambiente': 'https://www.youtube.com/@MinAmbiente',
    'minciencias': 'https://www.youtube.com/@MinCiencias',
    'minjusticia': 'https://www.youtube.com/@MinJusticia',
    'mininterior': 'https://www.youtube.com/@MinInterior',
    'minrelext': 'https://www.youtube.com/@CancilleriaColombia',
    'mincit': 'https://www.youtube.com/@MinComercioColombia',
    
    # Mexican Government Agencies
    'sremx': 'https://www.youtube.com/@sre_mx',
    'sepgobmx': 'https://www.youtube.com/@SEPGobMx',
    'saludmexico': 'https://www.youtube.com/@SecretariadeSaludMexico',
    'hacienda_mexico': 'https://www.youtube.com/@HaciendaMexico',
    'sct_mx': 'https://www.youtube.com/@SCT_mx',
    'semarnat_mexico': 'https://www.youtube.com/@SEMARNAT_mx',
    'sep': 'https://www.youtube.com/@SEPmexico',
    'salud': 'https://www.youtube.com/@SecretariadeSaludMexico',
    'sedena': 'https://www.youtube.com/@SEDENA_mx',
    'semar': 'https://www.youtube.com/@SEMARMexico',
    'sener': 'https://www.youtube.com/@SENER_mx',
    'semarnat': 'https://www.youtube.com/@SEMARNAT_mx',
    'economia': 'https://www.youtube.com/@SE_mx',
    'comunicaciones': 'https://www.youtube.com/@SCT_mx',
    'agricultura': 'https://www.youtube.com/@AGRICULTURA_MX',
    'bienestar': 'https://www.youtube.com/@BienestarMX',
    'cultura': 'https://www.youtube.com/@CulturaMexico',
    
    # City Governments
    'alcaldiabogota': 'https://www.youtube.com/@AlcaldiaBogota',
    'cdmx': 'https://www.youtube.com/@GobiernoCDMX',
    'guadalajaramx': 'https://www.youtube.com/@GobiernoGuadalajara',
    'monterreymx': 'https://www.youtube.com/@GobiernoMonterrey',
    
    # Embassies
    'usembassymex': 'https://www.youtube.com/@USEmbassyMexico',
    'franciaenmexico': 'https://www.youtube.com/@FranciaenMexico',
    
    # Mexican Embassies
    'embamexcan': 'https://www.youtube.com/@embamexcan',
    'embamexchi': 'https://www.youtube.com/@embamexchi',
    'embamexcol': 'https://www.youtube.com/@embamexcol',
    'embamexgua': 'https://www.youtube.com/@embamexgua',
    'embamex_italia': 'https://www.youtube.com/@embamex_italia',
    'embamexjp': 'https://www.youtube.com/@embamexjp',
    'embamexlibano': 'https://www.youtube.com/@embamexlibano',
    'embamexperu': 'https://www.youtube.com/@embamexperu',
    'embamexesp': 'https://www.youtube.com/@embamexesp',
    'embamexur': 'https://www.youtube.com/@embamexur',
    'embamexeua': 'https://www.youtube.com/@embamexeua',
    'embamexvenezuela': 'https://www.youtube.com/@embamexvenezuela',
    
    # Mexican Consulates
    'consulmexsea': 'https://www.youtube.com/@consulmexsea',
    'consulmexla': 'https://www.youtube.com/@ConsulmexLA',
    'consulmexny': 'https://www.youtube.com/@ConsulmexNY',
    'consulmexhou': 'https://www.youtube.com/@ConsulmexHouston',
    'consulmexchi': 'https://www.youtube.com/@ConsulmexChicago',
    
    # Tourism
    'visitmexico': 'https://www.youtube.com/@VisitMexico',
    'colombiatravel': 'https://www.youtube.com/@colombiatravel',
    'chiletravel': 'https://www.youtube.com/@chiletravel',
    'visitperu': 'https://www.youtube.com/@visitperu',
    'ecuadortravel': 'https://www.youtube.com/@ecuadortravel',
    'visitargentina': 'https://www.youtube.com/@visitargentina',
    'uruguaynatural': 'https://www.youtube.com/@uruguaynatural',
    'bogotaturismo': 'https://www.youtube.com/@bogotaturismo',
    'visitcdmx': 'https://www.youtube.com/@VisitCDMX',
    'turismomedellin': 'https://www.youtube.com/@TurismoMedellin',
    'fonatur': 'https://www.youtube.com/@FONATUR_MX',
    'sectur': 'https://www.youtube.com/@SECTUR_MX',
    'mexicotravelchannel': 'https://www.youtube.com/@MexicoTravelChannel',
    'procolombia': 'https://www.youtube.com/@PROCOLOMBIA',
    'promperu': 'https://www.youtube.com/@PROMPERU',
    'inprotur': 'https://www.youtube.com/@INPROTUR',
    'sernatur': 'https://www.youtube.com/@SERNATUR',
    
    # Museums
    'museodelprado': 'https://www.youtube.com/@museodelprado',
    'museoreinasofia': 'https://www.youtube.com/@museoreinasofia',
    'malba': 'https://www.youtube.com/@malbamuseo',
    'museodeartemoderno': 'https://www.youtube.com/@MuseoArteModernoMX',
    'museumofmodernart': 'https://www.youtube.com/@MoMAvideos',
    'mna': 'https://www.youtube.com/@museonacionaldeantropologia',
    'inahmx': 'https://www.youtube.com/@INAHTV',
    'museoantropo': 'https://www.youtube.com/@museonacionaldeantropologia',
    'inba': 'https://www.youtube.com/@INBAmx',
    'museofridakahlo': 'https://www.youtube.com/@museofridakahlo',
    'munal': 'https://www.youtube.com/@munal_mx',
    'museodeloro': 'https://www.youtube.com/@museodeloro',
    'museobotero': 'https://www.youtube.com/@museobotero',
    'museonal': 'https://www.youtube.com/@museonacionaldecolombia',
    'museobellasartes': 'https://www.youtube.com/@museobellasartes',
    'museoevita': 'https://www.youtube.com/@museoevita',
    'mnba': 'https://www.youtube.com/@museobellasarteschile',
    'macchile': 'https://www.youtube.com/@MACChile',
    'mac': 'https://www.youtube.com/@MACChile',
    'mavi': 'https://www.youtube.com/@MAVISantiago',
    'museolarco': 'https://www.youtube.com/@museolarco',
    'mali': 'https://www.youtube.com/@museodeartedelima',
    'museonacionalmexico': 'https://www.youtube.com/@museonacionalmexico',
    'museotamayo': 'https://www.youtube.com/@museotamayo',
    'muac': 'https://www.youtube.com/@MUAC_UNAM',
    'museojumex': 'https://www.youtube.com/@museojumex',
    'museosoumaya': 'https://www.youtube.com/@museosoumaya',
    'museomemoria': 'https://www.youtube.com/@museomemoria',
    'macba': 'https://www.youtube.com/@MACBA_Barcelona',
    'guggenheim': 'https://www.youtube.com/@GuggenheimMuseum',
    'masp': 'https://www.youtube.com/@maspmuseu',
    'mam': 'https://www.youtube.com/@MAMSaoPaulo',
    'pinacoteca': 'https://www.youtube.com/@Pinacoteca',
    'museudonacional': 'https://www.youtube.com/@MuseuNacional',
    'museuhistorico': 'https://www.youtube.com/@museuhistoriconacional',
    'museonacion': 'https://www.youtube.com/@MuseoNacionPeru',
    'museooro': 'https://www.youtube.com/@MuseoOroPeru',
    'precolombino': 'https://www.youtube.com/@museoprecolombino',
    'memoriaychile': 'https://www.youtube.com/@MuseoMemoriaChile',
    
    # Cultural Institutions
    'imcine': 'https://www.youtube.com/@IMCINEmx',
    'bibliotecanalco': 'https://www.youtube.com/@BibliotecaNacionalColombia',
    'bibliotecanalchile': 'https://www.youtube.com/@bibliotecanacionaldechile',
    'bibliotecanalargentina': 'https://www.youtube.com/@BibliotecaNacionalArgentina',
    'bibliotecavasconcelos': 'https://www.youtube.com/@BibliotecaVasconcelos',
    'bibliotecanal': 'https://www.youtube.com/@bibliotecanacional',
    'fce': 'https://www.youtube.com/@FondoCulturaEconomica',
    'conaculta': 'https://www.youtube.com/@conaculta',
    'inah': 'https://www.youtube.com/@INAHTV',
    'cineteca': 'https://www.youtube.com/@CinetecaNacional',
    'filmoteca': 'https://www.youtube.com/@FilmotecaUNAM',
    'casalamm': 'https://www.youtube.com/@CasaLamm',
    'centroimagen': 'https://www.youtube.com/@CentroImagen',
    'cenart': 'https://www.youtube.com/@CENART_MX',
    'ccemx': 'https://www.youtube.com/@CCEMx',
    'casaamerica': 'https://www.youtube.com/@CasaAmerica',
    'centroculturalespana': 'https://www.youtube.com/@CCEMx',
    'centroculturalbogota': 'https://www.youtube.com/@CentroCulturalBogota',
    'bellasartes': 'https://www.youtube.com/@bellasartesmx',
    'gam': 'https://www.youtube.com/@CentroGAM',
    
    # Legislative
    'tvsenado': 'https://www.youtube.com/@TVSenadoBrasil',
    'canaldelcongreso': 'https://www.youtube.com/@CanaldelCongreso',
    
    # Spanish Institutions
    'casarealtv': 'https://www.youtube.com/@casarealtv',
    'institutocervantes': 'https://www.youtube.com/@InstitutoCervantes',
    
    # Archives
    'agn': 'https://www.youtube.com/@AGNMexico',
    'agnargentina': 'https://www.youtube.com/@AGNArgentina',
    'agncolombia': 'https://www.youtube.com/@AGNColombia',
    
    # Theaters
    'teatrocolonbogota': 'https://www.youtube.com/@teatrocolonbogota',
    'teatrocolon': 'https://www.youtube.com/@teatrocolon',
    'teatrosolis': 'https://www.youtube.com/@teatrosolis',
    'teatromunicipal': 'https://www.youtube.com/@teatromunicipal',
    'palaciobellas': 'https://www.youtube.com/@PalacioBellasArtes',
    'teatrodiana': 'https://www.youtube.com/@TeatroDiana',
    'teatrojorgenegar': 'https://www.youtube.com/@TeatroJorgeNegrete',
    'teatrometropolitan': 'https://www.youtube.com/@TeatroMetropolitan',
    
    # Universities
    'unam': 'https://www.youtube.com/@UNAM_MX',
    'unal': 'https://www.youtube.com/@universidadnacionaldecolombia',
    'uba': 'https://www.youtube.com/@UBAonline',
    'pucchile': 'https://www.youtube.com/@pucchile',
    'pucp': 'https://www.youtube.com/@pucp',
    'ipn': 'https://www.youtube.com/@IPN_MX',
    'uamx': 'https://www.youtube.com/@UAM_MX',
    'itesm': 'https://www.youtube.com/@TecdeMonterrey',
    'uniandes': 'https://www.youtube.com/@uniandes',
    'javeriana': 'https://www.youtube.com/@PontificiaJaveriana',
    'uchile': 'https://www.youtube.com/@uchile',
    'usp': 'https://www.youtube.com/@canalusp',
    
    # News/Media
    'eltiempo': 'https://www.youtube.com/@eltiempo',
    'elnacional': 'https://www.youtube.com/@elnacionaldominicano',
    'latercera': 'https://www.youtube.com/@latercera',
    'clarin': 'https://www.youtube.com/@clarin',
    'reforma': 'https://www.youtube.com/@reforma',
    'eluniversal': 'https://www.youtube.com/@ElUniversalMex',
    'milenio': 'https://www.youtube.com/@MilenioNoticias',
    'excelsior': 'https://www.youtube.com/@ExcelsiorMex',
    'elfinanciero': 'https://www.youtube.com/@ElFinancieroTV',
    'jornada': 'https://www.youtube.com/@LaJornadaOnLine',
    'proceso': 'https://www.youtube.com/@procesomx',
    'elespectador': 'https://www.youtube.com/@ElEspectador',
    'semana': 'https://www.youtube.com/@RevistaSemana',
    'lanacion': 'https://www.youtube.com/@lanacion',
    'elcomercio': 'https://www.youtube.com/@elcomercio',
    'elmercurio': 'https://www.youtube.com/@ElMercurioChile',
    
    # TV Channels
    'canaloncetv': 'https://www.youtube.com/@CanalOnceTV',
    'canal22': 'https://www.youtube.com/@Canal22',
    'canal22memoria': 'https://www.youtube.com/@MemoriaCanal22',
    'televisa': 'https://www.youtube.com/@televisa',
    'lasestrellas': 'https://www.youtube.com/@LasEstrellas',
    'canal5': 'https://www.youtube.com/@Canal5',
    'forotv': 'https://www.youtube.com/@ForoTV',
    'aztecauno': 'https://www.youtube.com/@AztecaUno',
    'azteca7': 'https://www.youtube.com/@Azteca7',
    'imagentv': 'https://www.youtube.com/@ImagenTelevisión',
    'multimedios': 'https://www.youtube.com/@multimedios',
    'univision': 'https://www.youtube.com/@univision',
    'unimas': 'https://www.youtube.com/@UniMas',
    'galavision': 'https://www.youtube.com/@Galavision',
    'tudn': 'https://www.youtube.com/@TUDN',
    'telemundo': 'https://www.youtube.com/@Telemundo',
    
    # States/Provinces
    'edomex': 'https://www.youtube.com/@GobiernoEdoMex',
    'nuevoleon': 'https://www.youtube.com/@nuevoleon',
    'jalisco': 'https://www.youtube.com/@GobiernoJalisco',
    'cundinamarca': 'https://www.youtube.com/@GobCundinamarca',
    'antioquia': 'https://www.youtube.com/@GobAntioquia',
    'puebla': 'https://www.youtube.com/@GobiernoPuebla',
    'veracruz': 'https://www.youtube.com/@GobiernoVeracruz',
    'oaxaca': 'https://www.youtube.com/@GobiernoOaxaca',
    'chiapas': 'https://www.youtube.com/@GobiernoChiapas',
    'yucatan': 'https://www.youtube.com/@GobiernoYucatan',
    'queretaro': 'https://www.youtube.com/@GobiernoQueretaro',
    'guanajuato': 'https://www.youtube.com/@GobiernoGuanajuato',
    'valledelcauca': 'https://www.youtube.com/@GobValle',
    'atlantico': 'https://www.youtube.com/@GobAtlantico',
    'santander': 'https://www.youtube.com/@GobSantander',
    'bolivar': 'https://www.youtube.com/@GobBolivar',
    
    # Military/Police
    'policianalco': 'https://www.youtube.com/@PoliciaNacionalColombia',
    'guardianacionalmx': 'https://www.youtube.com/@GuardiaNacionalMX',
    'ejercitomexicano': 'https://www.youtube.com/@EjercitoMexicano',
    'armadademexico': 'https://www.youtube.com/@ArmadadeMexico',
    
    # Sports Organizations
    'fedmexfut': 'https://www.youtube.com/@FedMexFut',
    'fcfseleccioncol': 'https://www.youtube.com/@FCFSeleccionCol',
    'afa': 'https://www.youtube.com/@AFASeleccion',
    'ligamx': 'https://www.youtube.com/@LigaMX',
    'anfp': 'https://www.youtube.com/@ANFPChile',
    'fpf': 'https://www.youtube.com/@FPFOficial',
    
    # Soccer Clubs
    'america': 'https://www.youtube.com/@ClubAmerica',
    'chivas': 'https://www.youtube.com/@Chivas',
    'pumas': 'https://www.youtube.com/@PumasUNAM',
    'tigres': 'https://www.youtube.com/@TigresOficial',
    'monterrey': 'https://www.youtube.com/@RayadosMTY',
    'cruzazul': 'https://www.youtube.com/@CruzAzul',
    'santos': 'https://www.youtube.com/@SantosLaguna',
    'toluca': 'https://www.youtube.com/@Toluca',
    'millonarios': 'https://www.youtube.com/@MillonariosFC',
    'nacional': 'https://www.youtube.com/@AtleticoNacional',
    'santafe': 'https://www.youtube.com/@SantaFe',
    'colocolo': 'https://www.youtube.com/@ColoColo',
    'universidadchile': 'https://www.youtube.com/@UdeChile',
    'boca': 'https://www.youtube.com/@BocaJuniors',
    'river': 'https://www.youtube.com/@RiverPlate',
    'flamengo': 'https://www.youtube.com/@Flamengo',
    'corinthians': 'https://www.youtube.com/@Corinthians',
    'palmeiras': 'https://www.youtube.com/@Palmeiras',
    
    # Airlines
    'avianca': 'https://www.youtube.com/@avianca',
    'aeromexico': 'https://www.youtube.com/@aeromexico',
    'latamairlines': 'https://www.youtube.com/@LATAM',
    'latam': 'https://www.youtube.com/@LATAM',
    'volaris': 'https://www.youtube.com/@volarisoficial',
    'vivaaerobus': 'https://www.youtube.com/@VivaAerobus',
    'copa': 'https://www.youtube.com/@CopaAirlines',
    
    # Banks
    'bancodebogota': 'https://www.youtube.com/@BancodeBogota',
    'bancolombia': 'https://www.youtube.com/@grupobancolombia',
    'banamex': 'https://www.youtube.com/@Citibanamex',
    'banorte': 'https://www.youtube.com/@banorte',
    'bbvamexico': 'https://www.youtube.com/@BBVAMexico',
    'santandermexico': 'https://www.youtube.com/@SantanderMexico',
    'citibanamex': 'https://www.youtube.com/@Citibanamex',
    'scotiabank': 'https://www.youtube.com/@ScotiabankMexico',
    'hsbc': 'https://www.youtube.com/@HSBCMexico',
    'davivienda': 'https://www.youtube.com/@Davivienda',
    
    # Metro Systems
    'metrodebogota': 'https://www.youtube.com/@metrodebogota',
    'metrocdmx': 'https://www.youtube.com/@MetroCDMX',
    'metromedellin': 'https://www.youtube.com/@metrodemedellin',
    'metrosantiago': 'https://www.youtube.com/@metrodesantiago',
    'metrolima': 'https://www.youtube.com/@MetrodeLima',
    'metroquito': 'https://www.youtube.com/@MetroQuito',
    'metrocaracas': 'https://www.youtube.com/@metrocaracas',
    'metrobus': 'https://www.youtube.com/@Metrobus_CDMX',
    'transmilenio': 'https://www.youtube.com/@TransMilenio',
    'ecobici': 'https://www.youtube.com/@EcobiciCDMX',
    
    # Orchestras/Music
    'ofilarmonica': 'https://www.youtube.com/@OFILMexico',
    'osn': 'https://www.youtube.com/@OSNMexico',
    'sinfonica': 'https://www.youtube.com/@SinfonicaNacional',
    'filarmonica': 'https://www.youtube.com/@FilarmonicaColombia',
    'ossodre': 'https://www.youtube.com/@OSSODRE',
    
    # Festivals
    'cervantino': 'https://www.youtube.com/@FestivalCervantino',
    'filo': 'https://www.youtube.com/@FILOaxaca',
    'vivelatino': 'https://www.youtube.com/@ViveLatino',
    'rockalsparque': 'https://www.youtube.com/@RockalParque',
    'estereopicnic': 'https://www.youtube.com/@EsteroPicnic',
    'lollapalooza': 'https://www.youtube.com/@LollapaloozaCL',
    
    # Radio/Media
    'wradio': 'https://www.youtube.com/@WRadioColombia',
    'radioformula': 'https://www.youtube.com/@RadioFormula',
    'imagenradio': 'https://www.youtube.com/@ImagenRadio',
    'mvsnoticias': 'https://www.youtube.com/@MVSNoticias',
    'laoctava': 'https://www.youtube.com/@LaOctava',
    'caracolradio': 'https://www.youtube.com/@CaracolRadio',
    'bluradio': 'https://www.youtube.com/@BluRadioCo',
    
    # Department Stores/Retail
    'elpalaciodehierro': 'https://www.youtube.com/@ElPalacioDeHierro',
    'liverpool': 'https://www.youtube.com/@Liverpool',
    'sanborns': 'https://www.youtube.com/@Sanborns',
    'sears': 'https://www.youtube.com/@SearsMexico',
    'falabella': 'https://www.youtube.com/@Falabella',
    'ripley': 'https://www.youtube.com/@Ripley',
    'exito': 'https://www.youtube.com/@almacenesexito',
    'oxxo': 'https://www.youtube.com/@OXXOTiendas',
    'elektra': 'https://www.youtube.com/@Elektra',
    'coppel': 'https://www.youtube.com/@Coppel',
    
    # Food/Beverage
    'grupmodelo': 'https://www.youtube.com/@GrupoModelo',
    'corona': 'https://www.youtube.com/@Corona',
    'cocacola': 'https://www.youtube.com/@CocaColaMexico',
    'bimbo': 'https://www.youtube.com/@Bimbo',
    'lala': 'https://www.youtube.com/@LALA',
    'jumex': 'https://www.youtube.com/@Jumex',
    'penafiel': 'https://www.youtube.com/@Penafiel',
}

def update_js_file():
    """Update the hover menu JavaScript with YouTube mappings."""
    js_file = r"C:\Users\brand\Development\Project_Workspace\portfolio_site\static\js\links-hover-menu.js"
    
    # Read the current file
    with open(js_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find the youtubeMap section
    import re
    
    # Create the new YouTube map content
    youtube_map_content = "        const youtubeMap = {\n"
    for username, url in sorted(youtube_mappings.items()):
        youtube_map_content += f"            '{username}': '{url}',\n"
    youtube_map_content = youtube_map_content.rstrip(',\n') + '\n'
    youtube_map_content += "        };"
    
    # Replace the existing youtubeMap
    pattern = r'const youtubeMap = \{[^}]*\};'
    new_content = re.sub(pattern, youtube_map_content, content, flags=re.DOTALL)
    
    # Write back
    with open(js_file, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"✅ Updated {len(youtube_mappings)} YouTube mappings in links-hover-menu.js")

if __name__ == "__main__":
    update_js_file()