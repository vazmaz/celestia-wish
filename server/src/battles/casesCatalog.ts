/** Auto-generated from frontend cases catalog — do not edit by hand. */
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export type CatalogItem = {
  id: string
  name: string
  rarity: Rarity
  chance: number
  value: number
  accent: string
  image: string
}

export type CatalogCase = {
  id: string
  name: string
  price: number
  image: string
  items: CatalogItem[]
}

export const CASES: CatalogCase[] = [
  {
    "id": "elements",
    "name": "Элементы",
    "price": 160,
    "image": "/cases/case-elements.png",
    "items": [
      {
        "id": "el-1",
        "name": "Искра Анемо",
        "rarity": "common",
        "chance": 34.33,
        "value": 20,
        "accent": "#7a9e96",
        "image": "/items/skin-el-1.png"
      },
      {
        "id": "el-2",
        "name": "Уголь Пиро",
        "rarity": "common",
        "chance": 24.94,
        "value": 26,
        "accent": "#a87868",
        "image": "/items/skin-el-2.png"
      },
      {
        "id": "el-3",
        "name": "Капля Гидро",
        "rarity": "common",
        "chance": 18.7,
        "value": 32,
        "accent": "#6a8aa0",
        "image": "/items/skin-el-3.png"
      },
      {
        "id": "el-4",
        "name": "Осколок Электро",
        "rarity": "uncommon",
        "chance": 5.73,
        "value": 70,
        "accent": "#3ecf9a",
        "image": "/items/skin-el-4.png"
      },
      {
        "id": "el-5",
        "name": "Кристалл Крио",
        "rarity": "uncommon",
        "chance": 4.41,
        "value": 88,
        "accent": "#45d9a8",
        "image": "/items/skin-el-5.png"
      },
      {
        "id": "el-6",
        "name": "Семя Дендро",
        "rarity": "rare",
        "chance": 4.41,
        "value": 180,
        "accent": "#4db8ff",
        "image": "/items/skin-el-6.png"
      },
      {
        "id": "el-7",
        "name": "Призма Гео",
        "rarity": "rare",
        "chance": 3.07,
        "value": 240,
        "accent": "#5ac4ff",
        "image": "/items/skin-el-7.png"
      },
      {
        "id": "el-8",
        "name": "Ядро Резонанса",
        "rarity": "epic",
        "chance": 2.42,
        "value": 520,
        "accent": "#b48cff",
        "image": "/items/skin-el-8.png"
      },
      {
        "id": "el-9",
        "name": "Вижн Семи Стихий",
        "rarity": "epic",
        "chance": 1.33,
        "value": 680,
        "accent": "#c9a0ff",
        "image": "/items/skin-el-9.png"
      },
      {
        "id": "el-10",
        "name": "Сердце Небес",
        "rarity": "legendary",
        "chance": 0.66,
        "value": 2400,
        "accent": "#f0d078",
        "image": "/items/skin-el-10.png"
      }
    ]
  },
  {
    "id": "swords",
    "name": "Мечи",
    "price": 200,
    "image": "/cases/case-swords.png",
    "items": [
      {
        "id": "sw-1",
        "name": "Тупой Клинок",
        "rarity": "common",
        "chance": 33.95,
        "value": 24,
        "accent": "#8a9098",
        "image": "/items/skin-sw-1.png"
      },
      {
        "id": "sw-2",
        "name": "Страннический Меч",
        "rarity": "common",
        "chance": 25.89,
        "value": 30,
        "accent": "#9a9ea8",
        "image": "/items/skin-sw-2.png"
      },
      {
        "id": "sw-3",
        "name": "Стальной Рапир",
        "rarity": "common",
        "chance": 17.8,
        "value": 38,
        "accent": "#a8b0bc",
        "image": "/items/skin-sw-3.png"
      },
      {
        "id": "sw-4",
        "name": "Клинок Ветра",
        "rarity": "uncommon",
        "chance": 5.58,
        "value": 85,
        "accent": "#3ecf9a",
        "image": "/items/skin-sw-4.png"
      },
      {
        "id": "sw-5",
        "name": "Пламенный Тесак",
        "rarity": "uncommon",
        "chance": 4.75,
        "value": 100,
        "accent": "#45d9a8",
        "image": "/items/skin-sw-5.png"
      },
      {
        "id": "sw-6",
        "name": "Лунная Катана",
        "rarity": "rare",
        "chance": 4.3,
        "value": 220,
        "accent": "#4db8ff",
        "image": "/items/skin-sw-6.png"
      },
      {
        "id": "sw-7",
        "name": "Грозовой Фальшион",
        "rarity": "rare",
        "chance": 3.01,
        "value": 280,
        "accent": "#5ac4ff",
        "image": "/items/skin-sw-7.png"
      },
      {
        "id": "sw-8",
        "name": "Клинок Вечности",
        "rarity": "epic",
        "chance": 2.36,
        "value": 600,
        "accent": "#b48cff",
        "image": "/items/skin-sw-8.png"
      },
      {
        "id": "sw-9",
        "name": "Песнь Небес",
        "rarity": "epic",
        "chance": 1.5,
        "value": 780,
        "accent": "#c9a0ff",
        "image": "/items/skin-sw-9.png"
      },
      {
        "id": "sw-10",
        "name": "Мусо но Хитотачи",
        "rarity": "legendary",
        "chance": 0.86,
        "value": 2800,
        "accent": "#f0d078",
        "image": "/items/skin-sw-10.png"
      }
    ]
  },
  {
    "id": "characters",
    "name": "Персонажи",
    "price": 190,
    "image": "/cases/case-characters.png",
    "items": [
      {
        "id": "ch-1",
        "name": "Новичок Путешественник",
        "rarity": "common",
        "chance": 35.3,
        "value": 22,
        "accent": "#a09098",
        "image": "/items/skin-ch-1.png"
      },
      {
        "id": "ch-2",
        "name": "Разведчик Гильдии",
        "rarity": "common",
        "chance": 24.06,
        "value": 28,
        "accent": "#b0a0a8",
        "image": "/items/skin-ch-2.png"
      },
      {
        "id": "ch-3",
        "name": "Ученик Академии",
        "rarity": "common",
        "chance": 17.65,
        "value": 34,
        "accent": "#c0b0b8",
        "image": "/items/skin-ch-3.png"
      },
      {
        "id": "ch-4",
        "name": "Рыцарь Фавония",
        "rarity": "uncommon",
        "chance": 5.75,
        "value": 78,
        "accent": "#3ecf9a",
        "image": "/items/skin-ch-4.png"
      },
      {
        "id": "ch-5",
        "name": "Жрица Святилища",
        "rarity": "uncommon",
        "chance": 4.42,
        "value": 95,
        "accent": "#45d9a8",
        "image": "/items/skin-ch-5.png"
      },
      {
        "id": "ch-6",
        "name": "Капитан Флота",
        "rarity": "rare",
        "chance": 4.42,
        "value": 200,
        "accent": "#4db8ff",
        "image": "/items/skin-ch-6.png"
      },
      {
        "id": "ch-7",
        "name": "Теневой Охотник",
        "rarity": "rare",
        "chance": 3.5,
        "value": 260,
        "accent": "#5ac4ff",
        "image": "/items/skin-ch-7.png"
      },
      {
        "id": "ch-8",
        "name": "Архимаг Сумеру",
        "rarity": "epic",
        "chance": 2.47,
        "value": 560,
        "accent": "#b48cff",
        "image": "/items/skin-ch-8.png"
      },
      {
        "id": "ch-9",
        "name": "Генерал Инадзумы",
        "rarity": "epic",
        "chance": 1.55,
        "value": 720,
        "accent": "#c9a0ff",
        "image": "/items/skin-ch-9.png"
      },
      {
        "id": "ch-10",
        "name": "Архонт Семи Престолов",
        "rarity": "legendary",
        "chance": 0.88,
        "value": 2600,
        "accent": "#f0d078",
        "image": "/items/skin-ch-10.png"
      }
    ]
  },
  {
    "id": "shields",
    "name": "Щиты",
    "price": 220,
    "image": "/cases/case-shields.png",
    "items": [
      {
        "id": "sh-1",
        "name": "Деревянный Баклер",
        "rarity": "common",
        "chance": 36.52,
        "value": 28,
        "accent": "#7a8a80",
        "image": "/items/skin-sh-1.png"
      },
      {
        "id": "sh-2",
        "name": "Кожаный Оплот",
        "rarity": "common",
        "chance": 27.18,
        "value": 35,
        "accent": "#8a9a90",
        "image": "/items/skin-sh-2.png"
      },
      {
        "id": "sh-3",
        "name": "Железная Круглая",
        "rarity": "common",
        "chance": 19.94,
        "value": 42,
        "accent": "#9aa8a0",
        "image": "/items/skin-sh-3.png"
      },
      {
        "id": "sh-4",
        "name": "Щит Ветров",
        "rarity": "uncommon",
        "chance": 3.7,
        "value": 100,
        "accent": "#3ecf9a",
        "image": "/items/skin-sh-4.png"
      },
      {
        "id": "sh-5",
        "name": "Ледяная Стена",
        "rarity": "uncommon",
        "chance": 3.09,
        "value": 125,
        "accent": "#45d9a8",
        "image": "/items/skin-sh-5.png"
      },
      {
        "id": "sh-6",
        "name": "Громовой Бастион",
        "rarity": "rare",
        "chance": 3,
        "value": 260,
        "accent": "#4db8ff",
        "image": "/items/skin-sh-6.png"
      },
      {
        "id": "sh-7",
        "name": "Щит Глубин",
        "rarity": "rare",
        "chance": 2.47,
        "value": 320,
        "accent": "#5ac4ff",
        "image": "/items/skin-sh-7.png"
      },
      {
        "id": "sh-8",
        "name": "Эгида Вечности",
        "rarity": "epic",
        "chance": 1.85,
        "value": 700,
        "accent": "#b48cff",
        "image": "/items/skin-sh-8.png"
      },
      {
        "id": "sh-9",
        "name": "Барьер Архонта",
        "rarity": "epic",
        "chance": 1.32,
        "value": 900,
        "accent": "#c9a0ff",
        "image": "/items/skin-sh-9.png"
      },
      {
        "id": "sh-10",
        "name": "Небесный Оплот",
        "rarity": "legendary",
        "chance": 0.62,
        "value": 3200,
        "accent": "#f0d078",
        "image": "/items/skin-sh-10.png"
      },
      {
        "id": "sh-11",
        "name": "Щит Селестии",
        "rarity": "legendary",
        "chance": 0.31,
        "value": 4500,
        "accent": "#ffe08a",
        "image": "/items/skin-sh-11.png"
      }
    ]
  },
  {
    "id": "equipment",
    "name": "Экипировка",
    "price": 180,
    "image": "/cases/case-equipment.png",
    "items": [
      {
        "id": "eq-1",
        "name": "Походные Сапоги",
        "rarity": "common",
        "chance": 36.95,
        "value": 20,
        "accent": "#8a8070",
        "image": "/items/skin-eq-1.png"
      },
      {
        "id": "eq-2",
        "name": "Кожаные Перчатки",
        "rarity": "common",
        "chance": 24.11,
        "value": 26,
        "accent": "#9a9080",
        "image": "/items/skin-eq-2.png"
      },
      {
        "id": "eq-3",
        "name": "Плащ Путника",
        "rarity": "common",
        "chance": 16.06,
        "value": 34,
        "accent": "#aaa090",
        "image": "/items/skin-eq-3.png"
      },
      {
        "id": "eq-4",
        "name": "Кольчуга Рыцаря",
        "rarity": "uncommon",
        "chance": 5.72,
        "value": 75,
        "accent": "#3ecf9a",
        "image": "/items/skin-eq-4.png"
      },
      {
        "id": "eq-5",
        "name": "Пояс Искателя",
        "rarity": "uncommon",
        "chance": 4.83,
        "value": 92,
        "accent": "#45d9a8",
        "image": "/items/skin-eq-5.png"
      },
      {
        "id": "eq-6",
        "name": "Тиара Луны",
        "rarity": "rare",
        "chance": 4.41,
        "value": 195,
        "accent": "#4db8ff",
        "image": "/items/skin-eq-6.png"
      },
      {
        "id": "eq-7",
        "name": "Наплечники Бури",
        "rarity": "rare",
        "chance": 3.08,
        "value": 250,
        "accent": "#5ac4ff",
        "image": "/items/skin-eq-7.png"
      },
      {
        "id": "eq-8",
        "name": "Комплект Глубоколесья",
        "rarity": "epic",
        "chance": 2.42,
        "value": 540,
        "accent": "#b48cff",
        "image": "/items/skin-eq-8.png"
      },
      {
        "id": "eq-9",
        "name": "Доспех Феникса",
        "rarity": "epic",
        "chance": 1.54,
        "value": 700,
        "accent": "#c9a0ff",
        "image": "/items/skin-eq-9.png"
      },
      {
        "id": "eq-10",
        "name": "Реликвия Архонта",
        "rarity": "legendary",
        "chance": 0.88,
        "value": 2500,
        "accent": "#f0d078",
        "image": "/items/skin-eq-10.png"
      }
    ]
  },
  {
    "id": "pets",
    "name": "Питомцы",
    "price": 210,
    "image": "/cases/case-pets.png",
    "items": [
      {
        "id": "pe-1",
        "name": "Маленький Слайм",
        "rarity": "common",
        "chance": 36.54,
        "value": 26,
        "accent": "#a09070",
        "image": "/items/skin-pe-1.png"
      },
      {
        "id": "pe-2",
        "name": "Лесной Лисик",
        "rarity": "common",
        "chance": 27.2,
        "value": 32,
        "accent": "#b0a080",
        "image": "/items/skin-pe-2.png"
      },
      {
        "id": "pe-3",
        "name": "Кристальный Краб",
        "rarity": "common",
        "chance": 19.94,
        "value": 40,
        "accent": "#c0b090",
        "image": "/items/skin-pe-3.png"
      },
      {
        "id": "pe-4",
        "name": "Птенец Анемо",
        "rarity": "uncommon",
        "chance": 3.68,
        "value": 95,
        "accent": "#3ecf9a",
        "image": "/items/skin-pe-4.png"
      },
      {
        "id": "pe-5",
        "name": "Огненный Котик",
        "rarity": "uncommon",
        "chance": 3.09,
        "value": 115,
        "accent": "#45d9a8",
        "image": "/items/skin-pe-5.png"
      },
      {
        "id": "pe-6",
        "name": "Лунный Олень",
        "rarity": "rare",
        "chance": 3.08,
        "value": 240,
        "accent": "#4db8ff",
        "image": "/items/skin-pe-6.png"
      },
      {
        "id": "pe-7",
        "name": "Грозовой Дракончик",
        "rarity": "rare",
        "chance": 2.46,
        "value": 300,
        "accent": "#5ac4ff",
        "image": "/items/skin-pe-7.png"
      },
      {
        "id": "pe-8",
        "name": "Страж Садов",
        "rarity": "epic",
        "chance": 1.85,
        "value": 680,
        "accent": "#b48cff",
        "image": "/items/skin-pe-8.png"
      },
      {
        "id": "pe-9",
        "name": "Феникс Сумеру",
        "rarity": "epic",
        "chance": 1.23,
        "value": 860,
        "accent": "#c9a0ff",
        "image": "/items/skin-pe-9.png"
      },
      {
        "id": "pe-10",
        "name": "Дракон Селестии",
        "rarity": "legendary",
        "chance": 0.6,
        "value": 3000,
        "accent": "#f0d078",
        "image": "/items/skin-pe-10.png"
      },
      {
        "id": "pe-11",
        "name": "Зверь Тысячи Солнц",
        "rarity": "legendary",
        "chance": 0.33,
        "value": 4800,
        "accent": "#ffe08a",
        "image": "/items/skin-pe-11.png"
      }
    ]
  }
]

/** Old elemental banner ids → new category banners (rematch / stale clients). */
const CASE_ALIASES: Record<string, string> = {
  'anemo-breeze': 'elements',
  'pyro-embers': 'swords',
  'hydro-tide': 'characters',
  'electro-pulse': 'shields',
  'cryo-veil': 'equipment',
  'dendro-grove': 'pets',
}

export function getCaseById(id: string): CatalogCase | undefined {
  const resolved = CASE_ALIASES[id] ?? id
  return CASES.find((c) => c.id === resolved)
}

export function entryFeeFor(caseIds: string[]): number {
  return caseIds.reduce((sum, id) => sum + (getCaseById(id)?.price ?? 0), 0)
}
