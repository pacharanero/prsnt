export type Slide = {
  id: string;
  url: string;
};

export type Presentation = {
  id: string;
  title: string;
  slides: Slide[];
  currentIndex: number;
  zoomLevel: number;
};

export type RemoteStatus = {
  slide: number;
  total: number;
  presenting: boolean;
  url: string;
};

export type RemoteCommandType =
  | 'next'
  | 'prev'
  | 'play'
  | 'stop'
  | 'zoomin'
  | 'zoomout'
  | 'zoomreset'
  | 'scroll';

export type RemoteCommand = {
  type: RemoteCommandType;
  dy?: number;
};
