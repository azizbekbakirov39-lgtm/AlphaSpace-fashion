import React, { useState } from 'react';
import { getProxiedUrl, getNextProxyIndex, isLastProxy, markUrlAsSuccessful } from '../utils/mediaUtils';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  originalSrc: string;
  proxyStartIndex?: number;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({ 
  originalSrc, 
  proxyStartIndex = 0, 
  onLoad,
  onError,
  ...props 
}) => {
  const [proxyIndex, setProxyIndex] = useState(proxyStartIndex);
  const [hasError, setHasError] = useState(false);
  
  if (!originalSrc) return null;
  
  if (hasError) {
    return (
      <div className={`bg-[#171717] flex items-center justify-center ${props.className || ''}`} style={props.style}>
        <span className="text-white/20 text-[10px] font-black uppercase text-center px-2">Yuklanmadi</span>
      </div>
    );
  }

  const proxiedUrl = getProxiedUrl(originalSrc, proxyIndex);

  return (
    <img
      src={proxiedUrl}
      {...props}
      onLoad={(e) => {
        markUrlAsSuccessful(originalSrc, proxiedUrl);
        if (onLoad) onLoad(e);
      }}
      onError={(e) => {
        if (!isLastProxy(proxyIndex, originalSrc)) {
          setProxyIndex(prev => getNextProxyIndex(prev));
        } else {
          console.error('Final image load error, URL:', originalSrc);
          setHasError(true);
        }
        if (onError) onError(e);
      }}
    />
  );
};
