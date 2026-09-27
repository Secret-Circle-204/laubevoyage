import type { Payload } from 'payload'

function toLexical(text: string) {
  return {
    root: {
      type: 'root',
      format: '' as const,
      indent: 0,
      version: 1,
      children: [
        {
          type: 'paragraph',
          format: '' as const,
          indent: 0,
          version: 1,
          children: [
            {
              type: 'text',
              text: text || '',
              version: 1,
              detail: 0,
              format: 0,
              mode: 'normal' as const,
              style: '',
            },
          ],
          direction: 'ltr' as const,
        },
      ],
      direction: 'ltr' as const,
    },
  } as any
}

export interface CitySeedDef {
  name: string
  slug: string
  countryCode: string
  description: string
  seo: {
    title: string
    description: string
    keywords: string
  }
}

export const CANONICAL_CITIES: CitySeedDef[] = [
  // ==========================================
  // Egypt (6)
  // ==========================================
  {
    name: 'Cairo',
    slug: 'cairo',
    countryCode: 'EG',
    description:
      'The bustling cultural and historical capital of Egypt, Cairo hosts the legendary Giza Plateau with the Great Pyramids and Sphinx, the world-renowned Grand Egyptian Museum, medieval Islamic citadels, and the vibrant historic bazaars of Khan El Khalili.',
    seo: {
      title: "Luxury Cairo Private Tours & Pyramids Expeditions | L'Aube Voyage",
      description:
        'Experience Cairo in supreme luxury with private guided tours. VIP access to the Giza Pyramids, Grand Egyptian Museum, and luxury suites.',
      keywords: 'Cairo luxury travel, Giza Pyramids private tour, Grand Egyptian Museum VIP, Cairo luxury hotel, private Cairo tours',
    },
  },
  {
    name: 'Luxor',
    slug: 'luxor',
    countryCode: 'EG',
    description:
      'Widely celebrated as the world’s greatest open-air museum, Luxor spans the monumental Karnak and Luxor Temples on the East Bank and the royal tombs of the Valley of the Kings and Queen Hatshepsut Temple on the West Bank.',
    seo: {
      title: "Private Luxor Temple Tours & Valley of the Kings Expeditions | L'Aube Voyage",
      description:
        'Discover ancient Thebes with luxury Luxor private itineraries. VIP entrance to King Tutankhamun tomb, private Karnak Temple access, and hot air balloon flights.',
      keywords: 'Luxor luxury tours, Valley of the Kings VIP, Karnak Temple private tour, Luxor hot air balloon, luxury Nile cruise Luxor',
    },
  },
  {
    name: 'Aswan',
    slug: 'aswan',
    countryCode: 'EG',
    description:
      'Egypt’s sun-drenched southern gateway, Aswan is famed for tranquil Nile felucca voyages around Elephantine Island, the island sanctuary of Philae Temple, authentic Nubian heritage, and the historic Old Cataract Hotel.',
    seo: {
      title: "Luxury Aswan Nile Expeditions & Philae Temple Tours | L'Aube Voyage",
      description:
        'Explore Aswan with curated luxury itineraries. Private Nile felucca charters, VIP Philae Temple tours, and luxury Old Cataract heritage stays.',
      keywords: 'Aswan luxury travel, Philae Temple private tour, Aswan Nile felucca charter, Old Cataract Hotel, Abu Simbel private flight',
    },
  },
  {
    name: 'Hurghada',
    slug: 'hurghada',
    countryCode: 'EG',
    description:
      'A premier Red Sea Riviera resort destination, Hurghada offers world-class scuba diving among pristine coral reefs, private yacht charters to Giftun Island, luxury beachfront spa resorts, and exhilarating Eastern Desert quad safaris.',
    seo: {
      title: "Exclusive Hurghada Red Sea Luxury Resorts & Yacht Charters | L'Aube Voyage",
      description:
        'Indulge in Red Sea coastal luxury in Hurghada. Private yacht charters to Orange Bay, luxury 5-star beachfront resorts, and VIP desert safaris.',
      keywords: 'Hurghada luxury resort, Red Sea yacht charter, Hurghada private diving, Giftun Island VIP, luxury Red Sea vacation',
    },
  },
  {
    name: 'Sharm El Sheikh',
    slug: 'sharm-el-sheikh',
    countryCode: 'EG',
    description:
      'Nestled at the southern tip of the Sinai Peninsula, Sharm El Sheikh is internationally renowned for the protected marine ecosystems of Ras Mohammed National Park, luxury clifftop villas, and tranquil Gulf of Aqaba diving waters.',
    seo: {
      title: "Bespoke Sharm El Sheikh Luxury Holidays & Marine Safaris | L'Aube Voyage",
      description:
        'Experience Sharm El Sheikh in refined elegance. Private Ras Mohammed marine excursions, luxury clifftop suites, and VIP Sinai Desert adventures.',
      keywords: 'Sharm El Sheikh luxury, Ras Mohammed private tour, luxury Sinai resort, Sharm El Sheikh private diving, VIP Red Sea escape',
    },
  },
  {
    name: 'Alexandria',
    slug: 'alexandria',
    countryCode: 'EG',
    description:
      'The legendary Pearl of the Mediterranean founded by Alexander the Great, Alexandria pairs Greco-Roman heritage at the Catacombs of Kom El Shoqafa with the medieval Citadel of Qaitbay and the avant-garde Bibliotheca Alexandrina.',
    seo: {
      title: "Private Alexandria Heritage Tours & Mediterranean Escapes | L'Aube Voyage",
      description:
        'Discover historic Alexandria with private guided tours. VIP visits to the Bibliotheca Alexandrina, Citadel of Qaitbay, and Mediterranean seafront dining.',
      keywords: 'Alexandria luxury tour, Bibliotheca Alexandrina private guide, Citadel of Qaitbay, Alexandria day tour, Mediterranean luxury Egypt',
    },
  },

  // ==========================================
  // France (4)
  // ==========================================
  {
    name: 'Paris',
    slug: 'paris',
    countryCode: 'FR',
    description:
      'The City of Light stands as the world capital of art, fashion, and haute cuisine, boasting iconic landmarks from the Eiffel Tower and Louvre Museum to the historic boutiques of Saint-Germain-des-Prés and the Champs-Élysées.',
    seo: {
      title: "Bespoke Paris Luxury Travel & Private Louvre Tours | L'Aube Voyage",
      description:
        'Experience Paris with bespoke VIP itineraries. Private Louvre Museum after-hours access, Seine yacht cruises, and Michelin-starred dining reservations.',
      keywords: 'Paris luxury travel, private Louvre tour, Eiffel Tower VIP, Paris palace hotels, luxury Seine cruise',
    },
  },
  {
    name: 'Nice',
    slug: 'nice',
    countryCode: 'FR',
    description:
      'Capital of the French Riviera along the Baie des Anges, Nice combines the iconic palm-lined Promenade des Anglais, colorful Belle Époque architecture in Vieux Nice, and panoramic Mediterranean coastal vistas.',
    seo: {
      title: "French Riviera Luxury Escapes & Private Nice Tours | L'Aube Voyage",
      description:
        'Indulge in French Riviera glamour in Nice. Luxury Promenade des Anglais palace hotels, private Monaco transfers, and Côte d’Azur yacht charters.',
      keywords: 'Nice luxury travel, French Riviera private tour, Promenade des Anglais hotel, Côte d’Azur yacht charter, Nice VIP travel',
    },
  },
  {
    name: 'Lyon',
    slug: 'lyon',
    countryCode: 'FR',
    description:
      'The gastronomic capital of France, Lyon enchants with UNESCO-listed Renaissance traboules in Vieux Lyon, panoramic views from the Basilica of Notre-Dame de Fourvière, and world-renowned Paul Bocuse culinary excellence.',
    seo: {
      title: "Curated Lyon Culinary Tours & Historic Heritage Stays | L'Aube Voyage",
      description:
        'Explore Lyon’s culinary and architectural heritage. Private gourmet tasting tours, UNESCO traboules exploration, and luxury boutique stays.',
      keywords: 'Lyon luxury travel, Lyon gastronomy tour, Vieux Lyon private guide, Paul Bocuse dining, Lyon luxury hotel',
    },
  },
  {
    name: 'Bordeaux',
    slug: 'bordeaux',
    countryCode: 'FR',
    description:
      'World-famous wine capital of France, Bordeaux features grand 18th-century neoclassical architecture along the Garonne River, the reflective Place de la Bourse, and premier Grand Cru wine estates in Médoc and Saint-Émilion.',
    seo: {
      title: "Private Bordeaux Wine Estate Tours & Luxury Châteaux Stays | L'Aube Voyage",
      description:
        'Discover Bordeaux with private sommelier-led itineraries. Exclusive Grand Cru château tastings, private Saint-Émilion excursions, and luxury wine resort stays.',
      keywords: 'Bordeaux luxury travel, Bordeaux private wine tour, Saint-Émilion Grand Cru tasting, luxury château stay, Place de la Bourse',
    },
  },

  // ==========================================
  // Spain (4)
  // ==========================================
  {
    name: 'Madrid',
    slug: 'madrid',
    countryCode: 'ES',
    description:
      'The royal capital of Spain, Madrid is celebrated for the monumental Royal Palace, the Golden Triangle of Art featuring the Prado and Reina Sofía museums, grand avenues along Gran Vía, and lush Retiro Park.',
    seo: {
      title: "Bespoke Madrid Luxury Holidays & Private Prado Tours | L'Aube Voyage",
      description:
        'Experience Madrid in regal comfort. Private Royal Palace and Prado Museum access, luxury Salamanca shopping tours, and Michelin-starred dining.',
      keywords: 'Madrid luxury travel, Prado Museum private tour, Royal Palace Madrid VIP, luxury Madrid hotel, Madrid private guide',
    },
  },
  {
    name: 'Barcelona',
    slug: 'barcelona',
    countryCode: 'ES',
    description:
      'Catalonia’s dynamic Mediterranean metropolis, Barcelona is world-renowned for Antoni Gaudí’s architectural marvels including the Sagrada Família and Park Güell, the historic Gothic Quarter, and premier beachfront luxury.',
    seo: {
      title: "Private Barcelona Architectural Tours & Luxury Coastal Stays | L'Aube Voyage",
      description:
        'Explore Barcelona with bespoke private tours. Skip-the-line Sagrada Família VIP access, private Gothic Quarter walks, and luxury Mediterranean yacht charters.',
      keywords: 'Barcelona luxury travel, Sagrada Família private tour, Park Güell VIP, Barcelona luxury hotel, private catamaran Barcelona',
    },
  },
  {
    name: 'Seville',
    slug: 'seville',
    countryCode: 'ES',
    description:
      'The romantic heart of Andalusia, Seville captivates with the majestic Royal Alcázar palace courtyards, the gothic Seville Cathedral and Giralda Tower, and authentic private flamenco performances in the historic Santa Cruz quarter.',
    seo: {
      title: "Curated Seville Andalusian Luxury Tours & Private Flamenco | L'Aube Voyage",
      description:
        'Discover Seville with private curated itineraries. VIP Royal Alcázar access, exclusive rooftop cathedral tours, and private flamenco salon performances.',
      keywords: 'Seville luxury travel, Royal Alcázar private tour, Seville Cathedral VIP, private flamenco Seville, luxury Andalusian palace',
    },
  },
  {
    name: 'Ibiza',
    slug: 'ibiza',
    countryCode: 'ES',
    description:
      'The crown jewel of the Balearic Islands, Ibiza seamlessly blends UNESCO-listed Dalt Vila fortress history with secluded Mediterranean turquoise coves, world-class luxury beach clubs, and private superyacht anchorages.',
    seo: {
      title: "Exclusive Ibiza Luxury Villas & Private Yacht Charters | L'Aube Voyage",
      description:
        'Experience Ibiza in ultimate privacy and sophistication. Luxury secluded villa rentals, private yacht charters to Formentera, and VIP beach club reservations.',
      keywords: 'Ibiza luxury villa, Ibiza private yacht charter, Formentera luxury cruise, Dalt Vila private tour, luxury Balearic vacation',
    },
  },

  // ==========================================
  // UAE (3)
  // ==========================================
  {
    name: 'Dubai',
    slug: 'dubai',
    countryCode: 'AE',
    description:
      'A global benchmark for ultramodern luxury and architectural ambition, Dubai features the soaring Burj Khalifa, the man-made Palm Jumeirah archipelago, world-class designer shopping, and bespoke desert conservation retreats.',
    seo: {
      title: "Ultra-Luxury Dubai Travel & Private Burj Khalifa VIP Access | L'Aube Voyage",
      description:
        'Experience Dubai with ultra-luxury bespoke itineraries. Private Burj Al Arab and Burj Khalifa suites, private yacht cruises, and luxury desert conservation safaris.',
      keywords: 'Dubai luxury travel, Burj Khalifa VIP suite, Palm Jumeirah luxury resort, Dubai private yacht charter, luxury desert safari Dubai',
    },
  },
  {
    name: 'Abu Dhabi',
    slug: 'abu-dhabi',
    countryCode: 'AE',
    description:
      'The refined capital of the UAE, Abu Dhabi showcases cultural landmarks including the architectural masterpiece Louvre Abu Dhabi, the majestic Sheikh Zayed Grand Mosque, and tranquil coastal mangroves on Saadiyat Island.',
    seo: {
      title: "Bespoke Abu Dhabi Cultural Tours & Saadiyat Luxury Stays | L'Aube Voyage",
      description:
        'Discover Abu Dhabi in bespoke luxury. Private Sheikh Zayed Grand Mosque tours, VIP Louvre Abu Dhabi access, and private Saadiyat Island beachfront resorts.',
      keywords: 'Abu Dhabi luxury travel, Louvre Abu Dhabi private tour, Sheikh Zayed Grand Mosque VIP, Saadiyat Island luxury resort, Abu Dhabi VIP travel',
    },
  },
  {
    name: 'Ras Al Khaimah',
    slug: 'ras-al-khaimah',
    countryCode: 'AE',
    description:
      'The northernmost emirate nestled between the dramatic Hajar Mountains and the Arabian Gulf, Ras Al Khaimah offers high-altitude mountain adventures on Jebel Jais, luxury beachfront retreats, and pristine terracotta desert dunes.',
    seo: {
      title: "Luxury Ras Al Khaimah Mountain Escapes & Beachfront Resorts | L'Aube Voyage",
      description:
        'Experience Ras Al Khaimah’s natural beauty and luxury. Private Jebel Jais mountain tours, 5-star beachfront spa resorts, and exclusive desert tented villas.',
      keywords: 'Ras Al Khaimah luxury resort, Jebel Jais private tour, RAK luxury desert villa, Waldorf Astoria RAK, UAE luxury nature escape',
    },
  },

  // ==========================================
  // Italy (5)
  // ==========================================
  {
    name: 'Rome',
    slug: 'rome',
    countryCode: 'IT',
    description:
      'The Eternal City presents an unparalleled open-air gallery of imperial monuments, including the Colosseum, Roman Forum, Pantheon, and Vatican City, surrounded by historic piazzas and world-class Italian culinary trattorias.',
    seo: {
      title: "Private Rome Colosseum & Vatican City Luxury Tours | L'Aube Voyage",
      description:
        'Explore Rome with private bespoke itineraries. VIP after-hours Vatican and Sistine Chapel access, private Colosseum floor tours, and luxury historic palace stays.',
      keywords: 'Rome luxury travel, Vatican private tour, Colosseum VIP tour, Sistine Chapel private access, Rome luxury hotel',
    },
  },
  {
    name: 'Venice',
    slug: 'venice',
    countryCode: 'IT',
    description:
      'A romantic floating masterpiece built upon 118 islands, Venice captivates with historic gondola voyages along the Grand Canal, St. Mark’s Basilica, the Doge’s Palace, and private palazzo suites overlooking the Venetian lagoon.',
    seo: {
      title: "Exclusive Venice Private Gondola Charters & Palazzo Stays | L'Aube Voyage",
      description:
        'Experience Venice in classical elegance. Private Grand Canal water taxi transfers, VIP Doge’s Palace tours, and exclusive historic Venetian palazzo stays.',
      keywords: 'Venice luxury travel, Grand Canal private gondola, Doge’s Palace VIP, St. Mark’s Basilica private tour, luxury Venetian hotel',
    },
  },
  {
    name: 'Florence',
    slug: 'florence',
    countryCode: 'IT',
    description:
      'The cradle of the Italian Renaissance, Florence is defined by Brunelleschi’s terracotta Duomo dome, the world-famous Uffizi and Accademia galleries, historic Ponte Vecchio jewelers, and scenic Tuscan hillside estates.',
    seo: {
      title: "Private Florence Renaissance Art Tours & Tuscan Escapes | L'Aube Voyage",
      description:
        'Discover Florence with private art historian guides. VIP Uffizi Gallery access, private Michelangelo David viewings, and luxury boutique stays.',
      keywords: 'Florence luxury travel, Uffizi Gallery private tour, Accademia Michelangelo David VIP, Florence luxury hotel, Tuscany luxury escape',
    },
  },
  {
    name: 'Milan',
    slug: 'milan',
    countryCode: 'IT',
    description:
      'Italy’s high-fashion and design capital, Milan is renowned for the white marble Duomo di Milano, the historic Galleria Vittorio Emanuele II, world-famous shopping in the Quadrilatero della Moda, and Leonardo da Vinci’s Last Supper.',
    seo: {
      title: "Bespoke Milan Fashion Itineraries & Last Supper VIP Access | L'Aube Voyage",
      description:
        'Experience Milan with curated fashion and cultural tours. Private Duomo rooftop visits, VIP Last Supper viewings, and personal luxury shopping consultants.',
      keywords: 'Milan luxury travel, Duomo di Milano VIP rooftop, Leonardo da Vinci Last Supper private, Milan personal shopper, luxury Milan hotel',
    },
  },
  {
    name: 'Amalfi Coast',
    slug: 'amalfi-coast',
    countryCode: 'IT',
    description:
      'A dramatic UNESCO coastal paradise, the Amalfi Coast features pastel-hued cliffside villages including Positano, Amalfi, and Ravello, cascading lemon groves, and private luxury yacht voyages across the Tyrrhenian Sea to Capri.',
    seo: {
      title: "Exclusive Amalfi Coast Luxury Villas & Private Yacht Cruises | L'Aube Voyage",
      description:
        'Indulge in coastal elegance along the Amalfi Coast. Private Positano cliffside villa stays, luxury Capri yacht charters, and panoramic cliffside dining.',
      keywords: 'Amalfi Coast luxury villa, Positano private tour, Capri luxury yacht charter, Ravello luxury hotel, Amalfi Coast VIP travel',
    },
  },

  // ==========================================
  // Saudi Arabia (3)
  // ==========================================
  {
    name: 'Riyadh',
    slug: 'riyadh',
    countryCode: 'SA',
    description:
      'The vibrant modern capital of Saudi Arabia, Riyadh seamlessly bridges the historic mudbrick palaces of UNESCO-listed Diriyah with soaring modern architectural landmarks like the Kingdom Centre and luxury cultural districts.',
    seo: {
      title: "Luxury Riyadh Private City Itineraries & Diriyah Tours | L'Aube Voyage",
      description:
        'Explore Riyadh with bespoke luxury itineraries. Private UNESCO Diriyah historical tours, VIP Kingdom Centre sky bridge access, and luxury 5-star stays.',
      keywords: 'Riyadh luxury travel, Diriyah private tour, Kingdom Centre VIP, Riyadh 5-star hotel, luxury Saudi Arabia travel',
    },
  },
  {
    name: 'Jeddah',
    slug: 'jeddah',
    countryCode: 'SA',
    description:
      'The ancient coastal gateway to Mecca along the Red Sea, Jeddah is celebrated for the atmospheric coral stone merchant mansions of UNESCO Al-Balad, the modern waterfront Corniche, and vibrant contemporary art scenes.',
    seo: {
      title: "Private Jeddah Al-Balad Heritage Tours & Red Sea Stays | L'Aube Voyage",
      description:
        'Discover Jeddah’s rich maritime heritage. Private guided walks through historic Al-Balad, luxury Red Sea yacht excursions, and waterfront palace stays.',
      keywords: 'Jeddah luxury travel, Al-Balad private tour, Jeddah Corniche hotel, Red Sea private boat Jeddah, luxury Saudi heritage tour',
    },
  },
  {
    name: 'AlUla',
    slug: 'alula',
    countryCode: 'SA',
    description:
      'A breathtaking living museum of ancient heritage, AlUla showcases monumental Nabataean tombs at Hegra, dramatic sandstone canyon formations including Elephant Rock, and ultra-luxury desert resort sanctuaries.',
    seo: {
      title: "Ultra-Luxury AlUla Desert Expeditions & Hegra VIP Tours | L'Aube Voyage",
      description:
        'Experience the ancient wonder of AlUla in bespoke luxury. Private Hegra archaeological expeditions, luxury desert tented villas, and stargazing safaris.',
      keywords: 'AlUla luxury resort, Hegra private tour, AlUla luxury villa, Banyan Tree AlUla, luxury Saudi desert expedition',
    },
  },

  // ==========================================
  // Turkey (3)
  // ==========================================
  {
    name: 'Istanbul',
    slug: 'istanbul',
    countryCode: 'TR',
    description:
      'A transcontinental imperial metropolis, Istanbul bridges Europe and Asia with monumental Byzantine and Ottoman landmarks including Hagia Sophia, the Blue Mosque, Topkapi Palace, and private Bosphorus yacht cruises.',
    seo: {
      title: "Private Istanbul Bosphorus Cruises & Historic Palace Tours | L'Aube Voyage",
      description:
        'Discover Istanbul with private luxury itineraries. Private Bosphorus sunset yacht cruises, VIP Hagia Sophia and Topkapi Palace access, and historic luxury stays.',
      keywords: 'Istanbul luxury travel, Bosphorus private yacht, Hagia Sophia private tour, Topkapi Palace VIP, luxury Istanbul hotel',
    },
  },
  {
    name: 'Cappadocia',
    slug: 'cappadocia',
    countryCode: 'TR',
    description:
      'A geological wonderland in central Anatolia, Cappadocia is world-famous for its dramatic fairy chimney rock formations, subterranean underground cities, sunrise hot air balloon flights, and ultra-luxury cave hotel suites.',
    seo: {
      title: "Luxury Cappadocia Hot Air Balloon Flights & Cave Suites | L'Aube Voyage",
      description:
        'Experience Cappadocia in supreme comfort. Private sunrise hot air balloon charters, luxury cave suite stays in Goreme, and private valley hiking guides.',
      keywords: 'Cappadocia luxury travel, Cappadocia private hot air balloon, luxury cave hotel, Goreme private tour, Cappadocia VIP experience',
    },
  },
  {
    name: 'Antalya',
    slug: 'antalya',
    countryCode: 'TR',
    description:
      'The capital of the Turkish Riviera, Antalya pairs the historic Roman harbor and Ottoman mansions of Kaleiçi old town with dramatic coastal cliffs, pristine Mediterranean beaches, and ancient Greco-Roman ruins in Perge and Aspendos.',
    seo: {
      title: "Exclusive Antalya Turkish Riviera Luxury Resorts & Gulet Charters | L'Aube Voyage",
      description:
        'Indulge in Mediterranean coastal luxury in Antalya. 5-star beachfront spa resorts, private wooden gulet yacht charters, and private ancient ruins tours.',
      keywords: 'Antalya luxury resort, Turkish Riviera private gulet, Kaleiçi luxury boutique, Aspendos private tour, luxury Mediterranean Turkey',
    },
  },

  // ==========================================
  // United Kingdom (2)
  // ==========================================
  {
    name: 'London',
    slug: 'london',
    countryCode: 'GB',
    description:
      'A premier global metropolis steeped in royal history, London delivers iconic landmarks from the Tower of London and Buckingham Palace to West End theatrical premieres, world-class museums, and Michelin-starred dining in Mayfair.',
    seo: {
      title: "Bespoke London Luxury Itineraries & Private Royal Palace Tours | L'Aube Voyage",
      description:
        'Experience London in refined luxury. Chauffeur-driven private tours of royal landmarks, VIP West End theatre access, and luxury Mayfair hotel stays.',
      keywords: 'London luxury travel, Tower of London private tour, Buckingham Palace VIP, London luxury hotel Mayfair, private chauffeur London',
    },
  },
  {
    name: 'Edinburgh',
    slug: 'edinburgh',
    countryCode: 'GB',
    description:
      'The historic capital of Scotland, Edinburgh enchants with the medieval cobblestones of the Royal Mile, the imposing fortress of Edinburgh Castle atop Castle Rock, the Palace of Holyroodhouse, and classical Georgian New Town.',
    seo: {
      title: "Private Edinburgh Castle Tours & Luxury Scottish Itineraries | L'Aube Voyage",
      description:
        'Explore Edinburgh with bespoke private itineraries. VIP Edinburgh Castle access, private Scotch whisky tasting masterclasses, and luxury historic boutique stays.',
      keywords: 'Edinburgh luxury travel, Edinburgh Castle private tour, Royal Mile VIP guide, luxury Scottish hotel, Edinburgh private tour',
    },
  },

  // ==========================================
  // Japan (3)
  // ==========================================
  {
    name: 'Tokyo',
    slug: 'tokyo',
    countryCode: 'JP',
    description:
      'A dynamic hyper-modern metropolis that honours centuries of heritage, Tokyo offers an electrifying mix from the ancient Senso-ji temple in Asakusa and Meiji Shrine to luxury shopping in Ginza and the world’s highest density of Michelin stars.',
    seo: {
      title: "Ultra-Luxury Tokyo Private Tours & Michelin Dining Reservations | L'Aube Voyage",
      description:
        'Experience Tokyo with bespoke luxury itineraries. Private cultural guides in Asakusa and Meiji Shrine, exclusive Ginza shopping tours, and private Michelin sushi dining.',
      keywords: 'Tokyo luxury travel, Tokyo private tour, Ginza luxury shopping, Michelin dining Tokyo, luxury Tokyo hotel',
    },
  },
  {
    name: 'Kyoto',
    slug: 'kyoto',
    countryCode: 'JP',
    description:
      'The cultural heart of Japan, Kyoto boasts over a thousand classical Buddhist temples, sacred Shinto shrines like Fushimi Inari, the serene Arashiyama bamboo forest, and traditional geisha teahouses in Gion.',
    seo: {
      title: "Bespoke Kyoto Cultural Tours & Luxury Traditional Ryokan Stays | L'Aube Voyage",
      description:
        'Discover Kyoto with private cultural master guides. Private tea ceremony experiences, exclusive Gion geisha dinners, and luxury authentic ryokan stays.',
      keywords: 'Kyoto luxury travel, Kyoto private guide, luxury ryokan Kyoto, Fushimi Inari private tour, traditional tea ceremony Kyoto',
    },
  },
  {
    name: 'Osaka',
    slug: 'osaka',
    countryCode: 'JP',
    description:
      'Known as the nation’s kitchen, Osaka is celebrated for its historic 16th-century Osaka Castle, vibrant neon-lit street food districts in Dotonbori, high-end culinary dining, and convenient gateway access to Nara and Kobe.',
    seo: {
      title: "Private Osaka Culinary Tours & Historic Castle Expeditions | L'Aube Voyage",
      description:
        'Explore Osaka with curated luxury itineraries. Private Osaka Castle tours, VIP gourmet dining experiences, and luxury high-rise hotel suites.',
      keywords: 'Osaka luxury travel, Osaka Castle private tour, Dotonbori gourmet tour, luxury Osaka hotel, Osaka private guide',
    },
  },

  // ==========================================
  // United States (3)
  // ==========================================
  {
    name: 'New York City',
    slug: 'new-york-city',
    countryCode: 'US',
    description:
      'The Big Apple stands as a premier global hub of finance, culture, and entertainment, featuring Manhattan’s iconic skyline, Broadway theater productions, Fifth Avenue designer fashion, and the tranquil oasis of Central Park.',
    seo: {
      title: "Ultra-Luxury New York City Private Tours & Broadway VIP | L'Aube Voyage",
      description:
        'Experience New York City in ultimate luxury. Private helicopter transfers, VIP Broadway house seats, private Met Museum after-hours access, and luxury 5-star suites.',
      keywords: 'New York City luxury travel, NYC private helicopter tour, Broadway VIP tickets, luxury Manhattan hotel, NYC private guide',
    },
  },
  {
    name: 'Los Angeles',
    slug: 'los-angeles',
    countryCode: 'US',
    description:
      'The entertainment capital of the world, Los Angeles pairs the glamour of Beverly Hills Rodeo Drive and Hollywood with the relaxed coastal luxury of Santa Monica Pier, Malibu beachfront private estates, and world-class contemporary art.',
    seo: {
      title: "Bespoke Los Angeles Luxury Escapes & Beverly Hills Itineraries | L'Aube Voyage",
      description:
        'Discover Los Angeles with curated private itineraries. Private Beverly Hills shopping, VIP Hollywood studio access, and luxury coastal stays in Santa Monica.',
      keywords: 'Los Angeles luxury travel, Beverly Hills private tour, Santa Monica luxury resort, Rodeo Drive personal shopper, LA luxury travel',
    },
  },
  {
    name: 'Las Vegas',
    slug: 'las-vegas',
    countryCode: 'US',
    description:
      'The world’s entertainment capital in the Nevada desert, Las Vegas delivers extraordinary spectacle along the Las Vegas Strip, world-renowned celebrity chef restaurants, legendary residency productions, and luxury private villa suites.',
    seo: {
      title: "Exclusive Las Vegas Luxury Suites & VIP Entertainment Escapes | L'Aube Voyage",
      description:
        'Experience Las Vegas with VIP bespoke luxury. Penthouse casino suites, private helicopter tours over the Strip, and VIP reservations for premier residency shows.',
      keywords: 'Las Vegas luxury travel, Las Vegas penthouse suite, Las Vegas private helicopter, VIP show tickets Las Vegas, luxury Strip hotel',
    },
  },

  // ==========================================
  // Thailand (2)
  // ==========================================
  {
    name: 'Bangkok',
    slug: 'bangkok',
    countryCode: 'TH',
    description:
      'Thailand’s captivating capital blends ornate golden royal architecture at the Grand Palace and Wat Arun on the Chao Phraya River with luxury high-rise rooftop lounges, Michelin-starred street food, and private canal longtail boat tours.',
    seo: {
      title: "Private Bangkok Cultural Tours & Chao Phraya Luxury Cruises | L'Aube Voyage",
      description:
        'Explore Bangkok in refined luxury. Private Grand Palace guided access, private Chao Phraya river cruises, and 5-star riverside luxury suites.',
      keywords: 'Bangkok luxury travel, Grand Palace private tour, Chao Phraya private cruise, luxury Bangkok hotel, Bangkok VIP tour',
    },
  },
  {
    name: 'Phuket',
    slug: 'phuket',
    countryCode: 'TH',
    description:
      'Thailand’s largest and most famous tropical island, Phuket is celebrated for the dramatic sunset panoramas of Promthep Cape, pristine private villa coves along the Andaman Sea, and private luxury catamaran voyages to the Phi Phi Islands.',
    seo: {
      title: "Exclusive Phuket Beachfront Luxury Villas & Yacht Charters | L'Aube Voyage",
      description:
        'Indulge in island serenity in Phuket. Ultra-luxury private pool villas, private yacht charters to Phi Phi and Phang Nga Bay, and world-class spa retreats.',
      keywords: 'Phuket luxury villa, Phuket private yacht charter, Phi Phi luxury catamaran, luxury resort Phuket, Andaman Sea private cruise',
    },
  },

  // ==========================================
  // Greece (2)
  // ==========================================
  {
    name: 'Athens',
    slug: 'athens',
    countryCode: 'GR',
    description:
      'The historic birthplace of democracy and philosophy, Athens is crowned by the ancient marble Parthenon atop the Acropolis, historic Plaka and Anafiotika neighborhoods, and world-class Mediterranean seafood along the Athenian Riviera.',
    seo: {
      title: "Private Athens Acropolis & Parthenon Luxury Tours | L'Aube Voyage",
      description:
        'Discover Athens with private classical archaeologist guides. VIP Acropolis and Parthenon access, luxury Plaka boutique stays, and Athenian Riviera dining.',
      keywords: 'Athens luxury travel, Acropolis private tour, Parthenon VIP access, luxury Athens hotel, Athens private guide',
    },
  },
  {
    name: 'Santorini',
    slug: 'santorini',
    countryCode: 'GR',
    description:
      'The iconic crown of the Cyclades islands, Santorini is world-famous for its cliffside whitewashed architecture and blue domes in Oia and Fira, world-renowned caldera sunset panoramas, volcanic vineyards, and private luxury catamaran charters.',
    seo: {
      title: "Exclusive Santorini Caldera Luxury Villas & Private Catamaran Charters | L'Aube Voyage",
      description:
        'Experience Santorini in supreme romantic luxury. Cliffside private plunge-pool cave villas in Oia, private Aegean sunset catamaran charters, and volcanic wine tastings.',
      keywords: 'Santorini luxury villa, Oia private cave suite, Santorini private catamaran charter, luxury caldera hotel, Santorini VIP escape',
    },
  },
]

