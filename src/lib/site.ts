/** Site-wide facts. Change here, not in components. */
export const site = {
  name: 'Kosibah',
  tagline: 'Couture bridal · London 1991 · Brooklyn',
  designer: 'Yemi Osunkoya',
  instagram: '@yemikosibah',
  instagramUrl: 'https://www.instagram.com/yemikosibah/',
  tiktokUrl: 'https://www.tiktok.com/@yemikosibah',
  pinterestUrl: 'https://www.pinterest.com/kosibah/',
  phone: '+1 914 359 7757',
  phoneHref: 'tel:+19143597757',
  email: 'appointments@kosibah.com',
  address: { line1: '515 Manhattan Ave', line2: 'New York, NY 10027' },
  hours: 'Monday to Friday, 9 to 6 Eastern',
  /** Placeholder until Yemi confirms. Shown as-is on Atelier and gown pages. */
  leadTime: '[LEAD TIME]',
  press: ['Vogue', 'CFDA', 'World Bride'],
} as const;

export const nav = [
  { href: '/atelier', label: 'The Atelier' },
  { href: '/gowns', label: 'Gowns' },
  { href: '/real-brides', label: 'Real Brides' },
  { href: '/yemi', label: 'Yemi' },
] as const;
