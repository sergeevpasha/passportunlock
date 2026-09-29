export const iconPaths = {
  globe: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  diagonal: 'M7 17 17 7M8 7h9v9',
  plus: 'M12 5v14M5 12h14',
  close: 'm6 6 12 12M6 18 18 6',
  search: 'M15.5 15.5 20 20M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z',
  down: 'm7 10 5 5 5-5',
  share: 'M12 15V4m-4 4 4-4 4 4M6 12v8h12v-8',
  download: 'M12 4v11m-4-4 4 4 4-4M5 20h14',
  info: 'M12 11v5m0-8.5v.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  check: 'm5 12.5 4.2 4.2L19 7',
  clock: 'M12 7.5V12l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  passport:
    'M5 3h12a2 2 0 0 1 2 2v16H7a2 2 0 0 1-2-2V3Zm0 14h14M15 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM9 9h6m-3-3c2 2 2 4 0 6-2-2-2-4 0-6Z',
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  compare: 'M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4',
  ranking: 'M4 20V12h5v8m0 0V5h6v15m0 0V9h5v11M3 20h18',
  chip: 'M4 8h16v8H4zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM4 12h5m6 0h5',
} as const;
export type IconName = keyof typeof iconPaths;
