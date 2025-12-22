import React, { useState, ImgHTMLAttributes } from 'react';

const DEFAULT_AVATAR = "https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff";

type Props = ImgHTMLAttributes<HTMLImageElement> & {
  src?: string | null;
  alt?: string;
};

export default function Avatar({ src, alt = '', ...rest }: Props) {
  const [current, setCurrent] = useState<string | undefined>(
    src || DEFAULT_AVATAR
  );

  return (
    <img
      {...rest}
      src={current}
      alt={alt}
      onError={() => setCurrent(DEFAULT_AVATAR)}
    />
  );
}
