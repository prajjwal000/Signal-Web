export enum WidthBreakpoint {
  Wide = 'wide',
  Narrow = 'narrow',
}

export function getWidthBreakpoint(width: number): WidthBreakpoint {
  return width >= 200 ? WidthBreakpoint.Wide : WidthBreakpoint.Narrow;
}

export type PanelMode = 'closed' | 'new-chat' | 'new-group-select' | 'new-group-name' | 'search';
