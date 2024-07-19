export const subLabelFromSubSrc = (subSrc: string): string => {
  return (
    subSrc
      .replace(/\\/g, '/')
      .split('/')
      .pop()
      ?.split('.')[0]
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || 'Sub'
  );
};
