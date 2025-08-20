// Hover Menu System for Links
(function() {
    'use strict';

    // SVG Icons
    const icons = {
        instagram: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1 1 12.324 0 6.162 6.162 0 0 1-12.324 0zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm4.965-10.405a1.44 1.44 0 1 1 2.881.001 1.44 1.44 0 0 1-2.881-.001z"/>
        </svg>`,
        
        website: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
        </svg>`,
        
        youtube: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>`
    };

    // Track initialization state
    let initialized = false;
    
    // Initialize hover menus on page load
    document.addEventListener('DOMContentLoaded', () => {
        if (!initialized) {
            initializeHoverMenus();
        }
    });
    
    // Also try immediate initialization in case DOM is already ready
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(() => {
            if (!initialized) {
                initializeHoverMenus();
            }
        }, 100);
    }

    function initializeHoverMenus() {
        // Prevent multiple initializations
        if (initialized) {
            console.log('⚠️ Hover menu already initialized, skipping...');
            return;
        }
        initialized = true;
        
        console.log('🚀 Initializing hover menu system...');
        
        // Process all link grids
        const linkGrids = document.querySelectorAll('.link-grid');
        console.log(`Found ${linkGrids.length} link grids`);
        let processedCount = 0;
        
        linkGrids.forEach(grid => {
            const links = grid.querySelectorAll('a');
            console.log(`Processing grid with ${links.length} links`);
            
            links.forEach(link => {
                // Skip if already processed
                if (link.parentElement.classList.contains('link-item-wrapper') || 
                    link.dataset.processed === 'true') {
                    return;
                }
                
                // Mark as processed immediately
                link.dataset.processed = 'true';
                
                // Extract data from original link
                const instagramUrl = link.href;
                const linkText = link.textContent.trim();
                const tags = link.getAttribute('data-tags') || '';
                
                // Extract username from Instagram URL
                const username = instagramUrl.includes('instagram.com/') 
                    ? instagramUrl.split('instagram.com/')[1].replace('/', '') 
                    : '';
                
                // Create wrapper that contains both text and icons
                const wrapper = document.createElement('div');
                wrapper.className = 'link-item-wrapper';
                
                // Create the display element with text
                const displayElement = document.createElement('div');
                displayElement.className = 'link-display';
                displayElement.innerHTML = link.innerHTML; // Preserve any flags/emojis
                
                // Create hover menu
                const hoverMenu = createHoverMenu({
                    instagram: instagramUrl,
                    website: getWebsiteUrl(username, linkText, tags),
                    youtube: getYoutubeUrl(username, linkText, tags)
                });
                
                // Replace the original link with our wrapper
                const parent = link.parentNode;
                parent.replaceChild(wrapper, link);
                
                // Add elements to wrapper
                wrapper.appendChild(displayElement);
                wrapper.appendChild(hoverMenu);
                
                // Preserve data attributes
                wrapper.setAttribute('data-tags', tags);
                processedCount++;
            });
        });
        
        console.log(`✅ Processed ${processedCount} links with hover menus`);
    }

    function createHoverMenu(urls) {
        const menu = document.createElement('div');
        menu.className = 'hover-menu compact-icons';
        
        // Always show all three icons in a compact row
        // Instagram icon
        const instagramLink = createSocialIcon('instagram', urls.instagram || '#', 'View on Instagram');
        if (!urls.instagram) instagramLink.classList.add('disabled');
        menu.appendChild(instagramLink);
        
        // Website icon
        const websiteLink = createSocialIcon('website', urls.website || '#', 'Visit Website');
        if (!urls.website) websiteLink.classList.add('disabled');
        menu.appendChild(websiteLink);
        
        // YouTube icon
        const youtubeLink = createSocialIcon('youtube', urls.youtube || '#', 'Watch on YouTube');
        if (!urls.youtube) youtubeLink.classList.add('disabled');
        menu.appendChild(youtubeLink);
        
        return menu;
    }

    function createSocialIcon(type, url, tooltip) {
        const link = document.createElement('a');
        link.className = `social-icon ${type}`;
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.setAttribute('data-tooltip', tooltip);
        link.innerHTML = icons[type];
        
        // Prevent click if disabled
        if (url === '#') {
            link.addEventListener('click', (e) => {
                e.preventDefault();
            });
        }
        
        return link;
    }

    function getWebsiteUrl(username, linkText, tags) {
        // Map known organizations to their websites
        const websiteMap = {
            // Mexican Embassies
            'embamexcol': 'https://embamex.sre.gob.mx/colombia/',
            'embamexeua': 'https://embamex.sre.gob.mx/eua/',
            'embamexcan': 'https://embamex.sre.gob.mx/canada/',
            'embamexchi': 'https://embamex.sre.gob.mx/chile/',
            'embamexgua': 'https://embamex.sre.gob.mx/guatemala/',
            'embamex_italia': 'https://embamex.sre.gob.mx/italia/',
            'embamexjp': 'https://embamex.sre.gob.mx/japon/',
            'embamexlibano': 'https://embamex.sre.gob.mx/libano/',
            'embamexperu': 'https://embamex.sre.gob.mx/peru/',
            'embamexesp': 'https://embamex.sre.gob.mx/espana/',
            'embamexur': 'https://embamex.sre.gob.mx/uruguay/',
            'embamexvenezuela': 'https://embamex.sre.gob.mx/venezuela/',
            
            // Colombian Government
            'alcaldiabogota': 'https://bogota.gov.co/',
            'presidenciacol': 'https://www.presidencia.gov.co/',
            'infopresidencia': 'https://www.presidencia.gov.co/',
            'mincultura': 'https://www.mincultura.gov.co/',
            'mineducacion': 'https://www.mineducacion.gov.co/',
            'minsaludcol': 'https://www.minsalud.gov.co/',
            'mintrabajocol': 'https://www.mintrabajo.gov.co/',
            'mindefensa': 'https://www.mindefensa.gov.co/',
            'minhacienda': 'https://www.minhacienda.gov.co/',
            'minticscolombia': 'https://www.mintic.gov.co/',
            'mintransporteco': 'https://www.mintransporte.gov.co/',
            'mincomercio': 'https://www.mincit.gov.co/',
            'minvivienda': 'https://www.minvivienda.gov.co/',
            'minagricultura': 'https://www.minagricultura.gov.co/',
            'minambiente': 'https://www.minambiente.gov.co/',
            'minciencias': 'https://www.minciencias.gov.co/',
            'minjusticia': 'https://www.minjusticia.gov.co/',
            'mininterior': 'https://www.mininterior.gov.co/',
            
            // Mexican Government
            'gobmexico': 'https://www.gob.mx/',
            'presidenciamx': 'https://www.gob.mx/presidencia',
            'sremx': 'https://www.gob.mx/sre',
            'sepgobmx': 'https://www.gob.mx/sep',
            'saludmexico': 'https://www.gob.mx/salud',
            'hacienda_mexico': 'https://www.gob.mx/hacienda',
            'sct_mx': 'https://www.gob.mx/sct',
            'semarnat_mexico': 'https://www.gob.mx/semarnat',
            'sedena': 'https://www.gob.mx/sedena',
            'semar': 'https://www.gob.mx/semar',
            
            // Museums
            'museonacional': 'https://museonacional.gov.co/',
            'banrepcultural': 'https://www.banrepcultural.org/',
            'mambo': 'https://mambogota.com/',
            'museodeloro': 'https://www.banrepcultural.org/bogota/museo-del-oro',
            'museobotero': 'https://www.banrepcultural.org/bogota/museo-botero',
            'malba': 'https://www.malba.org.ar/',
            'museodelprado': 'https://www.museodelprado.es/',
            'museoreinasofia': 'https://www.museoreinasofia.es/',
            
            // Universities
            'uniandes': 'https://uniandes.edu.co/',
            'uninorte': 'https://www.uninorte.edu.co/',
            'univalle': 'https://www.univalle.edu.co/',
            'unal': 'https://unal.edu.co/',
            'javeriana': 'https://www.javeriana.edu.co/',
            'unam': 'https://www.unam.mx/',
            'ipn': 'https://www.ipn.mx/',
            'itesm': 'https://tec.mx/',
            
            // Airlines
            'avianca': 'https://www.avianca.com/',
            'aeromexico': 'https://www.aeromexico.com/',
            'latamairlines': 'https://www.latam.com/',
            'volaris': 'https://www.volaris.com/',
            'vivaaerobus': 'https://www.vivaaerobus.com/',
            'copa': 'https://www.copaair.com/',
            
            // Banks
            'bancolombia': 'https://www.bancolombia.com/',
            'bancodebogota': 'https://www.bancodebogota.com/',
            'davivienda': 'https://www.davivienda.com/',
            'banorte': 'https://www.banorte.com/',
            'bbvamexico': 'https://www.bbva.mx/',
            'santandermexico': 'https://www.santander.com.mx/',
            'citibanamex': 'https://www.banamex.com/',
            
            // Metro Systems
            'metrodebogota': 'https://www.metrodebogota.gov.co/',
            'transmilenio': 'https://www.transmilenio.gov.co/',
            'metrocdmx': 'https://www.metro.cdmx.gob.mx/',
            'metromedellin': 'https://www.metrodemedellin.gov.co/',
            
            // Tourism
            'colombiatravel': 'https://colombia.travel/',
            'visitmexico': 'https://www.visitmexico.com/',
            'procolombia': 'https://www.colombia.co/',
            
            // Cities
            'cdmx': 'https://www.cdmx.gob.mx/',
            'guadalajaramx': 'https://guadalajara.gob.mx/',
            'monterreymx': 'https://www.monterrey.gob.mx/',
            
            // News Media
            'eltiempo': 'https://www.eltiempo.com/',
            'elespectador': 'https://www.elespectador.com/',
            'semana': 'https://www.semana.com/',
            'eluniversal': 'https://www.eluniversal.com.mx/',
            'reforma': 'https://www.reforma.com/',
            'milenio': 'https://www.milenio.com/',
            'excelsior': 'https://www.excelsior.com.mx/',
            
            // Other Embassies
            'usembassymex': 'https://mx.usembassy.gov/',
            'franciaenmexico': 'https://mx.ambafrance.org/',
            'ukinmexico': 'https://www.gov.uk/world/mexico',
            'belgicaenmexico': 'https://mexico.diplomatie.belgium.be/',
            'brasilnomexico': 'https://www.gov.br/mre/pt-br/embaixada-mexico',
            'embachilemexico': 'https://chile.gob.cl/mexico',
            'embacumex': 'https://misiones.cubaminrex.cu/mexico',
            'rdenmexico': 'https://www.embajadadominicana.org.mx/',
            'finlandiaenmexico': 'https://finlandia.org.mx/',
            'alemaniamexi': 'https://mexiko.diplo.de/',
            'indiainmex': 'https://www.indiainmexico.gov.in/',
            'irishembmexico': 'https://www.ireland.ie/mexico',
            'japanemb_mexico': 'https://www.mx.emb-japan.go.jp/',
            'embpanamamex': 'https://www.embajadadepanama.com.mx/',
            'elperuenmex': 'https://www.gob.pe/embajadaperu-mexico',
            'casadesuiza': 'https://www.eda.admin.ch/mexico',
            'ukrembassymex': 'https://mexico.mfa.gov.ua/',
            
            // Mexican Consulates
            'consulmexsea': 'https://consulmex.sre.gob.mx/seattle/',
            'consulmexla': 'https://consulmex.sre.gob.mx/losangeles/',
            'consulmexny': 'https://consulmex.sre.gob.mx/nuevayork/',
            'consulmexhou': 'https://consulmex.sre.gob.mx/houston/',
            'consulmexchi': 'https://consulmex.sre.gob.mx/chicago/',
            'consuladocolombiaatlanta': 'https://atlanta.consulado.gov.co/',
            'consuladocolboston': 'https://boston.consulado.gov.co/',
            
            // Venezuelan Embassies
            'embbarven': 'https://www.embajadadevenezuela.bb/',
            'brenvenezuela': 'https://caracas.itamaraty.gov.br/',
            'ueenvenezuela': 'https://www.eeas.europa.eu/delegations/venezuela',
            'embafrancia': 'https://ve.ambafrance.org/',
            'alemaniaenvenezuela': 'https://caracas.diplo.de/',
            'embespvenezuela': 'https://www.exteriores.gob.es/Embajadas/caracas/',
            'suizaenvenezuela': 'https://www.eda.admin.ch/caracas',
            'ukinvenezuela': 'https://www.gov.uk/world/venezuela',
            'plenvenezuela': 'https://www.mppre.gob.ve/',
            'embavefrancia': 'https://francia.embajada.gob.ve/',
            'embavenitalia': 'https://italia.embajada.gob.ve/',
            'embavenmexico': 'https://mexico.embajada.gob.ve/',
            
            // Colombian Organizations
            'policianalco': 'https://www.policia.gov.co/',
            'ejercitomilcol': 'https://www.ejercito.mil.co/',
            'armadacol': 'https://www.armada.mil.co/',
            'fac_colombia': 'https://www.fac.mil.co/',
            'idecolombia': 'https://www.idetec.edu.co/',
            'minrelacionesext_co': 'https://www.cancilleria.gov.co/',
            'migracióncol': 'https://www.migracioncolombia.gov.co/',
            'urnadecolombia': 'https://www.urnadecristal.gov.co/',
            'dnpcolombia': 'https://www.dnp.gov.co/',
            'funcionpublicacol': 'https://www.funcionpublica.gov.co/',
            'supertransportecol': 'https://www.supertransporte.gov.co/',
            'supersaludcol': 'https://www.supersalud.gov.co/',
            'superfinancieracol': 'https://www.superfinanciera.gov.co/',
            'supernotariadocol': 'https://www.supernotariado.gov.co/',
            'procuraduriacol': 'https://www.procuraduria.gov.co/',
            'fiscaliacol': 'https://www.fiscalia.gov.co/',
            'contraloriacol': 'https://www.contraloria.gov.co/',
            'defensoriadelpeubloco': 'https://www.defensoria.gov.co/',
            'registraduriacol': 'https://www.registraduria.gov.co/',
            
            // States and Cities
            'gobantioquia': 'https://www.antioquia.gov.co/',
            'gobboyaca': 'https://www.boyaca.gov.co/',
            'gobcaldas': 'https://www.caldas.gov.co/',
            'gobcauca': 'https://www.cauca.gov.co/',
            'gobcesar': 'https://www.cesar.gov.co/',
            'gobcordoba': 'https://www.cordoba.gov.co/',
            'gobhuila': 'https://www.huila.gov.co/',
            'gobguajira': 'https://www.laguajira.gov.co/',
            'gobmagdalena': 'https://www.magdalena.gov.co/',
            'gobnariño': 'https://www.narino.gov.co/',
            'gobnortedesantander': 'https://www.nortedesantander.gov.co/',
            'gobquindio': 'https://www.quindio.gov.co/',
            'gobrisaralda': 'https://www.risaralda.gov.co/',
            'gobtolima': 'https://www.tolima.gov.co/',
            'alcaldiademedellin': 'https://www.medellin.gov.co/',
            'alcaldiadecali': 'https://www.cali.gov.co/',
            'barrancabermeja': 'https://www.barrancabermeja.gov.co/',
            'alcaldiabquilla': 'https://www.barranquilla.gov.co/',
            'cartagena': 'https://www.cartagena.gov.co/',
            'santamarta': 'https://www.santamarta.gov.co/',
            
            // Cultural Organizations
            'teatronacionalcol': 'https://www.teatronacional.co/',
            'bibliotecanacional': 'https://www.bibliotecanacional.gov.co/',
            'icanh_colombia': 'https://www.icanh.gov.co/',
            'senaoficial': 'https://www.sena.edu.co/',
            'icfescol': 'https://www.icfes.gov.co/',
            'icetexcol': 'https://www.icetex.gov.co/',
            'colciencias': 'https://minciencias.gov.co/',
            
            // Sports
            'fedecoltenis': 'https://www.fedecoltenis.com/',
            'fedeciclismocol': 'https://www.federacioncolombianadeciclismo.com/',
            'fedeatletismocol': 'https://www.atletismo.com.co/',
            'fecoljudos': 'https://www.fedejudo.com/',
            'fedboxeo': 'https://www.fedeboxeo.com/',
            
            // Major Brands & Companies
            'cocacolave': 'https://www.coca-cola.com.ve/',
            'cocacolacol': 'https://www.coca-cola.com.co/',
            'pepsiven': 'https://www.pepsico.com.ve/',
            'pepsicovzla': 'https://www.pepsico.com.ve/',
            'savoynestle': 'https://www.nestle.com.ve/',
            'nestle': 'https://www.nestle.com/',
            'microsoft_contacto': 'https://www.microsoft.com/es-co/',
            'netflixcolombia': 'https://www.netflix.com/co/',
            'netflixes': 'https://www.netflix.com/es/',
            'netflixfamilia': 'https://www.netflix.com/',
            'netflixlat': 'https://www.netflix.com/',
            'paramountplusmx': 'https://www.paramountplus.com/mx/',
            'disneyplus': 'https://www.disneyplus.com/',
            'hbomax': 'https://www.hbomax.com/',
            'primevideo': 'https://www.primevideo.com/',
            'spotify': 'https://www.spotify.com/',
            'spotifycolombia': 'https://www.spotify.com/co/',
            'deezer': 'https://www.deezer.com/',
            'applemusic': 'https://music.apple.com/',
            
            // Media Organizations
            'caracolradio': 'https://caracol.com.co/',
            'caracolmedellin': 'https://caracol.com.co/',
            'caracoltv': 'https://www.caracoltv.com/',
            'rcnradio': 'https://www.rcnradio.com/',
            'rcntv': 'https://www.canalrcn.com/',
            'bluradio': 'https://www.bluradio.com/',
            'larepublica': 'https://www.larepublica.co/',
            'portafolio': 'https://www.portafolio.co/',
            'dinero': 'https://www.dinero.com/',
            'lafm': 'https://www.lafm.com.co/',
            'wradio': 'https://www.wradio.com.co/',
            
            // Libraries & Archives
            'bibliotecaluisangelarango': 'https://www.banrepcultural.org/bogota/biblioteca-luis-angel-arango',
            'bibliotecanal': 'https://www.bibliotecanacional.gov.co/',
            'bibliotecaepm': 'https://www.epm.com.co/site/bibliotecaepm/',
            'bibliotecapiloto': 'https://www.bibliotecapiloto.gov.co/',
            
            // Regional Governments
            'alcaldiadebucaramanga': 'https://www.bucaramanga.gov.co/',
            'gobernacionrisaralda': 'https://www.risaralda.gov.co/',
            'policiabmanga': 'https://www.policia.gov.co/',
            'alcaldiadepasto': 'https://www.pasto.gov.co/',
            'alcaldiadeibague': 'https://www.ibague.gov.co/',
            'alcaldiadepereira': 'https://www.pereira.gov.co/',
            'alcaldiadecucuta': 'https://www.cucuta.gov.co/',
            'alcaldiadevillavicencio': 'https://www.villavicencio.gov.co/',
            'alcaldiademonteria': 'https://www.monteria.gov.co/',
            'alcaldiadevalledupar': 'https://www.valledupar.gov.co/',
            'alcaldiadeneiva': 'https://www.neiva.gov.co/',
            
            // Food & Beverage Brands
            'frisby': 'https://www.frisby.com.co/',
            'kokoriko': 'https://www.kokoriko.com.co/',
            'crepes': 'https://www.crepesywaffles.com.co/',
            'crepesywaffles': 'https://www.crepesywaffles.com.co/',
            'juanvaldez': 'https://www.juanvaldezcafe.com/',
            'omacolcafe': 'https://www.oma.com.co/',
            'tacobell': 'https://www.tacobell.com/',
            'mcdonalds': 'https://www.mcdonalds.com/',
            'burgerking': 'https://www.burgerking.com/',
            'subway': 'https://www.subway.com/',
            'dominos': 'https://www.dominos.com.co/',
            'papajohns': 'https://www.papajohns.com.co/',
            'pizzahut': 'https://www.pizzahut.com.co/',
            
            // Retail & Shopping
            'exito': 'https://www.exito.com/',
            'carulla': 'https://www.carulla.com/',
            'olimpica': 'https://www.olimpica.com/',
            'jumbo': 'https://www.tiendasjumbo.co/',
            'metro': 'https://www.tiendasmetro.co/',
            'makro': 'https://www.makro.com.co/',
            'pricesmart': 'https://www.pricesmart.com/',
            'homecenter': 'https://www.homecenter.com.co/',
            'easy': 'https://www.easy.com.co/',
            'alkosto': 'https://www.alkosto.com/',
            'ktronix': 'https://www.ktronix.com/',
            'falabella': 'https://www.falabella.com.co/',
            
            // Telecommunications
            'clarocolombia': 'https://www.claro.com.co/',
            'movistar': 'https://www.movistar.co/',
            'tigocolombia': 'https://www.tigo.com.co/',
            'virgin': 'https://www.virginmobile.co/',
            'wom': 'https://www.wom.co/',
            'etb': 'https://www.etb.com.co/',
            'une': 'https://www.une.com.co/',
            'directv': 'https://www.directv.com.co/',
            
            // Financial Services
            'grupoaval': 'https://www.grupoaval.com/',
            'bancodebogota': 'https://www.bancodebogota.com/',
            'bancolombia': 'https://www.bancolombia.com/',
            'davivienda': 'https://www.davivienda.com/',
            'bbva': 'https://www.bbva.com.co/',
            'scotiabank': 'https://www.scotiabank.com.co/',
            'citibank': 'https://www.citibank.com.co/',
            'bancopular': 'https://www.bancopopular.com.co/',
            'bancodeoccidente': 'https://www.bancodeoccidente.com.co/',
            'avvillas': 'https://www.avvillas.com.co/',
            'bancoomeva': 'https://www.bancoomeva.com.co/',
            'bancocajasocial': 'https://www.bancocajasocial.com/',
            
            // Energy & Utilities
            'ecopetrol': 'https://www.ecopetrol.com.co/',
            'isagen': 'https://www.isagen.com.co/',
            'epm': 'https://www.epm.com.co/',
            'codensa': 'https://www.enel.com.co/',
            'gasnatural': 'https://www.grupovanti.com/',
            'aguasdebogota': 'https://www.acueducto.com.co/',
            'empresaspublicasdecali': 'https://www.emcali.com.co/',
            'essa': 'https://www.essa.com.co/',
            'edeq': 'https://www.edeq.com.co/',
            'chec': 'https://www.chec.com.co/',
            
            // Health Organizations
            'insaludcol': 'https://www.ins.gov.co/',
            'invima': 'https://www.invima.gov.co/',
            'saludcapital': 'https://www.saludcapital.gov.co/',
            'cruzroja': 'https://www.cruzrojacolombiana.org/',
            'cruzrojamexicana': 'https://www.cruzrojamexicana.org.mx/',
            'oms': 'https://www.who.int/es/',
            'ops': 'https://www.paho.org/',
            
            // International Organizations
            'un': 'https://www.un.org/',
            'onu': 'https://www.un.org/es/',
            'onuargentina': 'https://argentina.un.org/',
            'onucolombia': 'https://colombia.un.org/',
            'onumexico': 'https://mexico.un.org/',
            'unicef': 'https://www.unicef.org/',
            'unicefcolombia': 'https://www.unicef.org/colombia/',
            'unicefmexico': 'https://www.unicef.org/mexico/',
            'unesco': 'https://www.unesco.org/',
            'unescomx': 'https://es.unesco.org/fieldoffice/mexico',
            'unescobrasil': 'https://www.unesco.org/pt/fieldoffice/brasilia',
            'acnur': 'https://www.acnur.org/',
            'acnurcolombia': 'https://www.acnur.org/colombia',
            'pnud': 'https://www.undp.org/es',
            'pnudcolombia': 'https://www.co.undp.org/',
            'cepal': 'https://www.cepal.org/',
            'bid': 'https://www.iadb.org/',
            'oea': 'https://www.oas.org/',
            'mercosur': 'https://www.mercosur.int/',
            
            // Tech Companies
            'google': 'https://www.google.com/',
            'googlecolombia': 'https://www.google.com.co/',
            'googlemexico': 'https://www.google.com.mx/',
            'apple': 'https://www.apple.com/',
            'applelatam': 'https://www.apple.com/la/',
            'samsung': 'https://www.samsung.com/',
            'samsungcolombia': 'https://www.samsung.com/co/',
            'samsungmexico': 'https://www.samsung.com/mx/',
            'huawei': 'https://www.huawei.com/',
            'huaweicolombia': 'https://www.huawei.com/co/',
            'huaweimexico': 'https://www.huawei.com/mx/',
            'lenovo': 'https://www.lenovo.com/',
            'dell': 'https://www.dell.com/',
            'hp': 'https://www.hp.com/',
            'hpcolombia': 'https://www.hp.com/co-es/',
            'hpmexico': 'https://www.hp.com/mx-es/',
            'ibm': 'https://www.ibm.com/',
            'oracle': 'https://www.oracle.com/',
            'sap': 'https://www.sap.com/',
            'cisco': 'https://www.cisco.com/',
            
            // Fashion & Retail
            'zara': 'https://www.zara.com/',
            'hm': 'https://www.hm.com/',
            'forever21': 'https://www.forever21.com/',
            'gap': 'https://www.gap.com/',
            'nike': 'https://www.nike.com/',
            'adidas': 'https://www.adidas.com/',
            'puma': 'https://www.puma.com/',
            'underarmour': 'https://www.underarmour.com/',
            'newbalance': 'https://www.newbalance.com/',
            'converse': 'https://www.converse.com/',
            'vans': 'https://www.vans.com/',
            'thenorthface': 'https://www.thenorthface.com/',
            'columbia': 'https://www.columbia.com/',
            'patagonia': 'https://www.patagonia.com/',
            
            // Hotels & Hospitality
            'hilton': 'https://www.hilton.com/',
            'marriott': 'https://www.marriott.com/',
            'hyatt': 'https://www.hyatt.com/',
            'ihg': 'https://www.ihg.com/',
            'accor': 'https://www.accor.com/',
            'fourseasons': 'https://www.fourseasons.com/',
            'ritzcarlton': 'https://www.ritzcarlton.com/',
            'intercontinental': 'https://www.intercontinental.com/',
            'whotels': 'https://www.marriott.com/w-hotels/',
            'radisson': 'https://www.radissonhotels.com/',
            'hotelesdann': 'https://www.hotelesdann.com/',
            'decameron': 'https://www.decameron.com/',
            'estelar': 'https://www.hotelesestelar.com/',
            
            // Automotive
            'renault': 'https://www.renault.com/',
            'renaultcolombia': 'https://www.renault.com.co/',
            'chevrolet': 'https://www.chevrolet.com/',
            'chevroletcolombia': 'https://www.chevrolet.com.co/',
            'ford': 'https://www.ford.com/',
            'fordcolombia': 'https://www.ford.com.co/',
            'mazda': 'https://www.mazda.com/',
            'mazdacolombia': 'https://www.mazda.com.co/',
            'toyota': 'https://www.toyota.com/',
            'toyotacolombia': 'https://www.toyota.com.co/',
            'nissan': 'https://www.nissan.com/',
            'nissancolombia': 'https://www.nissan.com.co/',
            'honda': 'https://www.honda.com/',
            'hondacolombia': 'https://www.honda.com.co/',
            'volkswagen': 'https://www.volkswagen.com/',
            'vwcolombia': 'https://www.volkswagen.com.co/',
            'bmw': 'https://www.bmw.com/',
            'mercedes': 'https://www.mercedes-benz.com/',
            'audi': 'https://www.audi.com/',
            'porsche': 'https://www.porsche.com/',
            'ferrari': 'https://www.ferrari.com/',
            'lamborghini': 'https://www.lamborghini.com/',
            'tesla': 'https://www.tesla.com/',
            
            // Add more mappings as needed
        };
        
        // Check if we have a known website
        if (websiteMap[username]) {
            return websiteMap[username];
        }
        
        // Check tags for government sites
        if (tags.includes('government') || tags.includes('ministry')) {
            if (tags.includes('colombia')) {
                return 'https://www.gov.co/';
            }
            if (tags.includes('mexico')) {
                return 'https://www.gob.mx/';
            }
        }
        
        // Return null if no website found
        return null;
    }

    function getYoutubeUrl(username, linkText, tags) {
        // Map known organizations to their YouTube channels
                const youtubeMap = {
            'aeromexico': 'https://www.youtube.com/@aeromexico',
            'afa': 'https://www.youtube.com/@AFASeleccion',
            'agn': 'https://www.youtube.com/@AGNMexico',
            'agnargentina': 'https://www.youtube.com/@AGNArgentina',
            'agncolombia': 'https://www.youtube.com/@AGNColombia',
            'agricultura': 'https://www.youtube.com/@AGRICULTURA_MX',
            'alcaldiabogota': 'https://www.youtube.com/@AlcaldiaBogota',
            'america': 'https://www.youtube.com/@ClubAmerica',
            'anfp': 'https://www.youtube.com/@ANFPChile',
            'antioquia': 'https://www.youtube.com/@GobAntioquia',
            'armadademexico': 'https://www.youtube.com/@ArmadadeMexico',
            'atlantico': 'https://www.youtube.com/@GobAtlantico',
            'avianca': 'https://www.youtube.com/@avianca',
            'azteca7': 'https://www.youtube.com/@Azteca7',
            'aztecauno': 'https://www.youtube.com/@AztecaUno',
            'banamex': 'https://www.youtube.com/@Citibanamex',
            'bancodebogota': 'https://www.youtube.com/@BancodeBogota',
            'bancolombia': 'https://www.youtube.com/@grupobancolombia',
            'banorte': 'https://www.youtube.com/@banorte',
            'bbvamexico': 'https://www.youtube.com/@BBVAMexico',
            'bellasartes': 'https://www.youtube.com/@bellasartesmx',
            'bibliotecanal': 'https://www.youtube.com/@bibliotecanacional',
            'bibliotecanalargentina': 'https://www.youtube.com/@BibliotecaNacionalArgentina',
            'bibliotecanalchile': 'https://www.youtube.com/@bibliotecanacionaldechile',
            'bibliotecanalco': 'https://www.youtube.com/@BibliotecaNacionalColombia',
            'bibliotecavasconcelos': 'https://www.youtube.com/@BibliotecaVasconcelos',
            'bienestar': 'https://www.youtube.com/@BienestarMX',
            'bimbo': 'https://www.youtube.com/@Bimbo',
            'bluradio': 'https://www.youtube.com/@BluRadioCo',
            'boca': 'https://www.youtube.com/@BocaJuniors',
            'bogotaturismo': 'https://www.youtube.com/@bogotaturismo',
            'bolivar': 'https://www.youtube.com/@GobBolivar',
            'canal22': 'https://www.youtube.com/@Canal22',
            'canal22memoria': 'https://www.youtube.com/@MemoriaCanal22',
            'canal5': 'https://www.youtube.com/@Canal5',
            'canaldelcongreso': 'https://www.youtube.com/@CanaldelCongreso',
            'canaloncetv': 'https://www.youtube.com/@CanalOnceTV',
            'caracolradio': 'https://www.youtube.com/@CaracolRadio',
            'casaamerica': 'https://www.youtube.com/@CasaAmerica',
            'casalamm': 'https://www.youtube.com/@CasaLamm',
            'casarealtv': 'https://www.youtube.com/@casarealtv',
            'ccemx': 'https://www.youtube.com/@CCEMx',
            'cdmx': 'https://www.youtube.com/@GobiernoCDMX',
            'cenart': 'https://www.youtube.com/@CENART_MX',
            'centroculturalbogota': 'https://www.youtube.com/@CentroCulturalBogota',
            'centroculturalespana': 'https://www.youtube.com/@CCEMx',
            'centroimagen': 'https://www.youtube.com/@CentroImagen',
            'cervantino': 'https://www.youtube.com/@FestivalCervantino',
            'chiapas': 'https://www.youtube.com/@GobiernoChiapas',
            'chiletravel': 'https://www.youtube.com/@chiletravel',
            'chivas': 'https://www.youtube.com/@Chivas',
            'cineteca': 'https://www.youtube.com/@CinetecaNacional',
            'citibanamex': 'https://www.youtube.com/@Citibanamex',
            'clarin': 'https://www.youtube.com/@clarin',
            'cocacola': 'https://www.youtube.com/@CocaColaMexico',
            'colocolo': 'https://www.youtube.com/@ColoColo',
            'colombiatravel': 'https://www.youtube.com/@colombiatravel',
            'comunicaciones': 'https://www.youtube.com/@SCT_mx',
            'conaculta': 'https://www.youtube.com/@conaculta',
            'consulmexchi': 'https://www.youtube.com/@ConsulmexChicago',
            'consulmexhou': 'https://www.youtube.com/@ConsulmexHouston',
            'consulmexla': 'https://www.youtube.com/@ConsulmexLA',
            'consulmexny': 'https://www.youtube.com/@ConsulmexNY',
            'consulmexsea': 'https://www.youtube.com/@consulmexsea',
            'copa': 'https://www.youtube.com/@CopaAirlines',
            'coppel': 'https://www.youtube.com/@Coppel',
            'corinthians': 'https://www.youtube.com/@Corinthians',
            'corona': 'https://www.youtube.com/@Corona',
            'cruzazul': 'https://www.youtube.com/@CruzAzul',
            'cultura': 'https://www.youtube.com/@CulturaMexico',
            'cundinamarca': 'https://www.youtube.com/@GobCundinamarca',
            'davivienda': 'https://www.youtube.com/@Davivienda',
            'ecobici': 'https://www.youtube.com/@EcobiciCDMX',
            'economia': 'https://www.youtube.com/@SE_mx',
            'ecuadortravel': 'https://www.youtube.com/@ecuadortravel',
            'edomex': 'https://www.youtube.com/@GobiernoEdoMex',
            'ejercitomexicano': 'https://www.youtube.com/@EjercitoMexicano',
            'elcomercio': 'https://www.youtube.com/@elcomercio',
            'elektra': 'https://www.youtube.com/@Elektra',
            'elespectador': 'https://www.youtube.com/@ElEspectador',
            'elfinanciero': 'https://www.youtube.com/@ElFinancieroTV',
            'elmercurio': 'https://www.youtube.com/@ElMercurioChile',
            'elnacional': 'https://www.youtube.com/@elnacionaldominicano',
            'elpalaciodehierro': 'https://www.youtube.com/@ElPalacioDeHierro',
            'eltiempo': 'https://www.youtube.com/@eltiempo',
            'eluniversal': 'https://www.youtube.com/@ElUniversalMex',
            'embamex_italia': 'https://www.youtube.com/@embamex_italia',
            'embamexcan': 'https://www.youtube.com/@embamexcan',
            'embamexchi': 'https://www.youtube.com/@embamexchi',
            'embamexcol': 'https://www.youtube.com/@embamexcol',
            'embamexesp': 'https://www.youtube.com/@embamexesp',
            'embamexeua': 'https://www.youtube.com/@embamexeua',
            'embamexgua': 'https://www.youtube.com/@embamexgua',
            'embamexjp': 'https://www.youtube.com/@embamexjp',
            'embamexlibano': 'https://www.youtube.com/@embamexlibano',
            'embamexperu': 'https://www.youtube.com/@embamexperu',
            'embamexur': 'https://www.youtube.com/@embamexur',
            'embamexvenezuela': 'https://www.youtube.com/@embamexvenezuela',
            'estereopicnic': 'https://www.youtube.com/@EsteroPicnic',
            'excelsior': 'https://www.youtube.com/@ExcelsiorMex',
            'exito': 'https://www.youtube.com/@almacenesexito',
            'falabella': 'https://www.youtube.com/@Falabella',
            'fce': 'https://www.youtube.com/@FondoCulturaEconomica',
            'fcfseleccioncol': 'https://www.youtube.com/@FCFSeleccionCol',
            'fedmexfut': 'https://www.youtube.com/@FedMexFut',
            'filarmonica': 'https://www.youtube.com/@FilarmonicaColombia',
            'filmoteca': 'https://www.youtube.com/@FilmotecaUNAM',
            'filo': 'https://www.youtube.com/@FILOaxaca',
            'flamengo': 'https://www.youtube.com/@Flamengo',
            'fonatur': 'https://www.youtube.com/@FONATUR_MX',
            'forotv': 'https://www.youtube.com/@ForoTV',
            'fpf': 'https://www.youtube.com/@FPFOficial',
            'franciaenmexico': 'https://www.youtube.com/@FranciaenMexico',
            'galavision': 'https://www.youtube.com/@Galavision',
            'gam': 'https://www.youtube.com/@CentroGAM',
            'gobmexico': 'https://www.youtube.com/@gobiernodemexico',
            'grupmodelo': 'https://www.youtube.com/@GrupoModelo',
            'guadalajaramx': 'https://www.youtube.com/@GobiernoGuadalajara',
            'guanajuato': 'https://www.youtube.com/@GobiernoGuanajuato',
            'guardianacionalmx': 'https://www.youtube.com/@GuardiaNacionalMX',
            'guggenheim': 'https://www.youtube.com/@GuggenheimMuseum',
            'hacienda_mexico': 'https://www.youtube.com/@HaciendaMexico',
            'hsbc': 'https://www.youtube.com/@HSBCMexico',
            'imagenradio': 'https://www.youtube.com/@ImagenRadio',
            'imagentv': 'https://www.youtube.com/@ImagenTelevisión',
            'imcine': 'https://www.youtube.com/@IMCINEmx',
            'inah': 'https://www.youtube.com/@INAHTV',
            'inahmx': 'https://www.youtube.com/@INAHTV',
            'inba': 'https://www.youtube.com/@INBAmx',
            'infopresidencia': 'https://www.youtube.com/@PresidenciaColombiaOficial',
            'inprotur': 'https://www.youtube.com/@INPROTUR',
            'institutocervantes': 'https://www.youtube.com/@InstitutoCervantes',
            'ipn': 'https://www.youtube.com/@IPN_MX',
            'itesm': 'https://www.youtube.com/@TecdeMonterrey',
            'jalisco': 'https://www.youtube.com/@GobiernoJalisco',
            'javeriana': 'https://www.youtube.com/@PontificiaJaveriana',
            'jornada': 'https://www.youtube.com/@LaJornadaOnLine',
            'jumex': 'https://www.youtube.com/@Jumex',
            'lala': 'https://www.youtube.com/@LALA',
            'lanacion': 'https://www.youtube.com/@lanacion',
            'laoctava': 'https://www.youtube.com/@LaOctava',
            'lasestrellas': 'https://www.youtube.com/@LasEstrellas',
            'latam': 'https://www.youtube.com/@LATAM',
            'latamairlines': 'https://www.youtube.com/@LATAM',
            'latercera': 'https://www.youtube.com/@latercera',
            'ligamx': 'https://www.youtube.com/@LigaMX',
            'liverpool': 'https://www.youtube.com/@Liverpool',
            'lollapalooza': 'https://www.youtube.com/@LollapaloozaCL',
            'mac': 'https://www.youtube.com/@MACChile',
            'macba': 'https://www.youtube.com/@MACBA_Barcelona',
            'macchile': 'https://www.youtube.com/@MACChile',
            'malba': 'https://www.youtube.com/@malbamuseo',
            'mali': 'https://www.youtube.com/@museodeartedelima',
            'mam': 'https://www.youtube.com/@MAMSaoPaulo',
            'masp': 'https://www.youtube.com/@maspmuseu',
            'mavi': 'https://www.youtube.com/@MAVISantiago',
            'memoriaychile': 'https://www.youtube.com/@MuseoMemoriaChile',
            'metrobus': 'https://www.youtube.com/@Metrobus_CDMX',
            'metrocaracas': 'https://www.youtube.com/@metrocaracas',
            'metrocdmx': 'https://www.youtube.com/@MetroCDMX',
            'metrodebogota': 'https://www.youtube.com/@metrodebogota',
            'metrolima': 'https://www.youtube.com/@MetrodeLima',
            'metromedellin': 'https://www.youtube.com/@metrodemedellin',
            'metroquito': 'https://www.youtube.com/@MetroQuito',
            'metrosantiago': 'https://www.youtube.com/@metrodesantiago',
            'mexicotravelchannel': 'https://www.youtube.com/@MexicoTravelChannel',
            'milenio': 'https://www.youtube.com/@MilenioNoticias',
            'millonarios': 'https://www.youtube.com/@MillonariosFC',
            'minagricultura': 'https://www.youtube.com/@MinAgricultura',
            'minambiente': 'https://www.youtube.com/@MinAmbiente',
            'minciencias': 'https://www.youtube.com/@MinCiencias',
            'mincit': 'https://www.youtube.com/@MinComercioColombia',
            'mincomercio': 'https://www.youtube.com/@MincomercioColombia',
            'mincultura': 'https://www.youtube.com/@MinisterioCulturaColombia',
            'mindefensa': 'https://www.youtube.com/@MindefensaColombia',
            'mineducacion': 'https://www.youtube.com/@Mineducacion',
            'minhacienda': 'https://www.youtube.com/@MinHaciendaColombia',
            'mininterior': 'https://www.youtube.com/@MinInterior',
            'minjusticia': 'https://www.youtube.com/@MinJusticia',
            'minrelext': 'https://www.youtube.com/@CancilleriaColombia',
            'minsaludcol': 'https://www.youtube.com/@MinSaludColombia',
            'minticscolombia': 'https://www.youtube.com/@MinTICColombia',
            'mintrabajocol': 'https://www.youtube.com/@MintrabajoColombia',
            'mintransporteco': 'https://www.youtube.com/@Mintransporte',
            'minvivienda': 'https://www.youtube.com/@MinVivienda',
            'mna': 'https://www.youtube.com/@museonacionaldeantropologia',
            'mnba': 'https://www.youtube.com/@museobellasarteschile',
            'monterrey': 'https://www.youtube.com/@RayadosMTY',
            'monterreymx': 'https://www.youtube.com/@GobiernoMonterrey',
            'muac': 'https://www.youtube.com/@MUAC_UNAM',
            'multimedios': 'https://www.youtube.com/@multimedios',
            'munal': 'https://www.youtube.com/@munal_mx',
            'museoantropo': 'https://www.youtube.com/@museonacionaldeantropologia',
            'museobellasartes': 'https://www.youtube.com/@museobellasartes',
            'museobotero': 'https://www.youtube.com/@museobotero',
            'museodeartemoderno': 'https://www.youtube.com/@MuseoArteModernoMX',
            'museodeloro': 'https://www.youtube.com/@museodeloro',
            'museodelprado': 'https://www.youtube.com/@museodelprado',
            'museoevita': 'https://www.youtube.com/@museoevita',
            'museofridakahlo': 'https://www.youtube.com/@museofridakahlo',
            'museojumex': 'https://www.youtube.com/@museojumex',
            'museolarco': 'https://www.youtube.com/@museolarco',
            'museomemoria': 'https://www.youtube.com/@museomemoria',
            'museonacion': 'https://www.youtube.com/@MuseoNacionPeru',
            'museonacionalmexico': 'https://www.youtube.com/@museonacionalmexico',
            'museonal': 'https://www.youtube.com/@museonacionaldecolombia',
            'museooro': 'https://www.youtube.com/@MuseoOroPeru',
            'museoreinasofia': 'https://www.youtube.com/@museoreinasofia',
            'museosoumaya': 'https://www.youtube.com/@museosoumaya',
            'museotamayo': 'https://www.youtube.com/@museotamayo',
            'museudonacional': 'https://www.youtube.com/@MuseuNacional',
            'museuhistorico': 'https://www.youtube.com/@museuhistoriconacional',
            'museumofmodernart': 'https://www.youtube.com/@MoMAvideos',
            'mvsnoticias': 'https://www.youtube.com/@MVSNoticias',
            'nacional': 'https://www.youtube.com/@AtleticoNacional',
            'nuevoleon': 'https://www.youtube.com/@nuevoleon',
            'oaxaca': 'https://www.youtube.com/@GobiernoOaxaca',
            'ofilarmonica': 'https://www.youtube.com/@OFILMexico',
            'osn': 'https://www.youtube.com/@OSNMexico',
            'ossodre': 'https://www.youtube.com/@OSSODRE',
            'oxxo': 'https://www.youtube.com/@OXXOTiendas',
            'palaciobellas': 'https://www.youtube.com/@PalacioBellasArtes',
            'palmeiras': 'https://www.youtube.com/@Palmeiras',
            'penafiel': 'https://www.youtube.com/@Penafiel',
            'pinacoteca': 'https://www.youtube.com/@Pinacoteca',
            'policianalco': 'https://www.youtube.com/@PoliciaNacionalColombia',
            'precolombino': 'https://www.youtube.com/@museoprecolombino',
            'presidenciamx': 'https://www.youtube.com/@PresidenciaMexico',
            'proceso': 'https://www.youtube.com/@procesomx',
            'procolombia': 'https://www.youtube.com/@PROCOLOMBIA',
            'promperu': 'https://www.youtube.com/@PROMPERU',
            'pucchile': 'https://www.youtube.com/@pucchile',
            'pucp': 'https://www.youtube.com/@pucp',
            'puebla': 'https://www.youtube.com/@GobiernoPuebla',
            'pumas': 'https://www.youtube.com/@PumasUNAM',
            'queretaro': 'https://www.youtube.com/@GobiernoQueretaro',
            'radioformula': 'https://www.youtube.com/@RadioFormula',
            'reforma': 'https://www.youtube.com/@reforma',
            'ripley': 'https://www.youtube.com/@Ripley',
            'river': 'https://www.youtube.com/@RiverPlate',
            'rockalsparque': 'https://www.youtube.com/@RockalParque',
            'salud': 'https://www.youtube.com/@SecretariadeSaludMexico',
            'saludmexico': 'https://www.youtube.com/@SecretariadeSaludMexico',
            'sanborns': 'https://www.youtube.com/@Sanborns',
            'santafe': 'https://www.youtube.com/@SantaFe',
            'santander': 'https://www.youtube.com/@GobSantander',
            'santandermexico': 'https://www.youtube.com/@SantanderMexico',
            'santos': 'https://www.youtube.com/@SantosLaguna',
            'scotiabank': 'https://www.youtube.com/@ScotiabankMexico',
            'sct_mx': 'https://www.youtube.com/@SCT_mx',
            'sears': 'https://www.youtube.com/@SearsMexico',
            'sectur': 'https://www.youtube.com/@SECTUR_MX',
            'sedena': 'https://www.youtube.com/@SEDENA_mx',
            'semana': 'https://www.youtube.com/@RevistaSemana',
            'semar': 'https://www.youtube.com/@SEMARMexico',
            'semarnat': 'https://www.youtube.com/@SEMARNAT_mx',
            'semarnat_mexico': 'https://www.youtube.com/@SEMARNAT_mx',
            'sener': 'https://www.youtube.com/@SENER_mx',
            'sep': 'https://www.youtube.com/@SEPmexico',
            'sepgobmx': 'https://www.youtube.com/@SEPGobMx',
            'sernatur': 'https://www.youtube.com/@SERNATUR',
            'sinfonica': 'https://www.youtube.com/@SinfonicaNacional',
            'sremx': 'https://www.youtube.com/@sre_mx',
            'teatrocolon': 'https://www.youtube.com/@teatrocolon',
            'teatrocolonbogota': 'https://www.youtube.com/@teatrocolonbogota',
            'teatrodiana': 'https://www.youtube.com/@TeatroDiana',
            'teatrojorgenegar': 'https://www.youtube.com/@TeatroJorgeNegrete',
            'teatrometropolitan': 'https://www.youtube.com/@TeatroMetropolitan',
            'teatromunicipal': 'https://www.youtube.com/@teatromunicipal',
            'teatrosolis': 'https://www.youtube.com/@teatrosolis',
            'telemundo': 'https://www.youtube.com/@Telemundo',
            'televisa': 'https://www.youtube.com/@televisa',
            'tigres': 'https://www.youtube.com/@TigresOficial',
            'toluca': 'https://www.youtube.com/@Toluca',
            'transmilenio': 'https://www.youtube.com/@TransMilenio',
            'tudn': 'https://www.youtube.com/@TUDN',
            'turismomedellin': 'https://www.youtube.com/@TurismoMedellin',
            'tvsenado': 'https://www.youtube.com/@TVSenadoBrasil',
            'uamx': 'https://www.youtube.com/@UAM_MX',
            'uba': 'https://www.youtube.com/@UBAonline',
            'uchile': 'https://www.youtube.com/@uchile',
            'unal': 'https://www.youtube.com/@universidadnacionaldecolombia',
            'unam': 'https://www.youtube.com/@UNAM_MX',
            'uniandes': 'https://www.youtube.com/@uniandes',
            'unimas': 'https://www.youtube.com/@UniMas',
            'universidadchile': 'https://www.youtube.com/@UdeChile',
            'univision': 'https://www.youtube.com/@univision',
            'uruguaynatural': 'https://www.youtube.com/@uruguaynatural',
            'usembassymex': 'https://www.youtube.com/@USEmbassyMexico',
            'usp': 'https://www.youtube.com/@canalusp',
            'valledelcauca': 'https://www.youtube.com/@GobValle',
            'veracruz': 'https://www.youtube.com/@GobiernoVeracruz',
            'visitargentina': 'https://www.youtube.com/@visitargentina',
            'visitcdmx': 'https://www.youtube.com/@VisitCDMX',
            'visitmexico': 'https://www.youtube.com/@VisitMexico',
            'visitperu': 'https://www.youtube.com/@visitperu',
            'vivaaerobus': 'https://www.youtube.com/@VivaAerobus',
            'vivelatino': 'https://www.youtube.com/@ViveLatino',
            'volaris': 'https://www.youtube.com/@volarisoficial',
            'wradio': 'https://www.youtube.com/@WRadioColombia',
            'yucatan': 'https://www.youtube.com/@GobiernoYucatan',
            
            // Additional YouTube Channels - Brands
            'cocacolave': 'https://www.youtube.com/@CocaColaVenezuela',
            'cocacolacol': 'https://www.youtube.com/@CocaColaColombia',
            'pepsiven': 'https://www.youtube.com/@PepsiVenezuela',
            'pepsicovzla': 'https://www.youtube.com/@PepsiCoVenezuela',
            'nestle': 'https://www.youtube.com/@nestle',
            'microsoft_contacto': 'https://www.youtube.com/@MicrosoftLatam',
            
            // Colombian Government & Organizations
            'mincultura': 'https://www.youtube.com/@MinCulturaColombia',
            'mineducacion': 'https://www.youtube.com/@MineducacionColombia',
            'minsaludcol': 'https://www.youtube.com/@MinSaludColombia',
            'mintrabajocol': 'https://www.youtube.com/@MinTrabajoColombia',
            'mindefensa': 'https://www.youtube.com/@MindefensaColombia',
            'minhacienda': 'https://www.youtube.com/@MinHaciendaColombia',
            'minticscolombia': 'https://www.youtube.com/@MinTICColombia',
            'mintransporteco': 'https://www.youtube.com/@MintransporteColombia',
            'mincomercio': 'https://www.youtube.com/@MincomercioColombia',
            'minviviendacol': 'https://www.youtube.com/@MinViviendaColombia',
            'minagricultura': 'https://www.youtube.com/@MinAgriculturaColombia',
            'minambiente': 'https://www.youtube.com/@MinAmbienteColombia',
            'minciencias': 'https://www.youtube.com/@MinCienciasColombia',
            'minjusticia': 'https://www.youtube.com/@MinjusticiaColombia',
            'mininterior': 'https://www.youtube.com/@MinInteriorColombia',
            'ejercitomilcol': 'https://www.youtube.com/@EjercitoNacionalColombia',
            'armadacol': 'https://www.youtube.com/@ArmadaColombia',
            'fac_colombia': 'https://www.youtube.com/@FuerzaAereaColombia',
            'dnpcolombia': 'https://www.youtube.com/@DNPColombia',
            'funcionpublicacol': 'https://www.youtube.com/@FuncionPublicaColombia',
            'supertransportecol': 'https://www.youtube.com/@SupertransporteColombia',
            'supersaludcol': 'https://www.youtube.com/@SupersaludColombia',
            'superfinancieracol': 'https://www.youtube.com/@SuperfinancieraColombia',
            'procuraduriacol': 'https://www.youtube.com/@ProcuraduriaCol',
            'fiscaliacol': 'https://www.youtube.com/@FiscaliaColombia',
            'contraloriacol': 'https://www.youtube.com/@ContraloriaColombia',
            'defensoriadelpeubloco': 'https://www.youtube.com/@DefensoriaColombia',
            'registraduriacol': 'https://www.youtube.com/@RegistraduriaCol',
            
            // Colombian Education & Culture
            'icfescol': 'https://www.youtube.com/@ICFESColombia',
            'icetexcol': 'https://www.youtube.com/@ICETEXColombia',
            'senaoficial': 'https://www.youtube.com/@SENAColombia',
            'icanh_colombia': 'https://www.youtube.com/@ICANHColombia',
            'teatronacionalcol': 'https://www.youtube.com/@TeatroNacionalColombia',
            'bibliotecanacional': 'https://www.youtube.com/@BibliotecaNacionalCol',
            
            // Colombian Utilities & Services
            'ecopetrol': 'https://www.youtube.com/@Ecopetrol',
            'isagen': 'https://www.youtube.com/@ISAGENColombia',
            'epm': 'https://www.youtube.com/@EPMColombia',
            'codensa': 'https://www.youtube.com/@EnelColombia',
            'claro': 'https://www.youtube.com/@ClaroColombia',
            'movistar': 'https://www.youtube.com/@MovistarColombia',
            'tigocolombia': 'https://www.youtube.com/@TigoColombia',
            'etb': 'https://www.youtube.com/@ETBColombia',
            'directv': 'https://www.youtube.com/@DIRECTVLatAm',
            
            // Colombian Banks
            'grupoaval': 'https://www.youtube.com/@GrupoAval',
            'scotiabankcol': 'https://www.youtube.com/@ScotiabankColpatria',
            'citibankcol': 'https://www.youtube.com/@CitibankColombia',
            'bancopopular': 'https://www.youtube.com/@BancoPopularCol',
            'bancodeoccidente': 'https://www.youtube.com/@BancoOccidente',
            'avvillas': 'https://www.youtube.com/@BancoAVVillas',
            'bancoomeva': 'https://www.youtube.com/@BancoCoomeva',
            'bancocajasocial': 'https://www.youtube.com/@BancoCajaSocial',
            'netflixcolombia': 'https://www.youtube.com/@NetflixLatam',
            'netflixes': 'https://www.youtube.com/@NetflixEspana',
            'netflixfamilia': 'https://www.youtube.com/@NetflixFamily',
            'netflixlat': 'https://www.youtube.com/@NetflixLatam',
            'paramountplusmx': 'https://www.youtube.com/@ParamountPlusLA',
            
            // Additional YouTube - Media
            'caracolradio': 'https://www.youtube.com/@CaracolRadio',
            'caracoltv': 'https://www.youtube.com/@CaracolTV',
            'rcnradio': 'https://www.youtube.com/@RCNRadio',
            'rcntv': 'https://www.youtube.com/@CanalRCN',
            'bluradio': 'https://www.youtube.com/@BluRadioCo',
            
            // Additional YouTube - Food Brands
            'frisby': 'https://www.youtube.com/@FrisbyColombia',
            'kokoriko': 'https://www.youtube.com/@KokorikoColombia',
            'crepesywaffles': 'https://www.youtube.com/@CrepesWaffles',
            'juanvaldez': 'https://www.youtube.com/@JuanValdezCafe',
            'dominos': 'https://www.youtube.com/@DominosPizzaColombia',
            'papajohns': 'https://www.youtube.com/@PapaJohnsColombia',
            
            // Additional YouTube - Retail
            'exito': 'https://www.youtube.com/@almacenesexito',
            'carulla': 'https://www.youtube.com/@Carulla',
            'olimpica': 'https://www.youtube.com/@OlimpicaColombia',
            'jumbo': 'https://www.youtube.com/@JumboColombia',
            'homecenter': 'https://www.youtube.com/@HomecenterCo',
            'alkosto': 'https://www.youtube.com/@AlkostoColombia',
            'falabella': 'https://www.youtube.com/@FalabellaColombia',
            
            // Additional YouTube - Telecoms
            'clarocolombia': 'https://www.youtube.com/@ClaroColombia',
            'movistar': 'https://www.youtube.com/@MovistarColombia',
            'tigocolombia': 'https://www.youtube.com/@TigoColombia',
            'directv': 'https://www.youtube.com/@DIRECTVLatam',
            
            // Additional YouTube - Banks
            'grupoaval': 'https://www.youtube.com/@GrupoAval',
            'bbva': 'https://www.youtube.com/@BBVAColombia',
            'scotiabank': 'https://www.youtube.com/@ScotiabankColombia',
            
            // Additional YouTube - Energy
            'ecopetrol': 'https://www.youtube.com/@Ecopetrol',
            'isagen': 'https://www.youtube.com/@ISAGEN',
            'epm': 'https://www.youtube.com/@EPMMedellin',
            
            // Additional YouTube - Government Agencies
            'dane': 'https://www.youtube.com/@DANEColombia',
            'dian': 'https://www.youtube.com/@DIANColombia',
            'invima': 'https://www.youtube.com/@INVIMAColombia',
            'icbf': 'https://www.youtube.com/@ICBFColombia',
            'sena': 'https://www.youtube.com/@SENAColombia',
            'colpensiones': 'https://www.youtube.com/@Colpensiones',
            'supersociedades': 'https://www.youtube.com/@Supersociedades',
            'superindustria': 'https://www.youtube.com/@SICColombia',
            'aerocivil': 'https://www.youtube.com/@AerocivilColombia',
            
            // Additional YouTube - Regional
            'alcaldiadebucaramanga': 'https://www.youtube.com/@AlcaldiaBucaramanga',
            'alcaldiadepasto': 'https://www.youtube.com/@AlcaldiaPasto',
            'alcaldiadeibague': 'https://www.youtube.com/@AlcaldiaIbague',
            'alcaldiadepereira': 'https://www.youtube.com/@AlcaldiaPereira',
            'alcaldiadecucuta': 'https://www.youtube.com/@AlcaldiaCucuta',
            'alcaldiadevillavicencio': 'https://www.youtube.com/@AlcaldiaVillavicencio',
            'alcaldiademonteria': 'https://www.youtube.com/@AlcaldiaMonteria',
            'alcaldiadevalledupar': 'https://www.youtube.com/@AlcaldiaValledupar',
            'alcaldiadeneiva': 'https://www.youtube.com/@AlcaldiaNeiva'
        };
        
        // Check if we have a known YouTube channel
        if (youtubeMap[username]) {
            return youtubeMap[username];
        }
        
        // Return null if no YouTube channel found
        return null;
    }

    // Re-initialize on dynamic content changes
    window.reinitializeHoverMenus = () => {
        // Reset and reinitialize only if needed
        if (initialized) {
            console.log('⚠️ Hover menus already initialized, checking for new links only...');
            
            // Only process new unprocessed links
            const linkGrids = document.querySelectorAll('.link-grid');
            let newLinksCount = 0;
            
            linkGrids.forEach(grid => {
                const unprocessedLinks = grid.querySelectorAll('a:not([data-processed="true"])');
                if (unprocessedLinks.length > 0) {
                    console.log(`Found ${unprocessedLinks.length} new unprocessed links`);
                    newLinksCount += unprocessedLinks.length;
                    
                    unprocessedLinks.forEach(link => {
                        // Mark as processed immediately
                        link.dataset.processed = 'true';
                        
                        // Skip if already wrapped
                        if (link.parentElement.classList.contains('link-item-wrapper')) {
                            return;
                        }
                        
                        // Extract data from original link
                        const instagramUrl = link.href;
                        const linkText = link.textContent.trim();
                        const tags = link.getAttribute('data-tags') || '';
                        
                        // Extract username from Instagram URL
                        const username = instagramUrl.includes('instagram.com/') 
                            ? instagramUrl.split('instagram.com/')[1].replace('/', '') 
                            : '';
                        
                        // Create hover menu
                        const hoverMenu = createHoverMenu({
                            instagram: instagramUrl,
                            website: getWebsiteUrl(username, linkText, tags),
                            youtube: getYoutubeUrl(username, linkText, tags)
                        });
                        
                        // Create wrapper that preserves the original link
                        const wrapper = document.createElement('div');
                        wrapper.className = 'link-item-wrapper';
                        
                        // Move the original link into the wrapper
                        const parent = link.parentNode;
                        parent.replaceChild(wrapper, link);
                        
                        // Add the original link back as-is
                        link.classList.add('link-item');
                        wrapper.appendChild(link);
                        wrapper.appendChild(hoverMenu);
                    });
                }
            });
            
            if (newLinksCount > 0) {
                console.log(`✅ Processed ${newLinksCount} new links`);
            }
        } else {
            initializeHoverMenus();
        }
    };

})();