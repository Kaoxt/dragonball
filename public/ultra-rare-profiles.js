const artworkRevisions = {
  "saiyan-247-gokus-truce": "/assets/cards/saiyan-247-gokus-truce.webp?v=c28d026a4c42",
  "saiyan-248-gokus-plan": "/assets/cards/saiyan-248-gokus-plan.webp?v=e8508565a8c7",
  "saiyan-249-medic-kit": "/assets/cards/saiyan-249-medic-kit.webp?v=ba10ca88bdbc",
  "saiyan-250-chiaotzus-physical-defense": "/assets/cards/saiyan-250-chiaotzus-physical-defense.webp?v=bea787775e77",
  "frieza-124-frieza-the-master": "/assets/cards/frieza-124-frieza-the-master.webp?v=740400df5f05",
  "frieza-125-super-saiyan-goku": "/assets/cards/frieza-125-super-saiyan-goku.webp?v=17a855048a48",
  "trunks-156-krillin-the-warrior": "/assets/cards/trunks-156-krillin-the-warrior.webp?v=006dc8ed27ed",
  "trunks-157-where-theres-life-theres-hope": "/assets/cards/trunks-157-where-theres-life-theres-hope.webp?v=4a390dcb2e98",
  "trunks-158-villains-true-power": "/assets/cards/trunks-158-villains-true-power.webp?v=5291d310c795",
  "trunks-159-goku-the-unbeatable": "/assets/cards/trunks-159-goku-the-unbeatable.webp?v=1e77569b0941",
  "trunks-160-king-cold-the-all-powerful": "/assets/cards/trunks-160-king-cold-the-all-powerful.webp?v=2f219da68e05",
  "android-124-the-hero-is-down": "/assets/cards/android-124-the-hero-is-down.webp?v=05ba32c1c09f",
  "android-125-trunks-guardian-drill": "/assets/cards/android-125-trunks-guardian-drill.webp?v=204acf6e8701",
  "cell-157-z-warriors-gather": "/assets/cards/cell-157-z-warriors-gather.webp?v=466533d4e5a3",
  "cell-158-cell-s-presence": "/assets/cards/cell-158-cell-s-presence.webp?v=d028f783797e",
  "cell-159-vegeta-the-revitalized": "/assets/cards/cell-159-vegeta-the-revitalized.webp?v=92827b4574ae",
  "cell-160-goku-the-all-powerful": "/assets/cards/cell-160-goku-the-all-powerful.webp?v=ac9d2b5a2d1c"
};

export function ultraRareMask(card) {
  const name = artworkRevisions[card.id] === card.image ? card.id : card.templateVersion === 3 ? "generic-v3" : "generic-v2";
  return `/card-effects/ultra-rare/${name}.svg`;
}
