const artworkRevisions = {
  "saiyan-247-gokus-truce": "/assets/cards/saiyan-247-gokus-truce.webp?v=57252bfb0615",
  "saiyan-248-gokus-plan": "/assets/cards/saiyan-248-gokus-plan.webp?v=6970d7090dd7",
  "saiyan-249-medic-kit": "/assets/cards/saiyan-249-medic-kit.webp?v=5de4932ccc80",
  "saiyan-250-chiaotzus-physical-defense": "/assets/cards/saiyan-250-chiaotzus-physical-defense.webp?v=375067ce09e3",
  "frieza-124-frieza-the-master": "/assets/cards/frieza-124-frieza-the-master.webp?v=740400df5f05",
  "frieza-125-super-saiyan-goku": "/assets/cards/frieza-125-super-saiyan-goku.webp?v=17a855048a48",
  "trunks-156-krillin-the-warrior": "/assets/cards/trunks-156-krillin-the-warrior.webp?v=006dc8ed27ed",
  "trunks-157-where-theres-life-theres-hope": "/assets/cards/trunks-157-where-theres-life-theres-hope.webp?v=79888889fe15",
  "trunks-158-villains-true-power": "/assets/cards/trunks-158-villains-true-power.webp?v=fb163e31750c",
  "trunks-159-goku-the-unbeatable": "/assets/cards/trunks-159-goku-the-unbeatable.webp?v=1e77569b0941",
  "trunks-160-king-cold-the-all-powerful": "/assets/cards/trunks-160-king-cold-the-all-powerful.webp?v=2f219da68e05",
  "android-124-the-hero-is-down": "/assets/cards/android-124-the-hero-is-down.webp?v=85e9026fe35c",
  "android-125-trunks-guardian-drill": "/assets/cards/android-125-trunks-guardian-drill.webp?v=81e32faa7aaf",
  "cell-157-z-warriors-gather": "/assets/cards/cell-157-z-warriors-gather.webp?v=a6a38bfae3ea",
  "cell-158-cell-s-presence": "/assets/cards/cell-158-cell-s-presence.webp?v=15f4a9a147bd",
  "cell-159-vegeta-the-revitalized": "/assets/cards/cell-159-vegeta-the-revitalized.webp?v=92827b4574ae",
  "cell-160-goku-the-all-powerful": "/assets/cards/cell-160-goku-the-all-powerful.webp?v=ac9d2b5a2d1c"
};

export function ultraRareMask(card) {
  const name = artworkRevisions[card.id] === card.image ? card.id : card.templateVersion === 3 ? "generic-v3" : "generic-v2";
  return `/card-effects/ultra-rare/${name}.svg`;
}
