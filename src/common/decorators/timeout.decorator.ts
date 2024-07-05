import { SetMetadata } from '@nestjs/common';

export const TIMEOUT_KEY = 'timeout';
export const Timeout = (milliseconds: number) => SetMetadata(TIMEOUT_KEY, milliseconds);
