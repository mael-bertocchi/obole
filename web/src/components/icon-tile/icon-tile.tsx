import type { LucideIcon } from 'lucide-react';
import type { JSX } from 'react';

/**
 * @interface IconTileComponentProps
 * @description What an icon tile shows.
 */
interface IconTileComponentProps {
    icon: LucideIcon; /*!< The glyph */
    color: string; /*!< The tile's colour */
    size?: number; /*!< The tile's side, in pixels */
}

/**
 * @function IconTileComponent
 * @description A white glyph on a rounded coloured tile, like the icons of the iOS Settings app.
 *
 * @param {IconTileComponentProps} props The properties of the component
 */
function IconTileComponent(props: IconTileComponentProps): JSX.Element {
    const Icon = props.icon;
    const size = props.size ?? 36;

    return (
        <span className='inline-flex shrink-0 items-center justify-center text-white' style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: props.color }} aria-hidden='true'>
            <Icon size={size * 0.52} strokeWidth={2.1} />
        </span>
    );
}

export default IconTileComponent;
