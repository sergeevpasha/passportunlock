// Passport covers adapted from Wikimedia Commons works whose licences require credit. About → Credits lists them.
export const coverLicenses = {
  'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
  'CC BY-SA 3.0': 'https://creativecommons.org/licenses/by-sa/3.0/',
  'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'CC BY 3.0': 'https://creativecommons.org/licenses/by/3.0/',
  'CC BY 3.0 AU': 'https://creativecommons.org/licenses/by/3.0/au/',
} as const;

export interface CoverCredit {
  title: string;
  author: string;
  url: string;
  license: keyof typeof coverLicenses;
}

export const coverCredits: Record<string, CoverCredit> = {
  AD: {
    title: 'Passaport andorrà',
    author: 'Boigandorra',
    url: 'https://commons.wikimedia.org/wiki/File:Passaport_andorr%C3%A0.jpg',
    license: 'CC BY-SA 4.0',
  },
  AR: {
    title: 'Argentine-passport-ecover-front',
    author: 'Argentine government',
    url: 'https://commons.wikimedia.org/wiki/File:Argentine-passport-ecover-front.jpg',
    license: 'CC BY 4.0',
  },
  AU: {
    title: 'R-series-cover-front',
    author: 'Australian Government - Australian Passport Office',
    url: 'https://commons.wikimedia.org/wiki/File:R-series-cover-front.jpg',
    license: 'CC BY 3.0 AU',
  },
  BD: {
    title: 'Bangladeshi E-Passport',
    author: 'Xi Knight and Dr. Editorial',
    url: 'https://commons.wikimedia.org/wiki/File:Bangladeshi_E-Passport.svg',
    license: 'CC BY-SA 3.0',
  },
  BI: {
    title: 'Паспорт Бурунди',
    author: 'Chetoc',
    url: 'https://commons.wikimedia.org/wiki/File:%D0%9F%D0%B0%D1%81%D0%BF%D0%BE%D1%80%D1%82_%D0%91%D1%83%D1%80%D1%83%D0%BD%D0%B4%D0%B8.png',
    license: 'CC BY-SA 4.0',
  },
  BR: {
    title: 'Novo Passaporte Brasileiro',
    author: 'Casa da Moeda do Brasil',
    url: 'https://commons.wikimedia.org/wiki/File:Novo_Passaporte_Brasileiro.png',
    license: 'CC BY-SA 4.0',
  },
  CI: {
    title: 'Passeport Ivoirien',
    author: 'Soren17',
    url: 'https://commons.wikimedia.org/wiki/File:Passeport_Ivoirien.png',
    license: 'CC BY-SA 4.0',
  },
  CZ: {
    title: 'Passport of the Czech Republic',
    author: 'Martin Cvrgy',
    url: 'https://commons.wikimedia.org/wiki/File:Passport_of_the_Czech_Republic.jpg',
    license: 'CC BY-SA 4.0',
  },
  DJ: {
    title: 'New Djiboutian Passport 2022',
    author: 'Skilla1st',
    url: 'https://commons.wikimedia.org/wiki/File:New_Djiboutian_Passport_2022.png',
    license: 'CC BY-SA 4.0',
  },
  EC: {
    title: 'Pasaporte Ecuatoriano',
    author: 'Fabrizzio Cedeño',
    url: 'https://commons.wikimedia.org/wiki/File:Pasaporte_Ecuatoriano.png',
    license: 'CC BY-SA 4.0',
  },
  ER: {
    title: 'Cover of Eritrean Passport',
    author: 'Noble',
    url: 'https://commons.wikimedia.org/wiki/File:Cover_of_Eritrean_Passport.jpeg',
    license: 'CC BY-SA 3.0',
  },
  GA: {
    title: 'Cover of Gabonese passport',
    author: 'Wikola',
    url: 'https://commons.wikimedia.org/wiki/File:Cover_of_Gabonese_passport.jpg',
    license: 'CC BY-SA 4.0',
  },
  GB: {
    title: 'British Passport December 2025',
    author: 'Thepekinite',
    url: 'https://commons.wikimedia.org/wiki/File:British_Passport_December_2025.svg',
    license: 'CC BY 4.0',
  },
  HN: {
    title: 'Honduran Passport Front Cover 2022',
    author: 'Ernestosierra04',
    url: 'https://commons.wikimedia.org/wiki/File:Honduran_Passport_Front_Cover_2022.jpg',
    license: 'CC BY-SA 4.0',
  },
  IL: {
    title: 'Israeli Passport',
    author: 'Swapnil1101',
    url: 'https://commons.wikimedia.org/wiki/File:Israeli_Passport.svg',
    license: 'CC BY-SA 4.0',
  },
  IN: {
    title: 'Indian Passport (e-Passport, 2024)',
    author: 'FireDragonValo',
    url: 'https://commons.wikimedia.org/wiki/File:Indian_Passport_(e-Passport,_2024).svg',
    license: 'CC BY-SA 4.0',
  },
  IQ: {
    title: 'IraqiPassport23',
    author: 'Fareeq Almayoofee',
    url: 'https://commons.wikimedia.org/wiki/File:IraqiPassport23.png',
    license: 'CC BY-SA 4.0',
  },
  IR: {
    title: 'Iranian Biometric Passport Cover',
    author: 'Behniar',
    url: 'https://commons.wikimedia.org/wiki/File:Iranian_Biometric_Passport_Cover.jpg',
    license: 'CC BY-SA 3.0',
  },
  IT: {
    title: 'Italian biometric passport',
    author: 'Alblefter and Fred the Oyster',
    url: 'https://commons.wikimedia.org/wiki/File:Passaportoitaliano2006.jpg',
    license: 'CC BY 3.0',
  },
  KG: {
    title: 'Kyrgyz Passport',
    author: 'มองโกเลีย๔๔',
    url: 'https://commons.wikimedia.org/wiki/File:Kyrgyz_Passport.svg',
    license: 'CC BY-SA 4.0',
  },
  KH: {
    title: "Cambodia's Biometric Passport",
    author: 'GJX1123',
    url: 'https://commons.wikimedia.org/wiki/File:Cambodia%27s_Biometric_Passport.png',
    license: 'CC BY-SA 4.0',
  },
  LA: {
    title: 'Laos Passport',
    author: 'มองโกเลีย๔๔',
    url: 'https://commons.wikimedia.org/wiki/File:Laos_Passport.svg',
    license: 'CC BY-SA 4.0',
  },
  LU: {
    title: 'Luxembourg_Passport',
    author: 'Jonas Magnus Lystad',
    url: 'https://commons.wikimedia.org/wiki/File:Luxembourg_Passport.svg',
    license: 'CC BY-SA 4.0',
  },
  MM: {
    title: 'Cover of Burmese Passport',
    author: 'Noble',
    url: 'https://commons.wikimedia.org/wiki/File:Cover_of_Burmese_Passport.jpg',
    license: 'CC BY-SA 3.0',
  },
  MN: {
    title: 'Mongolia Passport 2023',
    author: 'Chinneeb',
    url: 'https://commons.wikimedia.org/wiki/File:Mongolia_Passport_2023.svg',
    license: 'CC BY 4.0',
  },
  MR: {
    title: 'Cover of Mauritanian Biometric Passport',
    author: 'Noble',
    url: 'https://commons.wikimedia.org/wiki/File:Cover_of_Mauritanian_Biometric_Passport.png',
    license: 'CC BY-SA 3.0',
  },
  MY: {
    title: 'Malaysia Passport',
    author: 'มองโกเลีย๔๔',
    url: 'https://commons.wikimedia.org/wiki/File:Malaysia_Passport.svg',
    license: 'CC BY-SA 4.0',
  },
  MZ: {
    title: 'Cover of Mozambican Passport',
    author: 'Noble',
    url: 'https://commons.wikimedia.org/wiki/File:Cover_of_Mozambican_Passport.jpg',
    license: 'CC BY-SA 3.0',
  },
  NA: {
    title: 'Biometric Namibian Passport',
    author: 'Wells1991',
    url: 'https://commons.wikimedia.org/wiki/File:Biometric_Namibian_Passport.jpg',
    license: 'CC BY-SA 4.0',
  },
  NG: {
    title: 'Nigerian Enhanced ePassport',
    author: 'Peters Temiloluwa',
    url: 'https://commons.wikimedia.org/wiki/File:Nigerian_Enhanced_ePassport.webp',
    license: 'CC BY-SA 4.0',
  },
  NL: {
    title: 'Nederlanden paspoort 2011',
    author: 'Blagomeni',
    url: 'https://commons.wikimedia.org/wiki/File:Nederlanden_paspoort_2011.jpg',
    license: 'CC BY-SA 3.0',
  },
  NP: {
    title: 'NepaliEpassportcover',
    author: 'Kinsu08',
    url: 'https://commons.wikimedia.org/wiki/File:NepaliEpassportcover.jpg',
    license: 'CC BY-SA 4.0',
  },
  PL: {
    title: 'Polska ePaszport 2019',
    author: 'Gnesener1900',
    url: 'https://commons.wikimedia.org/wiki/File:Polska_ePaszport_2019.jpg',
    license: 'CC BY-SA 4.0',
  },
  PT: {
    title: 'Passaporte Português',
    author: 'Drd97',
    url: 'https://commons.wikimedia.org/wiki/File:Passaporte_Portugu%C3%AAs_.jpg',
    license: 'CC BY-SA 4.0',
  },
  RW: {
    title: 'Rwandan Passport',
    author: 'Moise Segikwiye',
    url: 'https://commons.wikimedia.org/wiki/File:Rwandan_Passport.webp',
    license: 'CC BY-SA 4.0',
  },
  SC: {
    title: 'Edisontd 2022 Passport Cover of Seychelles',
    author: 'The National Police of the Netherlands',
    url: 'https://commons.wikimedia.org/wiki/File:Edisontd_2022_Passport_Cover_of_Seychelles.jpg',
    license: 'CC BY 4.0',
  },
  SK: {
    title: 'Slovak passport biometric',
    author: 'Julianaldn1',
    url: 'https://commons.wikimedia.org/wiki/File:Slovak_passport_biometric.jpg',
    license: 'CC BY-SA 4.0',
  },
  SM: {
    title: 'Captura de Pantalla 2022-03-27 a la(s) 12.56.29',
    author: 'AndresvaAeditarUwU',
    url: 'https://commons.wikimedia.org/wiki/File:Captura_de_Pantalla_2022-03-27_a_la(s)_12.56.29.png',
    license: 'CC BY-SA 4.0',
  },
  SN: {
    title: 'Senegalese Passport 2025',
    author: 'Benj90',
    url: 'https://commons.wikimedia.org/wiki/File:Senegalese_Passport_2025.jpg',
    license: 'CC BY-SA 3.0',
  },
  SZ: {
    title: 'Cover of Swazi Passport',
    author: 'Noble',
    url: 'https://commons.wikimedia.org/wiki/File:Cover_of_Swazi_Passport.jpg',
    license: 'CC BY-SA 3.0',
  },
  TG: {
    title: 'Togo passport',
    author: 'Stratforder',
    url: 'https://commons.wikimedia.org/wiki/File:Togo_passport.png',
    license: 'CC BY-SA 3.0',
  },
  TH: {
    title: 'Thai Passport V.3 (2020-2021)',
    author: 'มองโกเลีย๔๔',
    url: 'https://commons.wikimedia.org/wiki/File:Thai_Passport_V.3_(2020-2021).svg',
    license: 'CC BY-SA 4.0',
  },
  TJ: {
    title: 'P TJK NEW',
    author: 'Ejence',
    url: 'https://commons.wikimedia.org/wiki/File:P_TJK_NEW.jpg',
    license: 'CC BY-SA 3.0',
  },
  TL: {
    title: 'East Timorese Electronic Passport',
    author: 'Kelsey Veira',
    url: 'https://commons.wikimedia.org/wiki/File:East_Timorese_Electronic_Passport.jpg',
    license: 'CC BY-SA 4.0',
  },
  TN: {
    title: 'Passeport Tunisie 2014',
    author: 'Mohatatou',
    url: 'https://commons.wikimedia.org/wiki/File:Passeport_Tunisie_2014.jpg',
    license: 'CC BY-SA 4.0',
  },
  TR: {
    title: 'Turkish Passport',
    author: 'Swapnil1101',
    url: 'https://commons.wikimedia.org/wiki/File:Turkish_Passport.svg',
    license: 'CC BY-SA 4.0',
  },
  TV: {
    title: 'Cover of Tuvaluan Passport',
    author: 'Noble',
    url: 'https://commons.wikimedia.org/wiki/File:Cover_of_Tuvaluan_Passport.jpg',
    license: 'CC BY-SA 3.0',
  },
  TZ: {
    title: 'Tanzania e Passport',
    author: 'Zachariahct',
    url: 'https://commons.wikimedia.org/wiki/File:Tanzania_e_Passport.jpg',
    license: 'CC BY-SA 4.0',
  },
  VC: {
    title: 'SVG passport cover',
    author: 'Hairouna',
    url: 'https://commons.wikimedia.org/wiki/File:Saint_Vincent_and_the_Grenadines_passport_cover.png',
    license: 'CC BY-SA 4.0',
  },
  VU: {
    title: 'Vanuatu passport 2020',
    author: 'Alphacenturia123',
    url: 'https://commons.wikimedia.org/wiki/File:Vanuatu_passport_2020.jpg',
    license: 'CC BY-SA 4.0',
  },
  YE: {
    title: 'Yemen Passport',
    author: 'มองโกเลีย๔๔',
    url: 'https://commons.wikimedia.org/wiki/File:Yemen_Passport.svg',
    license: 'CC BY 4.0',
  },
};
