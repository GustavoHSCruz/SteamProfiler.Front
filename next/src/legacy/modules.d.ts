declare module 'legacy:*' {
  import type { Env } from './env';
  const run: (env: Env) => void;
  export default run;
  export const shell: string;
  export const title: string | null;
  export const name: string;
}
