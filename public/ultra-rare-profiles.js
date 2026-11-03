const artworkRevisions = {
  "saiyan-247-gokus-truce": "/assets/cards/saiyan-247-gokus-truce.webp?v=3eb08ff4f48a",
  "saiyan-248-gokus-plan": "/assets/cards/saiyan-248-gokus-plan.webp?v=ec63bd398039",
  "saiyan-249-medic-kit": "/assets/cards/saiyan-249-medic-kit.webp?v=e715bb1ddce1",
  "saiyan-250-chiaotzus-physical-defense": "/assets/cards/saiyan-250-chiaotzus-physical-defense.webp?v=208381501d08",
  "frieza-124-frieza-the-master": "/assets/cards/frieza-124-frieza-the-master.webp?v=bb275818870e",
  "frieza-125-super-saiyan-goku": "/assets/cards/frieza-125-super-saiyan-goku.webp?v=2cff19540842",
  "trunks-156-krillin-the-warrior": "/assets/cards/trunks-156-krillin-the-warrior.webp?v=21035fbfc2d6",
  "trunks-157-where-theres-life-theres-hope": "/assets/cards/trunks-157-where-theres-life-theres-hope.webp?v=861e33a688fb",
  "trunks-158-villains-true-power": "/assets/cards/trunks-158-villains-true-power.webp?v=bc6fa2ee08b1",
  "trunks-159-goku-the-unbeatable": "/assets/cards/trunks-159-goku-the-unbeatable.webp?v=9d9b32f2151c",
  "trunks-160-king-cold-the-all-powerful": "/assets/cards/trunks-160-king-cold-the-all-powerful.webp?v=1c0d7ba83f3e",
  "android-124-the-hero-is-down": "/assets/cards/android-124-the-hero-is-down.webp?v=a3807740c805",
  "android-125-trunks-guardian-drill": "/assets/cards/android-125-trunks-guardian-drill.webp?v=2319856dfd51",
  "cell-157-z-warriors-gather": "/assets/cards/cell-157-z-warriors-gather.webp?v=7c924f616943",
  "cell-158-cell-s-presence": "/assets/cards/cell-158-cell-s-presence.webp?v=da0540f4f20d",
  "cell-159-vegeta-the-revitalized": "/assets/cards/cell-159-vegeta-the-revitalized.webp?v=8158e1c120be",
  "cell-160-goku-the-all-powerful": "/assets/cards/cell-160-goku-the-all-powerful.webp?v=773ddc5e97cd"
};

export function ultraRareMask(card) {
  const name = artworkRevisions[card.id] === card.image ? card.id : card.templateVersion === 3 ? "generic-v3" : "generic-v2";
  return `/card-effects/ultra-rare/${name}.svg`;
}
