import type { Maybe } from 'models';
import type { ToastContextProps } from 'modules/toast/toast-models';
import { createContext } from 'react';

/**
 * @constant ToastContext
 * @description The context letting any page show a short message
 */
export const ToastContext = createContext<Maybe<ToastContextProps>>(null);
