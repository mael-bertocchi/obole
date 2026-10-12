import type { JSX } from 'react';

/**
 * @interface SwitchComponentProps
 * @description An on/off toggle.
 */
interface SwitchComponentProps {
    checked: boolean; /*!< Whether it is on */
    onChange: (checked: boolean) => void; /*!< Called with the new state */
    label: string; /*!< What it toggles, for assistive technologies */
}

/**
 * @function SwitchComponent
 * @description An iOS-style switch.
 *
 * @param {SwitchComponentProps} props The properties of the component
 */
function SwitchComponent(props: SwitchComponentProps): JSX.Element {
    return (
        <button
            type='button'
            role='switch'
            aria-checked={props.checked}
            aria-label={props.label}
            onClick={() => props.onChange(!props.checked)}
            className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 ${props.checked ? 'bg-accent' : 'bg-ink-quaternary/45'}`}
        >
            <span
                className={`absolute left-[2px] top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_3px_8px_rgb(0_0_0/0.15),0_1px_1px_rgb(0_0_0/0.16)] transition-transform duration-200 ${props.checked ? 'translate-x-5' : ''}`}
            />
        </button>
    );
}

export default SwitchComponent;
