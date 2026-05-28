import { Bank } from '../types';
import { db } from '../config/db';

export const DEFAULT_BANK_ICON = '/logos/bank-icon.svg';

export const BANKS: Bank[] = [
  {
    id: 'tbank',
    name: 'Т-Банк',
    color: '#FFDD2D',
    logoText: 'Т',
    logoUrl: '/logos/tbank.svg',
    iconScale: 1,
    iconOffsetX: 0,
    iconOffsetY: 0,
  },
  {
    id: 'sber',
    name: 'Сбербанк',
    color: '#21A038',
    logoText: 'С',
    logoUrl: '/logos/sber.svg',
    iconScale: 1,
    iconOffsetX: 0,
    iconOffsetY: 0,
  },
  {
    id: 'alfa',
    name: 'Альфа-Банк',
    color: '#EF3124',
    logoText: 'А',
    logoUrl: '/logos/alfa.svg',
    iconScale: 1,
    iconOffsetX: 0,
    iconOffsetY: 0,
  },
  {
    id: 'vtb',
    name: 'ВТБ',
    color: '#0A2896',
    logoText: 'В',
    logoUrl: '/logos/vtb.svg',
    iconScale: 1,
    iconOffsetX: 0,
    iconOffsetY: 0,
  },
  {
    id: 'raif',
    name: 'Райффайзен',
    color: '#FEE600',
    logoText: 'Р',
    logoUrl: '/logos/raiff.svg',
    iconScale: 1,
    iconOffsetX: 0,
    iconOffsetY: 0,
  },
  {
    id: 'gazprom',
    name: 'Газпромбанк',
    color: '#476BF0',
    logoText: 'Г',
    logoUrl: '/logos/gazprom.svg',
    iconScale: 1,
    iconOffsetX: 0,
    iconOffsetY: 0,
  },
  {
    id: 'ozon',
    name: 'Ozon Банк',
    color: '#005BFF',
    logoText: 'O',
    logoUrl: '/logos/ozon.svg',
    iconScale: 1,
    iconOffsetX: 0,
    iconOffsetY: 0,
  },
  {
    id: 'yandex',
    name: 'Яндекс Банк',
    color: '#FFCC00',
    logoText: 'Я',
    logoUrl: '/logos/yandex.svg',
    iconScale: 1,
    iconOffsetX: 0,
    iconOffsetY: 0,
  },
  {
    id: 'uralsib',
    name: 'Уралсиб',
    color: '#3B175C',
    logoText: 'У',
    logoUrl: '/logos/uralsib.svg',
    iconScale: 1,
    iconOffsetX: 0,
    iconOffsetY: 0,
  },
  {
    id: 'psb',
    name: 'ПСБ',
    color: '#2C2D84',
    logoText: 'П',
    logoUrl: '/logos/psb.svg',
    iconScale: 1,
    iconOffsetX: 0,
    iconOffsetY: 0,
  },
  {
    id: 'rshb',
    name: 'РСХБ',
    color: '#42AB44',
    logoText: 'РС',
    logoUrl: '/logos/rshb.svg',
    iconScale: 1,
    iconOffsetX: 0,
    iconOffsetY: 0,
  },
  {
    id: 'mkb',
    name: 'МКБ',
    color: '#DD0A34',
    logoText: 'М',
    logoUrl: '/logos/mkb.svg',
    iconScale: 1,
    iconOffsetX: 0,
    iconOffsetY: 0,
  },
  {
    id: 'sovcom',
    name: 'Совкомбанк',
    color: '#003791',
    logoText: 'СВ',
    logoUrl: '/logos/sovcom.svg',
    iconScale: 1,
    iconOffsetX: 0,
    iconOffsetY: 0,
  },
  {
    id: 'mts',
    name: 'МТС Банк',
    color: '#E30600',
    logoText: 'МТ',
    logoUrl: '/logos/mts.svg',
    iconScale: 1,
    iconOffsetX: 0,
    iconOffsetY: 0,
  },
  {
    id: 'rnkb',
    name: 'РНКБ',
    color: '#00B2C3',
    logoText: 'РН',
    logoUrl: '/logos/rnkb.svg',
    iconScale: 1,
    iconOffsetX: 0,
    iconOffsetY: 0,
  },
  {
    id: 'domrf',
    name: 'Банк ДОМ.РФ',
    color: '#99C45A',
    logoText: 'Д',
    logoUrl: '/logos/domrf.svg',
    iconScale: 1,
    iconOffsetX: 0,
    iconOffsetY: 0,
  },
  {
    id: 'ubrir',
    name: 'УБРиР',
    color: '#CC163F',
    logoText: 'УБ',
    logoUrl: '/logos/ubrir.svg',
    iconScale: 1,
    iconOffsetX: 0,
    iconOffsetY: 0,
  },
  {
    id: 'rencredit',
    name: 'Ренессанс',
    color: '#E3448A',
    logoText: 'РК',
    logoUrl: '/logos/renaissance.svg',
    iconScale: 1,
    iconOffsetX: 0,
    iconOffsetY: 0,
  },
  {
    id: 'otp',
    name: 'ОТП Банк',
    color: '#CDFB68',
    logoText: 'ОТ',
    logoUrl: '/logos/otp.svg',
    iconScale: 1,
    iconOffsetX: 0,
    iconOffsetY: 0,
  },
  {
    id: 'avangard',
    name: 'Авангард',
    color: '#003E22',
    logoText: 'АВ',
    logoUrl: '/logos/avangard.svg',
    iconScale: 1,
    iconOffsetX: 0,
    iconOffsetY: 0,
  },
  {
    id: 'bspb',
    name: 'БСПБ',
    color: '#F10D30',
    logoText: 'БС',
    logoUrl: '/logos/bsaintpet.svg',
    iconScale: 1,
    iconOffsetX: 0,
    iconOffsetY: 0,
  },
];

export const getAllBanks = async (): Promise<Bank[]> => {
  const customBanks = await db.banks.toArray();
  // Also update our RAM cache
  cachedCustomBanks = customBanks;
  return [...BANKS, ...customBanks];
};

let cachedCustomBanks: Bank[] = [];

export const syncCustomBanksCache = async () => {
  try {
    const custom = await db.banks.toArray();
    cachedCustomBanks = custom;
  } catch (e) {
    console.error('Error syncing custom banks cache:', e);
  }
};

// Initial trigger
syncCustomBanksCache();

export const getBankDetails = (
  bankId: string,
  allBanks: Bank[] = [...BANKS, ...cachedCustomBanks],
): Bank => {
  const bank = allBanks.find((b) => b.id === bankId || b.name === bankId);
  if (bank) return bank;

  return {
    id: 'custom',
    name: bankId || 'Банк',
    color: '#64748b', // slate-500
    logoText: (bankId || 'Б').charAt(0).toUpperCase(),
    logoUrl: '',
    iconScale: 1,
    iconOffsetX: 0,
    iconOffsetY: 0,
  };
};
