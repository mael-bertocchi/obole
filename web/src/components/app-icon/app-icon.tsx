import type { PortalApp } from 'modules/apps/apps-models';
import type { JSX } from 'react';

/**
 * @interface AppIconComponentProps
 * @description App icon properties
 */
interface AppIconComponentProps {
    app: PortalApp; /*!< The app */
    size?: number; /*!< Its side, in pixels */
}

/**
 * @function AppIconComponent
 * @description An app's icon: its glyph in white on its gradient, with the corners of an iOS icon.
 *
 * @param {AppIconComponentProps} props The properties of the component
 */
function AppIconComponent(props: AppIconComponentProps): JSX.Element {
    const size = props.size ?? 28;

    const Icon = props.app.icon;
    const [top, bottom] = props.app.colors;

    return (
        <span
            className='inline-flex shrink-0 items-center justify-center text-white shadow-[inset_0_0_0_0.5px_rgb(0_0_0/0.08)]'
            style={{ width: size, height: size, borderRadius: size * 0.235, backgroundImage: `linear-gradient(160deg, ${top}, ${bottom})` }}
            aria-hidden='true'
        >
            <Icon size={size * 0.55} strokeWidth={2} />
        </span>
    );
}

export default AppIconComponent;
