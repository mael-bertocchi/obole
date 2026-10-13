import { Plus, type LucideIcon } from 'lucide-react';
import type { JSX } from 'react';

/**
 * @interface FrameActionComponentProps
 * @description An app's main action in the portal's bar
 */
interface FrameActionComponentProps {
    label: string; /*!< What it does */
    onClick: () => void; /*!< Called when it is tapped */
    icon?: LucideIcon; /*!< Its glyph, a plus unless told otherwise */
}

/**
 * @function FrameActionComponent
 * @description An app's main action in the portal's bar, the same in every app: a round accent button with its glyph,
 * spelled out once the bar is wide enough to hold it beside the tabs, and only the glyph below that
 *
 * @param {FrameActionComponentProps} props The properties of the component
 */
function FrameActionComponent(props: FrameActionComponentProps): JSX.Element {
    const Icon = props.icon ?? Plus;

    return (
        <button type='button' onClick={props.onClick} aria-label={props.label} className='flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-accent px-2.5 text-[14px] font-semibold text-white transition hover:bg-accent-strong active:scale-95 lg:pl-3 lg:pr-4'>
            <Icon size={18} strokeWidth={2.6} />
            <span className='hidden lg:inline'>{props.label}</span>
        </button>
    );
}

export default FrameActionComponent;
