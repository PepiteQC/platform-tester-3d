// ============================================================
// 🏭 FACTORY ENGINE — Moteur principal de génération
// Pack Generator + Heavy Logistics
// ============================================================

import * as THREE from 'three'
import { GeometryGenerator }  from '../generators/GeometryGenerator.js'
import { MaterialGenerator }  from '../generators/MaterialGenerator.js'
import { VariantGenerator }   from '../generators/VariantGenerator.js'
import { BatchProcessor }     from '../logistics/BatchProcessor.js'
import { MemoryPool }         from '../logistics/MemoryPool.js'
import { createLogger }       from '../utils/Logger.js'
import type {
  AssetManifest, BatchConfig, GeneratorConfig,
  ForgeCategory, ForgeAsset, GenerationPlan,
  ForgeTemplate, MaterialStyle,
} from '../types/index.js'

const log = createLogger('FactoryEngine')

// ─────────────────────────────────────────────
// CATALOGUE COMPLET 1500+ TEMPLATES
// ─────────────────────────────────────────────
const CATALOG: Record<string, ForgeTemplate[]> = {

  entities: [
    { name: 'humanoid_warrior',  type: 'character', subType: 'chestplate', materialStyle: 'metallic',   tags: ['character','warrior']    },
    { name: 'humanoid_mage',     type: 'character', subType: 'staff',      materialStyle: 'magical',    tags: ['character','mage']       },
    { name: 'humanoid_rogue',    type: 'character', subType: 'dagger',     materialStyle: 'organic',    tags: ['character','rogue']      },
    { name: 'humanoid_archer',   type: 'character', subType: 'bow',        materialStyle: 'wooden',     tags: ['character','archer']     },
    { name: 'humanoid_paladin',  type: 'character', subType: 'shield',     materialStyle: 'metallic',   tags: ['character','paladin']    },
    { name: 'creature_wolf',     type: 'creature',  subType: 'boulder',    materialStyle: 'fur',        tags: ['creature','beast']       },
    { name: 'creature_spider',   type: 'creature',  subType: 'gem',        materialStyle: 'organic',    tags: ['creature','arachnid']    },
    { name: 'creature_dragon',   type: 'dragon',    subType: 'boulder',    materialStyle: 'scaly',      tags: ['dragon','large']         },
    { name: 'creature_snake',    type: 'creature',  subType: 'staff',      materialStyle: 'scaly',      tags: ['creature','reptile']     },
    { name: 'creature_bird',     type: 'creature',  subType: 'gem',        materialStyle: 'organic',    tags: ['creature','avian']       },
    { name: 'robot_android',     type: 'robot',     subType: 'chestplate', materialStyle: 'metallic',   tags: ['robot','humanoid']       },
    { name: 'robot_drone',       type: 'robot',     subType: 'ring',       materialStyle: 'metallic',   tags: ['robot','flying']         },
    { name: 'robot_tank',        type: 'robot',     subType: 'crate',      materialStyle: 'heavy',      tags: ['robot','heavy']          },
    { name: 'elemental_fire',    type: 'elemental', subType: 'crystal',    materialStyle: 'emissive',   tags: ['elemental','fire']       },
    { name: 'elemental_ice',     type: 'elemental', subType: 'gem',        materialStyle: 'translucent',tags: ['elemental','ice']        },
    { name: 'elemental_earth',   type: 'elemental', subType: 'boulder',    materialStyle: 'stone',      tags: ['elemental','earth']      },
    { name: 'elemental_wind',    type: 'elemental', subType: 'torus',      materialStyle: 'translucent',tags: ['elemental','wind']       },
    { name: 'undead_skeleton',   type: 'undead',    subType: 'skull',      materialStyle: 'bone',       tags: ['undead','skeleton']      },
    { name: 'undead_zombie',     type: 'undead',    subType: 'chestplate', materialStyle: 'organic',    tags: ['undead','zombie']        },
    { name: 'undead_ghost',      type: 'undead',    subType: 'amulet',     materialStyle: 'translucent',tags: ['undead','ghost']         },
  ],

  objects: [
    { name: 'sword_iron',        type: 'weapon',    subType: 'sword',      materialStyle: 'metallic',   tags: ['weapon','sword','iron']  },
    { name: 'sword_steel',       type: 'weapon',    subType: 'sword',      materialStyle: 'metallic',   tags: ['weapon','sword','steel'] },
    { name: 'sword_gold',        type: 'weapon',    subType: 'sword',      materialStyle: 'metallic',   tags: ['weapon','sword','gold']  },
    { name: 'sword_magic',       type: 'weapon',    subType: 'sword',      materialStyle: 'magical',    tags: ['weapon','sword','magic'] },
    { name: 'sword_fire',        type: 'weapon',    subType: 'sword',      materialStyle: 'emissive',   tags: ['weapon','sword','fire']  },
    { name: 'axe_iron',          type: 'weapon',    subType: 'axe',        materialStyle: 'metallic',   tags: ['weapon','axe']           },
    { name: 'axe_double',        type: 'weapon',    subType: 'axe',        materialStyle: 'heavy',      tags: ['weapon','axe','double']  },
    { name: 'bow_wood',          type: 'weapon',    subType: 'bow',        materialStyle: 'wooden',     tags: ['weapon','bow']           },
    { name: 'bow_elven',         type: 'weapon',    subType: 'bow',        materialStyle: 'magical',    tags: ['weapon','bow','elven']   },
    { name: 'staff_wood',        type: 'weapon',    subType: 'staff',      materialStyle: 'wooden',     tags: ['weapon','staff']         },
    { name: 'staff_crystal',     type: 'weapon',    subType: 'staff',      materialStyle: 'magical',    tags: ['weapon','staff','crystal']},
    { name: 'dagger_iron',       type: 'weapon',    subType: 'dagger',     materialStyle: 'metallic',   tags: ['weapon','dagger']        },
    { name: 'dagger_poison',     type: 'weapon',    subType: 'dagger',     materialStyle: 'magical',    tags: ['weapon','dagger','poison']},
    { name: 'spear_iron',        type: 'weapon',    subType: 'spear',      materialStyle: 'metallic',   tags: ['weapon','spear']         },
    { name: 'hammer_iron',       type: 'weapon',    subType: 'hammer',     materialStyle: 'heavy',      tags: ['weapon','hammer']        },
    { name: 'shield_wood',       type: 'armor',     subType: 'shield',     materialStyle: 'wooden',     tags: ['armor','shield']         },
    { name: 'shield_iron',       type: 'armor',     subType: 'shield',     materialStyle: 'metallic',   tags: ['armor','shield','iron']  },
    { name: 'helmet_iron',       type: 'armor',     subType: 'helmet',     materialStyle: 'metallic',   tags: ['armor','helmet']         },
    { name: 'helmet_full',       type: 'armor',     subType: 'helmet',     materialStyle: 'heavy',      tags: ['armor','helmet','full']  },
    { name: 'chestplate_iron',   type: 'armor',     subType: 'chestplate', materialStyle: 'metallic',   tags: ['armor','chest']          },
    { name: 'potion_red',        type: 'consumable',subType: 'potion',     materialStyle: 'translucent',tags: ['potion','health']        },
    { name: 'potion_blue',       type: 'consumable',subType: 'potion',     materialStyle: 'translucent',tags: ['potion','mana']          },
    { name: 'potion_green',      type: 'consumable',subType: 'potion',     materialStyle: 'translucent',tags: ['potion','poison']        },
    { name: 'gem_ruby',          type: 'material',  subType: 'gem',        materialStyle: 'gemstone',   tags: ['gem','ruby']             },
    { name: 'gem_sapphire',      type: 'material',  subType: 'gem',        materialStyle: 'gemstone',   tags: ['gem','sapphire']         },
    { name: 'gem_emerald',       type: 'material',  subType: 'gem',        materialStyle: 'gemstone',   tags: ['gem','emerald']          },
    { name: 'gem_diamond',       type: 'material',  subType: 'gem',        materialStyle: 'gemstone',   tags: ['gem','diamond']          },
    { name: 'gem_amethyst',      type: 'material',  subType: 'gem',        materialStyle: 'gemstone',   tags: ['gem','amethyst']         },
    { name: 'crystal_blue',      type: 'material',  subType: 'crystal',    materialStyle: 'translucent',tags: ['crystal','blue']         },
    { name: 'crystal_red',       type: 'material',  subType: 'crystal',    materialStyle: 'translucent',tags: ['crystal','red']          },
    { name: 'ingot_iron',        type: 'material',  subType: 'ingot',      materialStyle: 'metallic',   tags: ['ingot','iron']           },
    { name: 'ingot_gold',        type: 'material',  subType: 'ingot',      materialStyle: 'metallic',   tags: ['ingot','gold']           },
    { name: 'coin_copper',       type: 'currency',  subType: 'coin',       materialStyle: 'metallic',   tags: ['coin','copper']          },
    { name: 'coin_silver',       type: 'currency',  subType: 'coin',       materialStyle: 'metallic',   tags: ['coin','silver']          },
    { name: 'coin_gold',         type: 'currency',  subType: 'coin',       materialStyle: 'metallic',   tags: ['coin','gold']            },
    { name: 'key_iron',          type: 'key',       subType: 'dagger',     materialStyle: 'metallic',   tags: ['key','iron']             },
    { name: 'key_gold',          type: 'key',       subType: 'dagger',     materialStyle: 'metallic',   tags: ['key','gold']             },
    { name: 'scroll_paper',      type: 'consumable',subType: 'ingot',      materialStyle: 'paper',      tags: ['scroll','magic']         },
    { name: 'ore_iron',          type: 'material',  subType: 'ore',        materialStyle: 'metallic',   tags: ['ore','iron']             },
    { name: 'ore_gold',          type: 'material',  subType: 'ore',        materialStyle: 'metallic',   tags: ['ore','gold']             },
    { name: 'ore_silver',        type: 'material',  subType: 'ore',        materialStyle: 'metallic',   tags: ['ore','silver']           },
    { name: 'skull_human',       type: 'remains',   subType: 'skull',      materialStyle: 'bone',       tags: ['skull','human']          },
    { name: 'skull_beast',       type: 'remains',   subType: 'skull',      materialStyle: 'bone',       tags: ['skull','beast']          },
  ],

  props: [
    { name: 'torch_iron',        type: 'light',     subType: 'torch',      materialStyle: 'metallic',   tags: ['light','torch']          },
    { name: 'lantern_iron',      type: 'light',     subType: 'lantern',    materialStyle: 'metallic',   tags: ['light','lantern']        },
    { name: 'lantern_magic',     type: 'light',     subType: 'lantern',    materialStyle: 'emissive',   tags: ['light','lantern','magic'] },
    { name: 'campfire_small',    type: 'light',     subType: 'campfire',   materialStyle: 'emissive',   tags: ['light','fire','outdoor'] },
    { name: 'crystal_glow',      type: 'light',     subType: 'crystal',    materialStyle: 'emissive',   tags: ['light','crystal']        },
    { name: 'barrel_wood',       type: 'container', subType: 'barrel',     materialStyle: 'wooden',     tags: ['container','barrel']     },
    { name: 'barrel_metal',      type: 'container', subType: 'barrel',     materialStyle: 'metallic',   tags: ['container','barrel','metal']},
    { name: 'crate_wood',        type: 'container', subType: 'crate',      materialStyle: 'wooden',     tags: ['container','crate']      },
    { name: 'crate_metal',       type: 'container', subType: 'crate',      materialStyle: 'heavy',      tags: ['container','crate','metal']},
    { name: 'chest_wood',        type: 'container', subType: 'chest',      materialStyle: 'wooden',     tags: ['container','chest']      },
    { name: 'chest_iron',        type: 'container', subType: 'chest',      materialStyle: 'heavy',      tags: ['container','chest','iron']},
    { name: 'chest_gold',        type: 'container', subType: 'chest',      materialStyle: 'metallic',   tags: ['container','chest','gold']},
    { name: 'chest_magic',       type: 'container', subType: 'chest',      materialStyle: 'magical',    tags: ['container','chest','magic']},
    { name: 'urn_clay',          type: 'container', subType: 'urn',        materialStyle: 'stone',      tags: ['container','urn']        },
    { name: 'vase_ceramic',      type: 'container', subType: 'vase',       materialStyle: 'stone',      tags: ['container','vase']       },
    { name: 'bottle_glass',      type: 'container', subType: 'bottle',     materialStyle: 'translucent',tags: ['container','bottle']     },
    { name: 'rock_small',        type: 'natural',   subType: 'rock',       materialStyle: 'stone',      tags: ['natural','rock','small'] },
    { name: 'rock_medium',       type: 'natural',   subType: 'rock',       materialStyle: 'stone',      tags: ['natural','rock','medium']},
    { name: 'boulder_large',     type: 'natural',   subType: 'boulder',    materialStyle: 'stone',      tags: ['natural','boulder']      },
    { name: 'stalactite_small',  type: 'natural',   subType: 'stalactite', materialStyle: 'stone',      tags: ['natural','cave']         },
    { name: 'stalagmite_small',  type: 'natural',   subType: 'stalactite', materialStyle: 'stone',      tags: ['natural','cave']         },
    { name: 'mushroom_red',      type: 'natural',   subType: 'mushroom_cap',materialStyle: 'organic',   tags: ['natural','mushroom']     },
    { name: 'mushroom_glow',     type: 'natural',   subType: 'mushroom_cap',materialStyle: 'emissive',  tags: ['natural','mushroom','glow']},
    { name: 'tree_pine_small',   type: 'natural',   subType: 'tree_crown', materialStyle: 'organic',    tags: ['natural','tree','pine']  },
    { name: 'tree_oak_small',    type: 'natural',   subType: 'tree_crown', materialStyle: 'organic',    tags: ['natural','tree','oak']   },
    { name: 'tree_trunk_pine',   type: 'natural',   subType: 'tree_trunk', materialStyle: 'wooden',     tags: ['natural','tree','trunk'] },
    { name: 'skull_prop',        type: 'remains',   subType: 'skull',      materialStyle: 'bone',       tags: ['prop','skull']           },
    { name: 'tombstone_simple',  type: 'remains',   subType: 'tombstone',  materialStyle: 'stone',      tags: ['prop','grave']           },
    { name: 'tombstone_fancy',   type: 'remains',   subType: 'tombstone',  materialStyle: 'stone',      tags: ['prop','grave','ornate']  },
    { name: 'pillar_stone',      type: 'arch',      subType: 'pillar',     materialStyle: 'stone',      tags: ['arch','pillar']          },
    { name: 'pillar_marble',     type: 'arch',      subType: 'pillar',     materialStyle: 'stone',      tags: ['arch','pillar','marble'] },
    { name: 'arch_stone',        type: 'arch',      subType: 'arch',       materialStyle: 'stone',      tags: ['arch','doorway']         },
    { name: 'fountain_stone',    type: 'arch',      subType: 'fountain',   materialStyle: 'stone',      tags: ['arch','fountain']        },
    { name: 'statue_warrior',    type: 'statue',    subType: 'statue',     materialStyle: 'stone',      tags: ['statue','warrior']       },
    { name: 'statue_deity',      type: 'statue',    subType: 'statue',     materialStyle: 'stone',      tags: ['statue','deity']         },
    { name: 'anvil',             type: 'tool',      subType: 'crate',      materialStyle: 'heavy',      tags: ['tool','blacksmith']      },
    { name: 'cauldron',          type: 'tool',      subType: 'barrel',     materialStyle: 'metallic',   tags: ['tool','alchemy']         },
    { name: 'cage_iron',         type: 'utility',   subType: 'crate',      materialStyle: 'heavy',      tags: ['utility','cage']         },
    { name: 'banner_faction',    type: 'decorative',subType: 'wall',       materialStyle: 'fabric',     tags: ['decorative','banner']    },
    { name: 'tapestry',          type: 'decorative',subType: 'wall',       materialStyle: 'fabric',     tags: ['decorative','tapestry']  },
    { name: 'mirror',            type: 'decorative',subType: 'window_frame',materialStyle: 'metallic',  tags: ['decorative','mirror']    },
  ],

  furniture: [
    { name: 'table_round_wood',  type: 'table',     subType: 'table_round',  materialStyle: 'wooden',  tags: ['furniture','table','round']   },
    { name: 'table_round_stone', type: 'table',     subType: 'table_round',  materialStyle: 'stone',   tags: ['furniture','table','stone']   },
    { name: 'table_square_wood', type: 'table',     subType: 'table_square', materialStyle: 'wooden',  tags: ['furniture','table','square']  },
    { name: 'table_tavern',      type: 'table',     subType: 'table_square', materialStyle: 'wooden',  tags: ['furniture','table','tavern']  },
    { name: 'table_dining_oak',  type: 'table',     subType: 'table_square', materialStyle: 'wooden',  tags: ['furniture','table','dining']  },
    { name: 'chair_wooden',      type: 'chair',     subType: 'chair',        materialStyle: 'wooden',  tags: ['furniture','chair','wood']    },
    { name: 'chair_iron',        type: 'chair',     subType: 'chair',        materialStyle: 'heavy',   tags: ['furniture','chair','iron']    },
    { name: 'throne_iron',       type: 'chair',     subType: 'throne',       materialStyle: 'heavy',   tags: ['furniture','throne','iron']   },
    { name: 'throne_gold',       type: 'chair',     subType: 'throne',       materialStyle: 'metallic',tags: ['furniture','throne','gold']   },
    { name: 'throne_stone',      type: 'chair',     subType: 'throne',       materialStyle: 'stone',   tags: ['furniture','throne','stone']  },
    { name: 'bed_simple_wood',   type: 'bed',       subType: 'bed_single',   materialStyle: 'wooden',  tags: ['furniture','bed','simple']    },
    { name: 'bed_royal_double',  type: 'bed',       subType: 'bed_double',   materialStyle: 'wooden',  tags: ['furniture','bed','royal']     },
    { name: 'bookshelf_wood',    type: 'storage',   subType: 'crate',        materialStyle: 'wooden',  tags: ['furniture','bookshelf']       },
    { name: 'cupboard_wood',     type: 'storage',   subType: 'chest',        materialStyle: 'wooden',  tags: ['furniture','cupboard']        },
    { name: 'wardrobe_wood',     type: 'storage',   subType: 'chest',        materialStyle: 'wooden',  tags: ['furniture','wardrobe']        },
    { name: 'desk_writing',      type: 'desk',      subType: 'table_square', materialStyle: 'wooden',  tags: ['furniture','desk','writing']  },
    { name: 'desk_blacksmith',   type: 'desk',      subType: 'table_square', materialStyle: 'heavy',   tags: ['furniture','desk','craft']    },
    { name: 'altar_stone',       type: 'table',     subType: 'table_round',  materialStyle: 'stone',   tags: ['furniture','altar','religious']},
    { name: 'altar_magic',       type: 'table',     subType: 'table_round',  materialStyle: 'magical', tags: ['furniture','altar','magic']   },
    { name: 'pedestal_stone',    type: 'table',     subType: 'pillar',       materialStyle: 'stone',   tags: ['furniture','pedestal']        },
    { name: 'workbench_iron',    type: 'table',     subType: 'table_square', materialStyle: 'heavy',   tags: ['furniture','workbench']       },
    { name: 'bar_counter',       type: 'table',     subType: 'table_square', materialStyle: 'wooden',  tags: ['furniture','bar','tavern']    },
    { name: 'shelf_small',       type: 'storage',   subType: 'wall',         materialStyle: 'wooden',  tags: ['furniture','shelf','small']   },
    { name: 'display_case',      type: 'storage',   subType: 'chest',        materialStyle: 'metallic',tags: ['furniture','display']         },
    { name: 'stool_tavern',      type: 'chair',     subType: 'chair',        materialStyle: 'wooden',  tags: ['furniture','stool','tavern']  },
    { name: 'bench_stone',       type: 'chair',     subType: 'table_square', materialStyle: 'stone',   tags: ['furniture','bench','stone']   },
    { name: 'bench_wood',        type: 'chair',     subType: 'table_square', materialStyle: 'wooden',  tags: ['furniture','bench','wood']    },
    { name: 'bin_wood',          type: 'storage',   subType: 'barrel',       materialStyle: 'wooden',  tags: ['furniture','bin','storage']   },
    { name: 'rack_weapon',       type: 'storage',   subType: 'wall',         materialStyle: 'wooden',  tags: ['furniture','rack','weapons']  },
    { name: 'rack_armor',        type: 'storage',   subType: 'wall',         materialStyle: 'wooden',  tags: ['furniture','rack','armor']    },
  ],

  architecture: [
    { name: 'wall_stone',        type: 'wall',      subType: 'wall',         materialStyle: 'stone',   tags: ['arch','wall','stone']         },
    { name: 'wall_brick',        type: 'wall',      subType: 'wall',         materialStyle: 'stone',   tags: ['arch','wall','brick']         },
    { name: 'wall_wood',         type: 'wall',      subType: 'wall',         materialStyle: 'wooden',  tags: ['arch','wall','wood']          },
    { name: 'wall_metal',        type: 'wall',      subType: 'wall',         materialStyle: 'metallic',tags: ['arch','wall','metal']         },
    { name: 'wall_magic',        type: 'wall',      subType: 'wall',         materialStyle: 'magical', tags: ['arch','wall','magic']         },
    { name: 'door_wood',         type: 'door',      subType: 'door',         materialStyle: 'wooden',  tags: ['arch','door','wood']          },
    { name: 'door_iron',         type: 'door',      subType: 'door',         materialStyle: 'heavy',   tags: ['arch','door','iron']          },
    { name: 'door_magic',        type: 'door',      subType: 'door',         materialStyle: 'magical', tags: ['arch','door','magic']         },
    { name: 'door_stone',        type: 'door',      subType: 'door',         materialStyle: 'stone',   tags: ['arch','door','stone']         },
    { name: 'window_stone',      type: 'window',    subType: 'window_frame', materialStyle: 'stone',   tags: ['arch','window','stone']       },
    { name: 'window_wood',       type: 'window',    subType: 'window_frame', materialStyle: 'wooden',  tags: ['arch','window','wood']        },
    { name: 'floor_stone',       type: 'floor',     subType: 'floor_tile',   materialStyle: 'stone',   tags: ['arch','floor','stone']        },
    { name: 'floor_wood',        type: 'floor',     subType: 'floor_tile',   materialStyle: 'wooden',  tags: ['arch','floor','wood']         },
    { name: 'floor_marble',      type: 'floor',     subType: 'floor_tile',   materialStyle: 'stone',   tags: ['arch','floor','marble']       },
    { name: 'floor_dirt',        type: 'floor',     subType: 'floor_tile',   materialStyle: 'organic', tags: ['arch','floor','dirt']         },
    { name: 'roof_flat',         type: 'roof',      subType: 'roof_panel',   materialStyle: 'stone',   tags: ['arch','roof','flat']          },
    { name: 'roof_pointed',      type: 'roof',      subType: 'roof_panel',   materialStyle: 'wooden',  tags: ['arch','roof','pointed']       },
    { name: 'stair_stone',       type: 'stair',     subType: 'stair',        materialStyle: 'stone',   tags: ['arch','stair','stone']        },
    { name: 'stair_wood',        type: 'stair',     subType: 'stair',        materialStyle: 'wooden',  tags: ['arch','stair','wood']         },
    { name: 'pillar_stone_arch', type: 'arch',      subType: 'pillar',       materialStyle: 'stone',   tags: ['arch','pillar']               },
    { name: 'pillar_iron',       type: 'arch',      subType: 'pillar',       materialStyle: 'heavy',   tags: ['arch','pillar','iron']        },
    { name: 'arch_stone_door',   type: 'arch',      subType: 'arch',         materialStyle: 'stone',   tags: ['arch','archway']              },
    { name: 'arch_magic',        type: 'arch',      subType: 'arch',         materialStyle: 'magical', tags: ['arch','archway','magic']      },
    { name: 'tower_round',       type: 'tower',     subType: 'barrel',       materialStyle: 'stone',   tags: ['arch','tower','round']        },
    { name: 'tower_square',      type: 'tower',     subType: 'crate',        materialStyle: 'stone',   tags: ['arch','tower','square']       },
    { name: 'bridge_stone',      type: 'bridge',    subType: 'wall',         materialStyle: 'stone',   tags: ['arch','bridge']               },
    { name: 'gate_iron',         type: 'gate',      subType: 'arch',         materialStyle: 'heavy',   tags: ['arch','gate','iron']          },
    { name: 'gate_wood',         type: 'gate',      subType: 'arch',         materialStyle: 'wooden',  tags: ['arch','gate','wood']          },
    { name: 'fence_wood',        type: 'fence',     subType: 'wall',         materialStyle: 'wooden',  tags: ['arch','fence']                },
    { name: 'fence_iron',        type: 'fence',     subType: 'wall',         materialStyle: 'heavy',   tags: ['arch','fence','iron']         },
    { name: 'trap_door',         type: 'door',      subType: 'floor_tile',   materialStyle: 'wooden',  tags: ['arch','trap','door']          },
    { name: 'portcullis',        type: 'gate',      subType: 'wall',         materialStyle: 'heavy',   tags: ['arch','portcullis']           },
    { name: 'dungeon_cell',      type: 'room',      subType: 'crate',        materialStyle: 'heavy',   tags: ['arch','dungeon','cell']       },
    { name: 'throne_room_floor', type: 'floor',     subType: 'floor_tile',   materialStyle: 'stone',   tags: ['arch','throne','room']        },
    { name: 'cave_entrance',     type: 'arch',      subType: 'arch',         materialStyle: 'stone',   tags: ['arch','cave','entrance']      },
    { name: 'mine_shaft',        type: 'arch',      subType: 'wall',         materialStyle: 'stone',   tags: ['arch','mine','shaft']         },
    { name: 'sewer_pipe',        type: 'utility',   subType: 'barrel',       materialStyle: 'heavy',   tags: ['arch','sewer']                },
    { name: 'dungeon_torch',     type: 'light',     subType: 'torch',        materialStyle: 'metallic',tags: ['arch','dungeon','light']      },
    { name: 'castle_wall',       type: 'wall',      subType: 'wall',         materialStyle: 'stone',   tags: ['arch','castle','wall']        },
    { name: 'castle_tower',      type: 'tower',     subType: 'barrel',       materialStyle: 'stone',   tags: ['arch','castle','tower']       },
    { name: 'drawbridge',        type: 'bridge',    subType: 'wall',         materialStyle: 'wooden',  tags: ['arch','drawbridge']           },
  ],
}

