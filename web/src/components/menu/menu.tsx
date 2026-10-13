import { useEffect, useRef, useState, type JSX, type ReactNode } from 'react';

/**
 * @interface MenuComponentProps
 * @description A button opening a small panel under it.
 */
interface MenuComponentProps {
    label: string; /*!< What the button does, for screen readers */
    trigger: ReactNode; /*!< What the button shows */
    triggerClassName: string; /*!< How the button looks */
    panelClassName?: string; /*!< How the panel is sized */
    children: (close: () => void) => ReactNode; /*!< The panel's content, handed a way to close it */
}

/**
 * @function MenuComponent
 * @description A popover for the account and app menus: it opens under its button, aligned on its right edge, and
 * closes on a click anywhere else, on Escape, or when one of its items closes it.
 *
 * @param {MenuComponentProps} props The properties of the component
 */
function MenuComponent(props: MenuComponentProps): JSX.Element {
    const panelClassName = props.panelClassName ?? 'w-64';

    const [isOpen, setIsOpen] = useState(false);
    const root = useRef<HTMLDivElement>(null);
    const button = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        /**
         * @function closeOutside
         * @description Closes the panel on a click anywhere outside the menu
         */
        const closeOutside = (event: PointerEvent): void => {
            if (root.current !== null && event.target instanceof Node && !root.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        /**
         * @function closeOnEscape
         * @description Closes the panel on Escape and gives the focus back to its button
         */
        const closeOnEscape = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') {
                setIsOpen(false);
                button.current?.focus();
            }
        };

        window.addEventListener('pointerdown', closeOutside);
        window.addEventListener('keydown', closeOnEscape);

        return () => {
            window.removeEventListener('pointerdown', closeOutside);
            window.removeEventListener('keydown', closeOnEscape);
        };
    }, [isOpen]);

    return (
        <div ref={root} className='relative'>
            <button ref={button} type='button' aria-label={props.label} aria-expanded={isOpen} aria-haspopup='menu' onClick={() => setIsOpen(!isOpen)} className={props.triggerClassName}>
                {props.trigger}
            </button>
            {isOpen && (
                <div role='menu' className={`absolute right-0 top-full z-40 mt-2 origin-top-right animate-rise overflow-hidden rounded-[20px] bg-white/95 p-2 shadow-sheet ring-1 ring-hairline backdrop-blur-xl ${panelClassName}`}>
                    {props.children(() => setIsOpen(false))}
                </div>
            )}
        </div>
    );
}

export default MenuComponent;
