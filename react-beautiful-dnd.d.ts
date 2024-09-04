// react-beautiful-dnd.d.ts

declare module 'react-beautiful-dnd';
import * as React from 'react';
  
export interface DraggableProvided {
    innerRef: (element?: HTMLElement | null) => any;
    draggableProps: {
    style: React.CSSProperties;
    [key: string]: any;
    };
    dragHandleProps: {
    [key: string]: any;
    } | null;
}

export interface DraggableStateSnapshot {
    isDragging: boolean;
    draggingOver: string | null;
}

export interface DroppableProvided {
    innerRef: (element?: HTMLElement | null) => any;
    droppableProps: {
    [key: string]: any;
    };
    placeholder?: React.ReactElement<any>;
}

export interface DroppableStateSnapshot {
    isDraggingOver: boolean;
    draggingOverWith: string | null;
}

export interface DraggableProps {
    draggableId: string;
    index: number;
    children: (
    provided: DraggableProvided,
    snapshot: DraggableStateSnapshot
    ) => React.ReactElement<any>;
}

export interface DroppableProps {
    droppableId: string;
    children: (
    provided: DroppableProvided,
    snapshot: DroppableStateSnapshot
    ) => React.ReactElement<any>;
}

export class Draggable extends React.Component<DraggableProps> {}
export class Droppable extends React.Component<DroppableProps> {}
export class DragDropContext extends React.Component {
    onDragEnd(result: any): void;
}

  