// ─────────────────────────────────────────────
// CLASSE PRINCIPALE
// ─────────────────────────────────────────────
export class FactoryEngine {
  private batchProcessor: BatchProcessor
  private memoryPool:     MemoryPool
  private geometryGen:    GeometryGenerator
  private materialGen:    MaterialGenerator
  private variantGen:     VariantGenerator

  private manifest: AssetManifest = {
    assets: [], totalSize: 0, categories: {},
    version: '1.0.0',
    stats: {
      totalVertices: 0, totalTriangles: 0,
      averageSize: 0, categoryBreakdown: {},
    },
  }

  private generatedCount = 0
  private isRunning      = false

  constructor(config?: GeneratorConfig) {
    this.batchProcessor = new BatchProcessor({
      batchSize:   config?.batchSize   ?? 50,
      concurrency: config?.concurrency ?? 8,
      memoryLimit: config?.memoryLimit ?? 1024 * 1024 * 512, // 512MB
    })

    this.memoryPool  = new MemoryPool({ maxSize: config?.memoryLimit ?? 512 * 1024 * 1024 })
    this.geometryGen = new GeometryGenerator()
    this.materialGen = new MaterialGenerator()
    this.variantGen  = new VariantGenerator()

    log.success('Forge Factory Engine initialisé')
  }

