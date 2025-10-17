"use client";

import * as React from "react";
import Image, { ImageProps } from "next/image";

type Props = Omit<ImageProps, "src"> & {
  src?: string | null;
  fallback?: string;
};

export default function SafeImage({ src, fallback = "/tour.jpg", ...rest }: Props) {
  const [url, setUrl] = React.useState(src || fallback);
  React.useEffect(() => setUrl(src || fallback), [src, fallback]);

  return (
    <Image
      {...rest}
      src={url || fallback}
      // keep it simple; if it fails, swap to fallback
      onError={() => setUrl(fallback)}
      unoptimized={rest.unoptimized ?? true}
    />
  );
}
