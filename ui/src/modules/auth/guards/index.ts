import { AuthGuard, LoginGuard } from './auth.guard';

export const guards = [AuthGuard, LoginGuard];

export * from './auth.guard';