  // ──────────────────────────────────────────────
  // GÉNÉRER LE PACK COMPLET
  // ──────────────────────────────────────────────
  async generatePack(targetCount = 1500): Promise<AssetManifest> {
    if (this.isRunning) {
      log.warn('Génération déjà en cours')
      return this.manifest
    }

    this.isRunning = true
    const t0       = performance.now()

    log.info(`Génération de ${targetCount} assets...`)

    const plan = this.createPlan(targetCount)

    // Génération par catégorie
    for (const cat of plan.categories) {
      await this.generateCategory(cat)
    }

    // Variantes
    if (plan.variantCount > 0) {
      await this.generateVariants(plan.variantCount)
    }

    // Stats finales
    this.computeStats()

    const elapsed = ((performance.now() - t0) / 1000).toFixed(1)
    log.success(`Pack de ${this.generatedCount} assets généré en ${elapsed}s`)

    this.isRunning = false
    return this.manifest
  }

  // ──────────────────────────────────────────────
  // PLANIFICATION
  // ──────────────────────────────────────────────
  private createPlan(target: number): GenerationPlan {
    const categories: ForgeCategory[] = [
      { name: 'entities',     count: Math.floor(target * 0.20), priority: 1 },
      { name: 'objects',      count: Math.floor(target * 0.20), priority: 2 },
      { name: 'props',        count: Math.floor(target * 0.20), priority: 3 },
      { name: 'furniture',    count: Math.floor(target * 0.20), priority: 4 },
      { name: 'architecture', count: Math.floor(target * 0.15), priority: 5 },
    ]

    const assigned    = categories.reduce((acc, c) => acc + c.count, 0)
    const variantCount = Math.max(0, target - assigned)

    return { categories, variantCount, totalTarget: target, batchSize: 50, compression: 'draco' }
  }

