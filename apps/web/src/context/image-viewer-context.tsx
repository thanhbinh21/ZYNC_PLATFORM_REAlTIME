"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ImageViewer } from '@/components/home-dashboard/molecules/image-viewer';

type ViewerParams = {
  imageUrl: string;
  senderAvatar?: string;
  senderDisplayName?: string;
  createdAt?: string;
};

type ImageViewerContextValue = {
  openViewer: (params: ViewerParams) => void;
  closeViewer: () => void;
};

const ImageViewerContext = createContext<ImageViewerContextValue>({
  openViewer: () => {},
  closeViewer: () => {},
});

export function ImageViewerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ViewerParams>({ imageUrl: '' });

  const openViewer = (params: ViewerParams) => {
    setState(params);
    setOpen(true);
  };

  const closeViewer = () => setOpen(false);

  return (
    <ImageViewerContext.Provider value={{ openViewer, closeViewer }}>
      {children}
      <ImageViewer
        open={open}
        imageUrl={state.imageUrl || ''}
        senderAvatar={state.senderAvatar}
        senderDisplayName={state.senderDisplayName}
        createdAt={state.createdAt}
        onClose={closeViewer}
      />
    </ImageViewerContext.Provider>
  );
}

export function useImageViewer() {
  return useContext(ImageViewerContext);
}
