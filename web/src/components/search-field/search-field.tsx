import { Search, X } from 'lucide-react';
import { useEffect, useRef, type JSX } from 'react';

/**
 * @interface SearchFieldComponentProps
 * @description What a search field holds and does
 */
interface SearchFieldComponentProps {
    value: string; /*!< What is searched */
    onChange: (value: string) => void; /*!< Called as it is typed, and with nothing once cleared */
    placeholder: string; /*!< What to search for, shown while it is empty */
    clearLabel: string; /*!< The clear button's name, for those who can't see it */
    label?: string; /*!< Its name, for those who can't see it, when the placeholder doesn't say enough */
    hasFocus?: boolean; /*!< Whether it takes the focus as it shows, to type at once */
    className?: string; /*!< Its margins */
}

/**
 * @function SearchFieldComponent
 * @description A search field like the iOS one: a magnifier, a grey rounded field turning white with focus, and a clear
 * button once something is typed
 *
 * @param {SearchFieldComponentProps} props The properties of the component
 */
function SearchFieldComponent(props: SearchFieldComponentProps): JSX.Element {
    const input = useRef<HTMLInputElement>(null);
    const hasFocus = props.hasFocus ?? false;

    useEffect(() => {
        if (hasFocus) {
            input.current?.focus();
        }
    }, [hasFocus]);

    return (
        <label className={`relative block ${props.className ?? ''}`}>
            <Search size={17} className='pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-tertiary' />
            <input ref={input} type='search' value={props.value} onChange={(event) => props.onChange(event.target.value)} placeholder={props.placeholder} aria-label={props.label} className='h-11 w-full rounded-xl bg-fill-strong/70 pl-10 pr-10 text-[16px] outline-none transition placeholder:text-ink-tertiary focus:bg-white focus:shadow-control focus:ring-2 focus:ring-accent/40 [&::-webkit-search-cancel-button]:hidden' />
            {props.value !== '' && (
                <button type='button' aria-label={props.clearLabel} onClick={() => props.onChange('')} className='absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-ink-quaternary text-white'>
                    <X size={12} strokeWidth={3} />
                </button>
            )}
        </label>
    );
}

export default SearchFieldComponent;