  // ──────────────────────────────────────────────
  // GÉNÉRATION D'UNE CATÉGORIE
  // ──────────────────────────────────────────────
  private async generateCategory(cat: ForgeCategory): Promise<void> {
    const templates = CATALOG[cat.name] ?? []
    if (templates.length === 0) {
      log.warn(`Pas de templates pour la catégorie "${cat.name}"`)
      return
    }

    log.info(`Génération: ${cat.name} — ${cat.count} assets`)
    let produced = 0

    await this.batchProcessor.processBatch(
      templates,
      async (template, idx) => {
        if (produced >= cat.count) return

        const geos = this.geometryGen.generateVariants(template, 3)
        const mats = this.materialGen.generatePalette(template.materialStyle, 5)

        for (const geo of geos) {
          for (const mat of mats) {
            if (produced >= cat.count) break

            const asset = this.createAsset(cat.name, geo, mat, template)
            this.manifest.assets.push(asset)
            this.memoryPool.track(asset)
            produced++
            this.generatedCount++
          }
        }
      },
      (done, total) => {
        if (done % 10 === 0) log.progress(done, total, cat.name)
      }
    )

    this.manifest.categories[cat.name] = produced
    await this.memoryPool.optimize()
  }

  // ──────────────────────────────────────────────
  // CRÉER UN ASSET
  // ──────────────────────────────────────────────
  private createAsset(
    category: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    template: ForgeTemplate
  ): ForgeAsset {
    const mesh = new THREE.Mesh(geometry, material)
    const id   = `${category}_${template.subType}_${this.generatedCount}_${Date.now()}`

    this.geometryGen.optimize(geometry)

    const vertices  = geometry.attributes.position?.count ?? 0
    const triangles = geometry.index
      ? geometry.index.count / 3
      : vertices / 3

    return {
      id,
      name:       `${template.name}_${this.generatedCount}`,
      category,
      type:       template.type,
      subType:    template.subType,
      mesh,
      geometry,
      material,
      size:       vertices * 12 + triangles * 4,
      boundingBox: new THREE.Box3().setFromObject(mesh),
      tags:       template.tags ?? [],
      metadata: {
        vertices,
        triangles,
        materialType: material.type,
        generatedAt:  Date.now(),
        generation:   0,
      },
    }
  }

