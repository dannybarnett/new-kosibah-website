/** Human labels for the `line` enum shared by gowns and brides. */
export const brideLineLabel = {
  couture: 'Couture',
  'asheyori-eji': 'Asheyori Eji',
  'mother-of-the-bride': 'Mother of the bride',
} as const;

export type BrideLine = keyof typeof brideLineLabel;
