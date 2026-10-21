/**
 * Shared styling for controls where one option is selected: status tabs,
 * view switches, range filters.
 *
 * Primary is reserved for actions, so selection reads as a raised chip on
 * the card surface. It cannot be `secondary` either: that token resolves to
 * the same value as `muted`, so a selected item would be indistinguishable
 * from whichever one the pointer is hovering.
 */
export const segmentedTrack =
  "inline-flex flex-wrap items-center gap-0.5 rounded-lg bg-muted p-0.5";

export function segmentedItem(selected: boolean): string {
  // A chip inside a rounded-lg track takes the track's radius less its 2px
  // padding, which is rounded-md.
  const shape = "rounded-md";
  return selected
    ? `${shape} bg-card text-foreground shadow-sm hover:bg-card`
    : `${shape} text-muted-foreground hover:bg-transparent hover:text-foreground`;
}