  // ──────────────────────────────────────────────
  // VARIANTES
  // ──────────────────────────────────────────────
  private async generateVariants(count: number): Promise<void> {
    log.info(`Génération de ${count} variantes...`)

    const baseAssets = this.manifest.assets.slice(0, 100)
    const variants   = await this.variantGen.generateFromBase(baseAssets, count)

    for (const v of variants) {
      this.manifest.assets.push(v)
      this.memoryPool.track(v)
      this.generatedCount++
    }

    await this.memoryPool.optimize()
    log.success(`${variants.length} variantes générées`)
  }

  // ──────────────────────────────────────────────
  // STATS
  // ──────────────────────────────────────────────
  private computeStats(): void {
    let totalV = 0, totalT = 0, totalS = 0

    for (const asset of this.manifest.assets) {
      totalV += asset.metadata.vertices
      totalT += asset.metadata.triangles
      totalS += asset.size
    }

    const count = this.manifest.assets.length || 1

    this.manifest.totalSize    = totalS
    this.manifest.generatedAt  = Date.now()
    this.manifest.stats = {
      totalVertices:     totalV,
      totalTriangles:    totalT,
      averageSize:       Math.round(totalS / count),
      categoryBreakdown: { ...this.manifest.categories },
    }
  }

  // ──────────────────────────────────────────────
  // GETTERS
  // ──────────────────────────────────────────────
  getManifest():       AssetManifest { return this.manifest }
  getGeneratedCount(): number        { return this.generatedCount }
  isGenerating():      boolean       { return this.isRunning }

  getAssetsByCategory(cat: string): ForgeAsset[] {
    return this.manifest.assets.filter(a => a.category === cat)
  }

  getAssetsByTag(tag: string): ForgeAsset[] {
    return this.manifest.assets.filter(a => a.tags.includes(tag))
  }

  searchAssets(query: string): ForgeAsset[] {
    const q = query.toLowerCase()
    return this.manifest.assets.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.type.toLowerCase().includes(q) ||
      a.tags.some(t => t.includes(q))
    )
  }

  dispose(): void {
    this.memoryPool.disposeAll()
    this.geometryGen.dispose()
    this.materialGen.dispose()
    this.manifest.assets = []
    this.generatedCount  = 0
    log.info('FactoryEngine disposé')
  }
}

export const factoryEngine = new FactoryEngine()