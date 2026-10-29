import type { MessageKey } from 'modules/language/language-en';
import { t } from 'modules/language/language-service';
import type { JSX } from 'react';

/**
 * @constant EXAMPLES
 * @description What the tile suggests asking
 */
const EXAMPLES: readonly MessageKey[] = ['assistant.exampleSpending', 'assistant.exampleLog'];

/**
 * @function AssistantWidgetComponent
 * @description The assistant's tile on the home page: a few things to ask it
 *
 * @returns {JSX.Element} The widget
 */
function AssistantWidgetComponent(): JSX.Element {
    return (
        <div className='min-h-[118px]'>
            <p className='text-[13px] font-medium text-ink-secondary'>{t('assistant.tryAsking')}</p>
            <div className='mt-2 flex flex-col items-start gap-2'>
                {EXAMPLES.map((example) => (
                    <span key={example} className='rounded-2xl bg-fill px-3 py-1.5 text-[14px] text-ink'>{t(example)}</span>
                ))}
            </div>
        </div>
    );
}

export default AssistantWidgetComponent;
