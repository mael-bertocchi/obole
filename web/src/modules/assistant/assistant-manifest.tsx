import { Sparkles } from 'lucide-react';
import type { PortalApp } from 'modules/apps/apps-models';

/**
 * @constant assistant
 * @description The assistant: a conversation about the budget and the watchlist, which suggests changes for the owner
 * to confirm. Its code only loads once it is opened, or once its tile shows on the home page.
 */
export const assistant: PortalApp = {
    id: 'assistant',
    name: 'assistant.appName',
    summary: 'assistant.appSummary',
    icon: Sparkles,
    colors: ['#B48CFF', '#6E4BE8'],
    load: () => import('pages/assistant/assistant'),
    loadWidget: () => import('pages/assistant/assistant-widget/assistant-widget')
};
