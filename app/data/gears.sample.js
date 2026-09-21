/**
 * Offline sample data.
 *
 * This file exists so the catalog renders something before you run a sync.
 * It is a hand-written shortlist of well-known classic gears, NOT the full
 * catalog, and it deliberately carries no asset IDs (so it can never show a
 * wrong thumbnail for a gear).
 *
 * Run `npm start` (or `node tools/fetch-gears.mjs`) to replace this with the
 * real catalog: every gear Roblox lists, with real IDs, prices and images.
 */
window.__GEAR_SAMPLE__ = {
  source: 'sample',
  fetchedAt: null,
  items: [
    { name: 'Linked Sword',        category: 'melee',      creator: 'Roblox', description: 'The classic ROBLOX sword. Lunge, slash, and link up.' },
    { name: 'Darkheart',           category: 'melee',      creator: 'Roblox', description: 'A blade of pure darkness.' },
    { name: 'Dual Darkhearts',     category: 'melee',      creator: 'Roblox', description: 'Two Darkhearts are better than one.' },
    { name: 'Illumina',            category: 'melee',      creator: 'Roblox', description: 'A sword of light, prized by collectors.' },
    { name: 'Venomshank',          category: 'melee',      creator: 'Roblox', description: 'A poisoned blade that slows its victims.' },
    { name: 'Windforce',           category: 'melee',      creator: 'Roblox', description: 'A blade quick as the wind.' },
    { name: 'Ghostwalker',         category: 'melee',      creator: 'Roblox', description: 'A spectral sword that phases through the living.' },
    { name: 'Ice Dagger',          category: 'melee',      creator: 'Roblox', description: 'A short blade carved from everlasting ice.' },
    { name: 'Firebrand',           category: 'melee',      creator: 'Roblox', description: 'A sword wreathed in flame.' },
    { name: 'Katana',              category: 'melee',      creator: 'Roblox', description: 'A fast, elegant single-edged blade.' },
    { name: 'Banhammer',           category: 'melee',      creator: 'Roblox', description: 'The hammer of judgement.' },
    { name: 'Hyperlaser Gun',      category: 'ranged',     creator: 'Roblox', description: 'Fires a rapid stream of laser bolts.' },
    { name: 'Laser Finger Pointer',category: 'ranged',     creator: 'Roblox', description: 'Point. Zap. Repeat.' },
    { name: 'Paintball Gun',       category: 'ranged',     creator: 'Roblox', description: 'Splatter the competition.' },
    { name: 'Slingshot',           category: 'ranged',     creator: 'Roblox', description: 'Simple, silent, surprisingly effective.' },
    { name: 'Crossbow',            category: 'ranged',     creator: 'Roblox', description: 'Slow to reload, heavy on impact.' },
    { name: 'Freeze Ray',          category: 'ranged',     creator: 'Roblox', description: 'Freezes anything it touches solid.' },
    { name: 'Rocket Launcher',     category: 'explosive',  creator: 'Roblox', description: 'The original rocket jumping tool.' },
    { name: 'Subspace Tripmine',   category: 'explosive',  creator: 'Roblox', description: 'Teleports whatever trips it, violently.' },
    { name: 'Bomb Vest',           category: 'explosive',  creator: 'Roblox', description: 'A one-way trip for everyone nearby.' },
    { name: 'Time Bomb',           category: 'explosive',  creator: 'Roblox', description: 'Set it down, count, and run.' },
    { name: 'Bloxy Cola',          category: 'power',      creator: 'Roblox', description: 'Refreshing. Restores health.' },
    { name: 'Speed Coil',          category: 'power',      creator: 'Roblox', description: 'Run considerably faster than everyone else.' },
    { name: 'Gravity Coil',        category: 'power',      creator: 'Roblox', description: 'Bounce over buildings in a single hop.' },
    { name: 'Regeneration Coil',   category: 'power',      creator: 'Roblox', description: 'Slowly heals you while held.' },
    { name: 'Fusion Coil',         category: 'power',      creator: 'Roblox', description: 'Speed and gravity, fused into one coil.' },
    { name: 'Jetpack',             category: 'navigation', creator: 'Roblox', description: 'Strap in and take off.' },
    { name: 'Magic Carpet',        category: 'navigation', creator: 'Roblox', description: 'A flying rug for the discerning traveller.' },
    { name: 'Skateboard',          category: 'transport',  creator: 'Roblox', description: 'Roll, jump, and grind around the map.' },
    { name: 'Boombox',            category: 'musical',    creator: 'Roblox', description: 'Play music for everyone around you.' },
    { name: 'Trowel',              category: 'building',   creator: 'Roblox', description: 'Lay down bricks and build your way up.' }
  ]
};
