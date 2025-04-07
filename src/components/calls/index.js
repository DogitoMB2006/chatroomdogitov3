// index.js - Archivo de barril para exportar todos los componentes
// Coloca este archivo en la carpeta components/calls/

// Componente principal
export { default as RoomHandler } from './RoomHandler';

// Componentes de UI
export { default as VideoContainer } from './VideoContainer';
export { default as LocalVideo } from './LocalVideo';
export { default as RemoteVideo } from './RemoteVideo';
export { default as CallControls } from './CallControls';
export { default as StatusIndicator } from './StatusIndicator';
export { default as DebugInfo } from './DebugInfo';

// No es necesario exportar los utilitarios, ya que se usarán solo internamente