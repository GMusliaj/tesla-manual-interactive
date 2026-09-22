import {existsSync} from 'node:fs';
export const requiresModel={skip:existsSync(new URL('../public/models/juniper.glb',import.meta.url))?false:'Optional licensed model is intentionally excluded from the public repository.'};
