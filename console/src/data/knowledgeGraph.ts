export interface KnowledgeNode {
  id: string;
  label: string;
  category: string;
  description: string;
  character: 'Adam' | 'Eve' | 'Both';
}

export interface KnowledgeEdge {
  source: string;
  target: string;
  relation: string; // e.g., "requires", "leads_to", "used_for", "signifies"
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

export const KNOWLEDGE_GRAPH: KnowledgeGraph = {
  nodes: [
    // --- Eve'S KNOWLEDGE ---
    { id: 'moon_blood', label: 'Biological Cycle', category: 'Physiology', character: 'Eve', description: 'Internal monitoring of fertility cycles.' },
    { id: 'birth_wisdom', label: 'Reproduction Logic', category: 'Physiology', character: 'Eve', description: 'Procedures for successful offspring materialization.' },
    { id: 'herbal_medicine', label: 'Botanical Assets', category: 'Flora', character: 'Eve', description: 'Knowledge of chemical properties in regional plants.' },
    { id: 'digging_stick', label: 'Extraction Tool', category: 'Tools', character: 'Eve', description: 'A tool for resource extraction from soil.' },
    { id: 'seed_selection', label: 'Agricultural Prep', category: 'Agriculture', character: 'Eve', description: 'Optimization of future crop yields.' },
    { id: 'hide_processing', label: 'Material Refinement', category: 'Crafting', character: 'Eve', description: 'Transforming organic hides into useful materials.' },
    { id: 'basket_weaving', label: 'Storage Crafting', category: 'Crafting', character: 'Eve', description: 'Constructing containers for resource transport.' },
    { id: 'food_preservation', label: 'Asset Preservation', category: 'Management', character: 'Eve', description: 'Techniques to prevent degradation of organic resources.' },
    { id: 'eve_intuition', label: 'Predictive Heuristics (E)', category: 'Instinct', character: 'Eve', description: 'Heuristic-based threat detection.' },
    { id: 'social_cohesion', label: 'Social Cohesion', category: 'Emotions', character: 'Eve', description: 'Monitoring and managing social entropy.' },
    { id: 'child_nurturing', label: 'Subject Maintenance', category: 'Physiology', character: 'Eve', description: 'Assisting in the development of new subjects.' },
    { id: 'fire_tending', label: 'Thermal Management', category: 'Management', character: 'Eve', description: 'Routines for maintaining thermal output.' },
    { id: 'eve_art', label: 'Visual Encoding (E)', category: 'Crafting', character: 'Eve', description: 'Encoding information through visual symbols.' },
    { id: 'eve_kama_sutra', label: 'Physical Synchronization', category: 'Physiology', character: 'Eve', description: 'Maximizing physical and neurological bonding.' },
    { id: 'eve_imagination', label: 'Scenario Simulation (E)', category: 'Neural', character: 'Eve', description: 'Projecting non-realized states in neural workspace.' },
    { id: 'eve_creativity', label: 'Innovation Protocol (E)', category: 'Crafting', character: 'Eve', description: 'Generation of new solutions for current problems.' },
    { id: 'eve_death_wisdom', label: 'Termination Registry', category: 'Neural', character: 'Eve', description: 'Processing of terminal state transitions.' },

    // --- Adam'S KNOWLEDGE ---
    { id: 'tracking', label: 'Trace Analysis', category: 'Harvesting', character: 'Adam', description: 'Identifying and pursuing biological targets.' },
    { id: 'stone_knapping', label: 'Lithic Engineering', category: 'Engineering', character: 'Adam', description: 'Refining mineral assets into tools.' },
    { id: 'spear_engineering', label: 'Tactical Engineering', category: 'Engineering', character: 'Adam', description: 'Developing long-range offensive tools.' },
    { id: 'atlatl', label: 'Kinetic Enhancer', category: 'Engineering', character: 'Adam', description: 'Mechanical advantage for projectile deployment.' },
    { id: 'star_navigation', label: 'Celestial Correlation', category: 'Navigation', character: 'Adam', description: 'Using stellar patterns for spatial orientation.' },
    { id: 'predator_tactics', label: 'Threat Mitigation', category: 'Combat', character: 'Adam', description: 'Behavioral analysis of high-risk entities.' },
    { id: 'adam_duty', label: 'Operational Role', category: 'Duty', character: 'Adam', description: 'Prioritization of system-critical objectives.' },
    { id: 'totem_animal', label: 'Neural Archetype', category: 'Neural', character: 'Adam', description: 'Primary behavioral pattern recognized in self.' },
    { id: 'adam_intuition', label: 'Predictive Heuristics (A)', category: 'Instinct', character: 'Adam', description: 'Heuristic-based pursuit vectors.' },
    { id: 'silence_mastery', label: 'Acoustic Optimization', category: 'Harvesting', character: 'Adam', description: 'Minimizing sound wave generation during approach.' },
    { id: 'pain_as_teacher', label: 'Stress Feedback', category: 'Physiology', character: 'Adam', description: 'Utilizing physiological damage as learning input.' },
    { id: 'night_watch', label: 'Darkness Surveillance', category: 'Duty', character: 'Adam', description: 'Maintaining status checks in low-light environments.' },
    { id: 'adam_art', label: 'Visual Encoding (A)', category: 'Crafting', character: 'Adam', description: 'Structural documentation of significant entities.' },
    { id: 'adam_kama_sutra', label: 'Physical Synchronization (A)', category: 'Physiology', character: 'Adam', description: 'Managing physical bonding and thermal exchange.' },
    { id: 'adam_imagination', label: 'Scenario Simulation (A)', category: 'Neural', character: 'Adam', description: 'Internal testing of tactical maneuvers.' },
    { id: 'adam_creativity', label: 'Innovation Protocol (A)', category: 'Engineering', character: 'Adam', description: 'Adaptation of tools for unconventional use.' },
    { id: 'adam_death_wisdom', label: 'Final State Analysis', category: 'Neural', character: 'Adam', description: 'Analysis of system termination inevitability.' },
    
    // --- SHARED ---
    { id: 'fire_mastery', label: 'Thermal Control', category: 'Management', character: 'Both', description: 'Global protocols for fire ignition and transport.' },
    { id: 'great_mother_belief', label: 'Origin Hypothesis', category: 'Neural', character: 'Both', description: 'Conceptual model of planetary-scale biological emergence.' },
    { id: 'tribe_survival', label: 'Collective Integrity', category: 'Social', character: 'Both', description: 'Prioritizing the persistence of the subject group.' },
    { id: 'shared_dreams', label: 'Synchronized Cognition', category: 'Neural', character: 'Both', description: 'Parallel processing and shared memory optimization.' },
  ],
  edges: [
    // Eve's Logic
    { source: 'moon_blood', target: 'birth_wisdom', relation: 'prepares' },
    { source: 'herbal_medicine', target: 'birth_wisdom', relation: 'supports' },
    { source: 'digging_stick', target: 'seed_selection', relation: 'enables' },
    { source: 'basket_weaving', target: 'seed_selection', relation: 'used_for' },
    { source: 'eve_intuition', target: 'herbal_medicine', relation: 'guides_selection' },
    { source: 'social_cohesion', target: 'tribe_survival', relation: 'strengthens_bonds' },
    { source: 'fire_tending', target: 'food_preservation', relation: 'enables_smoking' },
    { source: 'eve_imagination', target: 'eve_art', relation: 'inspires' },
    { source: 'eve_creativity', target: 'basket_weaving', relation: 'improves' },
    { source: 'eve_kama_sutra', target: 'tribe_survival', relation: 'strengthens_bonds' },
    { source: 'eve_death_wisdom', target: 'shared_dreams', relation: 'connects_to' },
    
    // Adam's Logic
    { source: 'stone_knapping', target: 'spear_engineering', relation: 'requires' },
    { source: 'spear_engineering', target: 'tracking', relation: 'enables_hunt' },
    { source: 'silence_mastery', target: 'tracking', relation: 'essential_for' },
    { source: 'adam_intuition', target: 'tracking', relation: 'refines' },
    { source: 'adam_duty', target: 'night_watch', relation: 'motivates' },
    { source: 'pain_as_teacher', target: 'adam_duty', relation: 'tempers' },
    { source: 'totem_animal', target: 'adam_intuition', relation: 'inspires' },
    { source: 'adam_imagination', target: 'adam_creativity', relation: 'enables' },
    { source: 'adam_creativity', target: 'spear_engineering', relation: 'improves' },
    { source: 'adam_kama_sutra', target: 'tribe_survival', relation: 'strengthens_bonds' },
    { source: 'adam_death_wisdom', target: 'adam_duty', relation: 'tempers' },
    
    // Shared/Cross-linked
    { source: 'fire_mastery', target: 'fire_tending', relation: 'passed_to' },
    { source: 'great_mother_belief', target: 'birth_wisdom', relation: 'inspires' },
    { source: 'great_mother_belief', target: 'totem_animal', relation: 'contextualizes' },
    { source: 'shared_dreams', target: 'eve_intuition', relation: 'informs' },
    { source: 'shared_dreams', target: 'adam_intuition', relation: 'warns' },
    { source: 'tribe_survival', target: 'child_nurturing', relation: 'requires' },
    { source: 'tribe_survival', target: 'adam_duty', relation: 'defines' },
    { source: 'food_preservation', target: 'tribe_survival', relation: 'ensures' },
  ]
};
