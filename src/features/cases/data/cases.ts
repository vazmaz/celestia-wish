import type {
  BannerCategoryId,
  CaseDef,
  CaseItem,
  Rarity,
} from '../../../shared/types'

export const BANNER_ART: Record<
  BannerCategoryId,
  { cover: string; icon: (rarity: Rarity) => string }
> = {
  elements: {
    cover: '/cases/case-elements.png',
    icon: (r) => `/items/item-elements-${r}.png`,
  },
  swords: {
    cover: '/cases/case-swords.png',
    icon: (r) => `/items/item-swords-${r}.png`,
  },
  characters: {
    cover: '/cases/case-characters.png',
    icon: (r) => `/items/item-characters-${r}.png`,
  },
  shields: {
    cover: '/cases/case-shields.png',
    icon: (r) => `/items/item-shields-${r}.png`,
  },
  equipment: {
    cover: '/cases/case-equipment.png',
    icon: (r) => `/items/item-equipment-${r}.png`,
  },
  pets: {
    cover: '/cases/case-pets.png',
    icon: (r) => `/items/item-pets-${r}.png`,
  },
}

/** Unique Genshin-style skin per catalog item. */
function skin(itemId: string): string {
  return `/items/skin-${itemId}.png`
}

type ItemInput = Omit<CaseItem, 'image'> & { image?: string }

function banner(
  def: Omit<CaseDef, 'image' | 'items' | 'category'> & {
    category: BannerCategoryId
    items: ItemInput[]
  },
): CaseDef {
  const art = BANNER_ART[def.category]
  return {
    ...def,
    image: art.cover,
    items: def.items.map((item) => ({
      ...item,
      image: item.image ?? skin(item.id),
    })),
  }
}

/**
 * Category banners — Elements, Swords, Characters, Shields, Equipment, Pets.
 * Each drop has a unique thematic skin; higher rarity art is richer.
 *
 * Chances sum to 100 and are tuned so a full sell-back returns ~50% of the
 * case price. Item values are fixed; only drop weights move.
 */