export interface SeededCitiesResult {
  cityDocsMap: Record<string, any>
  totalProcessed: number
  totalCreated: number
  totalUpdated: number
  heroLinkedCount: number
  countryLinkedCount: number
}

/**
 * Master Enterprise Cities Seeder.
 * Deterministically creates/reconciles the 40 canonical cities with country relations and linked Hero Media.
 */
export async function seedCities(
  payload: Payload,
  countryDocsMap: Record<string, any>,
  mediaAssetMap: Record<string, number>,
): Promise<SeededCitiesResult> {
  console.log('🏙️ [Seed] Seeding Authoritative Cities Catalog (40 Canonical Destinations)...')

  const cityDocsMap: Record<string, any> = {}
  let totalCreated = 0
  let totalUpdated = 0
  let heroLinkedCount = 0
  let countryLinkedCount = 0

  for (const city of CANONICAL_CITIES) {
    const parentCountryDoc = countryDocsMap[city.countryCode] || countryDocsMap[city.countryCode.toLowerCase()]

    if (!parentCountryDoc || !parentCountryDoc.id) {
      throw new Error(`Country document not found for countryCode: ${city.countryCode} while seeding city: ${city.slug}`)
    }

    const assetKey = `city-hero-${city.slug}`
    const heroMediaId = mediaAssetMap[assetKey]

    if (!heroMediaId) {
      console.warn(`   ⚠️ Warning: No Hero Media ID found in assetMap for assetKey: ${assetKey}`)
    }

    const cityPayloadData: any = {
      name: city.name,
      slug: city.slug,
      country: parentCountryDoc.id,
      isActive: true,
      description: toLexical(city.description),
      seo: city.seo,
    }

    if (heroMediaId) {
      cityPayloadData.hero = heroMediaId
    }

    // 1. Look up existing city by unique canonical slug
    const existing = await payload.find({
      collection: 'cities',
      where: {
        slug: { equals: city.slug },
      },
      limit: 1,
    })

    let cityDoc: any = null

    if (existing.docs.length > 0) {
      const existingId = existing.docs[0].id
      cityDoc = await payload.update({
        collection: 'cities',
        id: existingId,
        data: cityPayloadData,
      })
      totalUpdated++
    } else {
      cityDoc = await payload.create({
        collection: 'cities',
        data: cityPayloadData,
      })
      totalCreated++
    }

    if (cityDoc.hero) heroLinkedCount++
    if (cityDoc.country) countryLinkedCount++

    cityDocsMap[city.slug] = cityDoc
  }

  console.log(
    `   ✅ Cities Catalog Processed: ${Object.keys(cityDocsMap).length}/40 cities (${totalCreated} created, ${totalUpdated} updated, ${heroLinkedCount} Hero Media verified, ${countryLinkedCount} Country relationships verified).`,
  )

  return {
    cityDocsMap,
    totalProcessed: 40,
    totalCreated,
    totalUpdated,
    heroLinkedCount,
    countryLinkedCount,
  }
}
