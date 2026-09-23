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
    "id": "anemo-breeze",
    "name": "Anemo Breeze",
    "price": 160,
    "image": "/cases/case-anemo.png",
    "items": [
      {
        "id": "an-1",
        "name": "Dandelion Seed",
        "rarity": "common",
        "chance": 34.33,
        "value": 20,
        "accent": "#7a9e96",
        "image": "/items/item-anemo.png"
      },
      {
        "id": "an-2",
        "name": "Windcatcher Ribbon",
        "rarity": "common",
        "chance": 24.94,
        "value": 26,
        "accent": "#8bb0a8",
        "image": "/items/item-anemo.png"
      },
      {
        "id": "an-3",
        "name": "Breeze Charm",
        "rarity": "common",
        "chance": 18.7,
        "value": 32,
        "accent": "#9cc4bb",
        "image": "/items/item-anemo.png"
      },
      {
        "id": "an-4",
        "name": "Skyfeather Bow",
        "rarity": "uncommon",
        "chance": 5.73,
        "value": 70,
        "accent": "#3ecf9a",
        "image": "/items/item-anemo.png"
      },
      {
        "id": "an-5",
        "name": "Wanderer Cape",
        "rarity": "uncommon",
        "chance": 4.41,
        "value": 88,
        "accent": "#45d9a8",
        "image": "/items/item-anemo.png"
      },
      {
        "id": "an-6",
        "name": "Gale Catalyst",
        "rarity": "rare",
        "chance": 4.41,
        "value": 180,
        "accent": "#4db8ff",
        "image": "/items/item-anemo.png"
      },
      {
        "id": "an-7",
        "name": "Vortex Claymore",
        "rarity": "rare",
        "chance": 3.07,
        "value": 240,
        "accent": "#5ac4ff",
        "image": "/items/item-anemo.png"
      },
      {
        "id": "an-8",
        "name": "Freedom Codex",
        "rarity": "epic",
        "chance": 2.42,
        "value": 520,
        "accent": "#b48cff",
        "image": "/items/item-anemo.png"
      },
      {
        "id": "an-9",
        "name": "Skyward Zephyr",
        "rarity": "epic",
        "chance": 1.33,
        "value": 680,
        "accent": "#c9a0ff",
        "image": "/items/item-anemo.png"
      },
      {
        "id": "an-10",
        "name": "Winds of Celestia",
        "rarity": "legendary",
        "chance": 0.66,
        "value": 2400,
        "accent": "#f0d078",
        "image": "/items/item-anemo.png"
      }
    ]
  },
  {
    "id": "pyro-embers",
    "name": "Pyro Embers",
    "price": 200,
    "image": "/cases/case-pyro.png",
    "items": [
      {
        "id": "py-1",
        "name": "Ashflake",
        "rarity": "common",
        "chance": 33.95,
        "value": 24,
        "accent": "#a87868",
        "image": "/items/item-pyro.png"
      },
      {
        "id": "py-2",
        "name": "Ember Seal",
        "rarity": "common",
        "chance": 25.89,
        "value": 30,
        "accent": "#b88874",
        "image": "/items/item-pyro.png"
      },
      {
        "id": "py-3",
        "name": "Cinder Ring",
        "rarity": "common",
        "chance": 17.8,
        "value": 38,
        "accent": "#c49884",
        "image": "/items/item-pyro.png"
      },
      {
        "id": "py-4",
        "name": "Blaze Dagger",
        "rarity": "uncommon",
        "chance": 5.58,
        "value": 85,
        "accent": "#3ecf9a",
        "image": "/items/item-pyro.png"
      },
      {
        "id": "py-5",
        "name": "Crimson Scarf",
        "rarity": "uncommon",
        "chance": 4.75,
        "value": 100,
        "accent": "#45d9a8",
        "image": "/items/item-pyro.png"
      },
      {
        "id": "py-6",
        "name": "Inferno Polearm",
        "rarity": "rare",
        "chance": 4.3,
        "value": 220,
        "accent": "#4db8ff",
        "image": "/items/item-pyro.png"
      },
      {
        "id": "py-7",
        "name": "Solar Mask",
        "rarity": "rare",
        "chance": 3.01,
        "value": 280,
        "accent": "#5ac4ff",
        "image": "/items/item-pyro.png"
      },
      {
        "id": "py-8",
        "name": "Phoenix Gauntlet",
        "rarity": "epic",
        "chance": 2.36,
        "value": 600,
        "accent": "#b48cff",
        "image": "/items/item-pyro.png"
      },
      {
        "id": "py-9",
        "name": "Lavawalker Relic",
        "rarity": "epic",
        "chance": 1.5,
        "value": 780,
        "accent": "#c9a0ff",
        "image": "/items/item-pyro.png"
      },
      {
        "id": "py-10",
        "name": "Heart of the Pyro Archon",
        "rarity": "legendary",
        "chance": 0.86,
        "value": 2800,
        "accent": "#f0d078",
        "image": "/items/item-pyro.png"
      }
    ]
  },
  {
    "id": "hydro-tide",
    "name": "Hydro Tide",
    "price": 190,
    "image": "/cases/case-hydro.png",
    "items": [
      {
        "id": "hy-1",
        "name": "Tide Pearl",
        "rarity": "common",
        "chance": 35.3,
        "value": 22,
        "accent": "#6a8aa0",
        "image": "/items/item-hydro.png"
      },
      {
        "id": "hy-2",
        "name": "Seafoam Token",
        "rarity": "common",
        "chance": 24.06,
        "value": 28,
        "accent": "#7a9ab0",
        "image": "/items/item-hydro.png"
      },
      {
        "id": "hy-3",
        "name": "Ripple Charm",
        "rarity": "common",
        "chance": 17.65,
        "value": 34,
        "accent": "#8aaac0",
        "image": "/items/item-hydro.png"
      },
      {
        "id": "hy-4",
        "name": "Fountain Blade",
        "rarity": "uncommon",
        "chance": 5.75,
        "value": 78,
        "accent": "#3ecf9a",
        "image": "/items/item-hydro.png"
      },
      {
        "id": "hy-5",
        "name": "Mariner Gloves",
        "rarity": "uncommon",
        "chance": 4.42,
        "value": 95,
        "accent": "#45d9a8",
        "image": "/items/item-hydro.png"
      },
      {
        "id": "hy-6",
        "name": "Abyss Catalyst",
        "rarity": "rare",
        "chance": 4.42,
        "value": 200,
        "accent": "#4db8ff",
        "image": "/items/item-hydro.png"
      },
      {
        "id": "hy-7",
        "name": "Wavebreaker Bow",
        "rarity": "rare",
        "chance": 3.5,
        "value": 260,
        "accent": "#5ac4ff",
        "image": "/items/item-hydro.png"
      },
      {
        "id": "hy-8",
        "name": "Court of Springs",
        "rarity": "epic",
        "chance": 2.47,
        "value": 560,
        "accent": "#b48cff",
        "image": "/items/item-hydro.png"
      },
      {
        "id": "hy-9",
        "name": "Oceanid Tear",
        "rarity": "epic",
        "chance": 1.55,
        "value": 720,
        "accent": "#c9a0ff",
        "image": "/items/item-hydro.png"
      },
      {
        "id": "hy-10",
        "name": "Hydro Sovereign Orb",
        "rarity": "legendary",
        "chance": 0.88,
        "value": 2600,
        "accent": "#f0d078",
        "image": "/items/item-hydro.png"
      }
    ]
  },
  {
    "id": "electro-pulse",
    "name": "Electro Pulse",
    "price": 220,
    "image": "/cases/case-electro.png",
    "items": [
      {
        "id": "el-1",
        "name": "Static Shard",
        "rarity": "common",
        "chance": 36.52,
        "value": 28,
        "accent": "#8a7aa0",
        "image": "/items/item-electro.png"
      },
      {
        "id": "el-2",
        "name": "Thunder Tag",
        "rarity": "common",
        "chance": 27.18,
        "value": 35,
        "accent": "#9a8ab0",
        "image": "/items/item-electro.png"
      },
      {
        "id": "el-3",
        "name": "Amethyst Bead",
        "rarity": "common",
        "chance": 19.94,
        "value": 42,
        "accent": "#aa9ac0",
        "image": "/items/item-electro.png"
      },
      {
        "id": "el-4",
        "name": "Raiden Ribbon",
        "rarity": "uncommon",
        "chance": 3.7,
        "value": 100,
        "accent": "#3ecf9a",
        "image": "/items/item-electro.png"
      },
      {
        "id": "el-5",
        "name": "Storm Ward",
        "rarity": "uncommon",
        "chance": 3.09,
        "value": 125,
        "accent": "#45d9a8",
        "image": "/items/item-electro.png"
      },
      {
        "id": "el-6",
        "name": "Lightning Katana",
        "rarity": "rare",
        "chance": 3,
        "value": 260,
        "accent": "#4db8ff",
        "image": "/items/item-electro.png"
      },
      {
        "id": "el-7",
        "name": "Vision Case: Electro",
        "rarity": "rare",
        "chance": 2.47,
        "value": 320,
        "accent": "#5ac4ff",
        "image": "/items/item-electro.png"
      },
      {
        "id": "el-8",
        "name": "Eternity Scroll",
        "rarity": "epic",
        "chance": 1.85,
        "value": 700,
        "accent": "#b48cff",
        "image": "/items/item-electro.png"
      },
      {
        "id": "el-9",
        "name": "Baal Echo",
        "rarity": "epic",
        "chance": 1.32,
        "value": 900,
        "accent": "#c9a0ff",
        "image": "/items/item-electro.png"
      },
      {
        "id": "el-10",
        "name": "Musou no Hitotachi",
        "rarity": "legendary",
        "chance": 0.62,
        "value": 3200,
        "accent": "#f0d078",
        "image": "/items/item-electro.png"
      },
      {
        "id": "el-11",
        "name": "Engulfing Stars",
        "rarity": "legendary",
        "chance": 0.31,
        "value": 4500,
        "accent": "#ffe08a",
        "image": "/items/item-electro.png"
      }
    ]
  },
  {
    "id": "cryo-veil",
    "name": "Cryo Veil",
    "price": 180,
    "image": "/cases/case-cryo.png",
    "items": [
      {
        "id": "cr-1",
        "name": "Frostflake",
        "rarity": "common",
        "chance": 36.95,
        "value": 20,
        "accent": "#7a90a0",
        "image": "/items/item-cryo.png"
      },
      {
        "id": "cr-2",
        "name": "Snowblind Pin",
        "rarity": "common",
        "chance": 24.11,
        "value": 26,
        "accent": "#8aa0b0",
        "image": "/items/item-cryo.png"
      },
      {
        "id": "cr-3",
        "name": "Ice Lace",
        "rarity": "common",
        "chance": 16.06,
        "value": 34,
        "accent": "#9ab0c0",
        "image": "/items/item-cryo.png"
      },
      {
        "id": "cr-4",
        "name": "Glacier Spear",
        "rarity": "uncommon",
        "chance": 5.72,
        "value": 75,
        "accent": "#3ecf9a",
        "image": "/items/item-cryo.png"
      },
      {
        "id": "cr-5",
        "name": "Winter Cloak",
        "rarity": "uncommon",
        "chance": 4.83,
        "value": 92,
        "accent": "#45d9a8",
        "image": "/items/item-cryo.png"
      },
      {
        "id": "cr-6",
        "name": "Moonlit Bow",
        "rarity": "rare",
        "chance": 4.41,
        "value": 195,
        "accent": "#4db8ff",
        "image": "/items/item-cryo.png"
      },
      {
        "id": "cr-7",
        "name": "Cryo Vision Case",
        "rarity": "rare",
        "chance": 3.08,
        "value": 250,
        "accent": "#5ac4ff",
        "image": "/items/item-cryo.png"
      },
      {
        "id": "cr-8",
        "name": "Blizzard Strayer",
        "rarity": "epic",
        "chance": 2.42,
        "value": 540,
        "accent": "#b48cff",
        "image": "/items/item-cryo.png"
      },
      {
        "id": "cr-9",
        "name": "Ice Queen Diadem",
        "rarity": "epic",
        "chance": 1.54,
        "value": 700,
        "accent": "#c9a0ff",
        "image": "/items/item-cryo.png"
      },
      {
        "id": "cr-10",
        "name": "Heart of the Cryo Archon",
        "rarity": "legendary",
        "chance": 0.88,
        "value": 2500,
        "accent": "#f0d078",
        "image": "/items/item-cryo.png"
      }
    ]
  },
  {
    "id": "dendro-grove",
    "name": "Dendro Grove",
    "price": 210,
    "image": "/cases/case-dendro.png",
    "items": [
      {
        "id": "de-1",
        "name": "Sprout Chip",
        "rarity": "common",
        "chance": 36.54,
        "value": 26,
        "accent": "#6a906e",
        "image": "/items/item-dendro.png"
      },
      {
        "id": "de-2",
        "name": "Leaf Token",
        "rarity": "common",
        "chance": 27.2,
        "value": 32,
        "accent": "#7aa07e",
        "image": "/items/item-dendro.png"
      },
      {
        "id": "de-3",
        "name": "Vine Bracelet",
        "rarity": "common",
        "chance": 19.94,
        "value": 40,
        "accent": "#8ab08e",
        "image": "/items/item-dendro.png"
      },
      {
        "id": "de-4",
        "name": "Jungle Cleaver",
        "rarity": "uncommon",
        "chance": 3.68,
        "value": 95,
        "accent": "#3ecf9a",
        "image": "/items/item-dendro.png"
      },
      {
        "id": "de-5",
        "name": "Scholar Satchel",
        "rarity": "uncommon",
        "chance": 3.09,
        "value": 115,
        "accent": "#45d9a8",
        "image": "/items/item-dendro.png"
      },
      {
        "id": "de-6",
        "name": "Wisdom Staff",
        "rarity": "rare",
        "chance": 3.08,
        "value": 240,
        "accent": "#4db8ff",
        "image": "/items/item-dendro.png"
      },
      {
        "id": "de-7",
        "name": "Dendro Vision Case",
        "rarity": "rare",
        "chance": 2.46,
        "value": 300,
        "accent": "#5ac4ff",
        "image": "/items/item-dendro.png"
      },
      {
        "id": "de-8",
        "name": "Deepwood Memories",
        "rarity": "epic",
        "chance": 1.85,
        "value": 680,
        "accent": "#b48cff",
        "image": "/items/item-dendro.png"
      },
      {
        "id": "de-9",
        "name": "Gilded Dreams",
        "rarity": "epic",
        "chance": 1.23,
        "value": 860,
        "accent": "#c9a0ff",
        "image": "/items/item-dendro.png"
      },
      {
        "id": "de-10",
        "name": "Heart of the Dendro Archon",
        "rarity": "legendary",
        "chance": 0.6,
        "value": 3000,
        "accent": "#f0d078",
        "image": "/items/item-dendro.png"
      },
      {
        "id": "de-11",
        "name": "A Thousand Verdant Suns",
        "rarity": "legendary",
        "chance": 0.33,
        "value": 4800,
        "accent": "#ffe08a",
        "image": "/items/item-dendro.png"
      }
    ]
  }
]

export function getCaseById(id: string): CatalogCase | undefined {
  return CASES.find((c) => c.id === id)
}

export function entryFeeFor(caseIds: string[]): number {
  return caseIds.reduce((sum, id) => sum + (getCaseById(id)?.price ?? 0), 0)
}