export const CASES: CaseDef[] = [
  banner({
    id: 'elements',
    name: 'Элементы',
    description: 'Орбы стихий: от тусклых искр до сияющих ядер архонтов.',
    price: 160,
    category: 'elements',
    theme: 'linear-gradient(145deg, #071828 0%, #1a4a6e 48%, #5ec8ff 100%)',
    items: [
      { id: 'el-1', name: 'Искра Анемо', rarity: 'common', chance: 34.33, value: 20, accent: '#7a9e96' },
      { id: 'el-2', name: 'Уголь Пиро', rarity: 'common', chance: 24.94, value: 26, accent: '#a87868' },
      { id: 'el-3', name: 'Капля Гидро', rarity: 'common', chance: 18.7, value: 32, accent: '#6a8aa0' },
      { id: 'el-4', name: 'Осколок Электро', rarity: 'uncommon', chance: 5.73, value: 70, accent: '#3ecf9a' },
      { id: 'el-5', name: 'Кристалл Крио', rarity: 'uncommon', chance: 4.41, value: 88, accent: '#45d9a8' },
      { id: 'el-6', name: 'Семя Дендро', rarity: 'rare', chance: 4.41, value: 180, accent: '#4db8ff' },
      { id: 'el-7', name: 'Призма Гео', rarity: 'rare', chance: 3.07, value: 240, accent: '#5ac4ff' },
      { id: 'el-8', name: 'Ядро Резонанса', rarity: 'epic', chance: 2.42, value: 520, accent: '#b48cff' },
      { id: 'el-9', name: 'Вижн Семи Стихий', rarity: 'epic', chance: 1.33, value: 680, accent: '#c9a0ff' },
      { id: 'el-10', name: 'Сердце Небес', rarity: 'legendary', chance: 0.66, value: 2400, accent: '#f0d078' },
    ],
  }),
  banner({
    id: 'swords',
    name: 'Мечи',
    description: 'Клинки Тейвата: от ржавых копий до легендарных незеритовых клинков.',
    price: 200,
    category: 'swords',
    theme: 'linear-gradient(145deg, #141820 0%, #3a4558 48%, #9eb6d4 100%)',
    items: [
      { id: 'sw-1', name: 'Тупой Клинок', rarity: 'common', chance: 33.95, value: 24, accent: '#8a9098' },
      { id: 'sw-2', name: 'Страннический Меч', rarity: 'common', chance: 25.89, value: 30, accent: '#9a9ea8' },
      { id: 'sw-3', name: 'Стальной Рапир', rarity: 'common', chance: 17.8, value: 38, accent: '#a8b0bc' },
      { id: 'sw-4', name: 'Клинок Ветра', rarity: 'uncommon', chance: 5.58, value: 85, accent: '#3ecf9a' },
      { id: 'sw-5', name: 'Пламенный Тесак', rarity: 'uncommon', chance: 4.75, value: 100, accent: '#45d9a8' },
      { id: 'sw-6', name: 'Лунная Катана', rarity: 'rare', chance: 4.3, value: 220, accent: '#4db8ff' },
      { id: 'sw-7', name: 'Грозовой Фальшион', rarity: 'rare', chance: 3.01, value: 280, accent: '#5ac4ff' },
      { id: 'sw-8', name: 'Клинок Вечности', rarity: 'epic', chance: 2.36, value: 600, accent: '#b48cff' },
      { id: 'sw-9', name: 'Песнь Небес', rarity: 'epic', chance: 1.5, value: 780, accent: '#c9a0ff' },
      { id: 'sw-10', name: 'Мусо но Хитотачи', rarity: 'legendary', chance: 0.86, value: 2800, accent: '#f0d078' },
    ],
  }),
  banner({
    id: 'characters',
    name: 'Персонажи',
    description: 'Карты героев: от юных искателей до легенд Тейвата.',
    price: 190,
    category: 'characters',
    theme: 'linear-gradient(145deg, #1a1020 0%, #5a2a4a 50%, #f0b4d4 100%)',
    items: [
      { id: 'ch-1', name: 'Новичок Путешественник', rarity: 'common', chance: 35.3, value: 22, accent: '#a09098' },
      { id: 'ch-2', name: 'Разведчик Гильдии', rarity: 'common', chance: 24.06, value: 28, accent: '#b0a0a8' },
      { id: 'ch-3', name: 'Ученик Академии', rarity: 'common', chance: 17.65, value: 34, accent: '#c0b0b8' },
      { id: 'ch-4', name: 'Рыцарь Фавония', rarity: 'uncommon', chance: 5.75, value: 78, accent: '#3ecf9a' },
      { id: 'ch-5', name: 'Жрица Святилища', rarity: 'uncommon', chance: 4.42, value: 95, accent: '#45d9a8' },
      { id: 'ch-6', name: 'Капитан Флота', rarity: 'rare', chance: 4.42, value: 200, accent: '#4db8ff' },
      { id: 'ch-7', name: 'Теневой Охотник', rarity: 'rare', chance: 3.5, value: 260, accent: '#5ac4ff' },
      { id: 'ch-8', name: 'Архимаг Сумеру', rarity: 'epic', chance: 2.47, value: 560, accent: '#b48cff' },
      { id: 'ch-9', name: 'Генерал Инадзумы', rarity: 'epic', chance: 1.55, value: 720, accent: '#c9a0ff' },
      { id: 'ch-10', name: 'Архонт Семи Престолов', rarity: 'legendary', chance: 0.88, value: 2600, accent: '#f0d078' },
    ],
  }),
  banner({
    id: 'shields',
    name: 'Щиты',
    description: 'Защита и эгиды: от деревянных блях до божественных барьеров.',
    price: 220,
    category: 'shields',
    theme: 'linear-gradient(145deg, #0c1a18 0%, #1a5c48 48%, #7ec8a8 100%)',
    items: [
      { id: 'sh-1', name: 'Деревянный Баклер', rarity: 'common', chance: 36.52, value: 28, accent: '#7a8a80' },
      { id: 'sh-2', name: 'Кожаный Оплот', rarity: 'common', chance: 27.18, value: 35, accent: '#8a9a90' },
      { id: 'sh-3', name: 'Железная Круглая', rarity: 'common', chance: 19.94, value: 42, accent: '#9aa8a0' },
      { id: 'sh-4', name: 'Щит Ветров', rarity: 'uncommon', chance: 3.7, value: 100, accent: '#3ecf9a' },
      { id: 'sh-5', name: 'Ледяная Стена', rarity: 'uncommon', chance: 3.09, value: 125, accent: '#45d9a8' },
      { id: 'sh-6', name: 'Громовой Бастион', rarity: 'rare', chance: 3, value: 260, accent: '#4db8ff' },
      { id: 'sh-7', name: 'Щит Глубин', rarity: 'rare', chance: 2.47, value: 320, accent: '#5ac4ff' },
      { id: 'sh-8', name: 'Эгида Вечности', rarity: 'epic', chance: 1.85, value: 700, accent: '#b48cff' },
      { id: 'sh-9', name: 'Барьер Архонта', rarity: 'epic', chance: 1.32, value: 900, accent: '#c9a0ff' },
      { id: 'sh-10', name: 'Небесный Оплот', rarity: 'legendary', chance: 0.62, value: 3200, accent: '#f0d078' },
      { id: 'sh-11', name: 'Щит Селестии', rarity: 'legendary', chance: 0.31, value: 4500, accent: '#ffe08a' },
    ],
  }),
  banner({
    id: 'equipment',
    name: 'Экипировка',
    description: 'Доспехи и реликвии: от походных сапог до комплектов 5★.',
    price: 180,
    category: 'equipment',
    theme: 'linear-gradient(145deg, #1a1410 0%, #5a4030 50%, #d0a878 100%)',
    items: [
      { id: 'eq-1', name: 'Походные Сапоги', rarity: 'common', chance: 36.95, value: 20, accent: '#8a8070' },
      { id: 'eq-2', name: 'Кожаные Перчатки', rarity: 'common', chance: 24.11, value: 26, accent: '#9a9080' },
      { id: 'eq-3', name: 'Плащ Путника', rarity: 'common', chance: 16.06, value: 34, accent: '#aaa090' },
      { id: 'eq-4', name: 'Кольчуга Рыцаря', rarity: 'uncommon', chance: 5.72, value: 75, accent: '#3ecf9a' },
      { id: 'eq-5', name: 'Пояс Искателя', rarity: 'uncommon', chance: 4.83, value: 92, accent: '#45d9a8' },
      { id: 'eq-6', name: 'Тиара Луны', rarity: 'rare', chance: 4.41, value: 195, accent: '#4db8ff' },
      { id: 'eq-7', name: 'Наплечники Бури', rarity: 'rare', chance: 3.08, value: 250, accent: '#5ac4ff' },
      { id: 'eq-8', name: 'Комплект Глубоколесья', rarity: 'epic', chance: 2.42, value: 540, accent: '#b48cff' },
      { id: 'eq-9', name: 'Доспех Феникса', rarity: 'epic', chance: 1.54, value: 700, accent: '#c9a0ff' },
      { id: 'eq-10', name: 'Реликвия Архонта', rarity: 'legendary', chance: 0.88, value: 2500, accent: '#f0d078' },
    ],
  }),
  banner({
    id: 'pets',
    name: 'Питомцы',
    description: 'Спутники приключений: от пушистых слаймов до мифических зверей.',
    price: 210,
    category: 'pets',
    theme: 'linear-gradient(145deg, #1a1208 0%, #6a3a20 48%, #ffb070 100%)',
    items: [
      { id: 'pe-1', name: 'Маленький Слайм', rarity: 'common', chance: 36.54, value: 26, accent: '#a09070' },
      { id: 'pe-2', name: 'Лесной Лисик', rarity: 'common', chance: 27.2, value: 32, accent: '#b0a080' },
      { id: 'pe-3', name: 'Кристальный Краб', rarity: 'common', chance: 19.94, value: 40, accent: '#c0b090' },
      { id: 'pe-4', name: 'Птенец Анемо', rarity: 'uncommon', chance: 3.68, value: 95, accent: '#3ecf9a' },
      { id: 'pe-5', name: 'Огненный Котик', rarity: 'uncommon', chance: 3.09, value: 115, accent: '#45d9a8' },
      { id: 'pe-6', name: 'Лунный Олень', rarity: 'rare', chance: 3.08, value: 240, accent: '#4db8ff' },
      { id: 'pe-7', name: 'Грозовой Дракончик', rarity: 'rare', chance: 2.46, value: 300, accent: '#5ac4ff' },
      { id: 'pe-8', name: 'Страж Садов', rarity: 'epic', chance: 1.85, value: 680, accent: '#b48cff' },
      { id: 'pe-9', name: 'Феникс Сумеру', rarity: 'epic', chance: 1.23, value: 860, accent: '#c9a0ff' },
      { id: 'pe-10', name: 'Дракон Селестии', rarity: 'legendary', chance: 0.6, value: 3000, accent: '#f0d078' },
      { id: 'pe-11', name: 'Зверь Тысячи Солнц', rarity: 'legendary', chance: 0.33, value: 4800, accent: '#ffe08a' },
    ],
  }),
]

export function getCaseById(id: string): CaseDef | undefined {
  return CASES.find((c) => c.id === id)
}
