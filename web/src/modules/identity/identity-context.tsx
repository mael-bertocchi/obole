import type { Maybe } from 'models';
import type { IdentityContextProps } from 'modules/identity/identity-models';
import { createContext } from 'react';

/**
 * @constant IdentityContext
 * @description The context sharing the portal's session with every page and app
 */
export const IdentityContext = createContext<Maybe<IdentityContextProps>>(null);
