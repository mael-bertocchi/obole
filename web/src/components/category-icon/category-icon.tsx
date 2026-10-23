import IconTileComponent from 'components/icon-tile/icon-tile';
import {
    BriefcaseMedical,
    CircleDashed,
    Coffee,
    FileText,
    Film,
    GraduationCap,
    House,
    ShoppingBag,
    ShoppingCart,
    Tag,
    TramFront,
    UtensilsCrossed,
    Wifi,
    Wine,
    type LucideIcon
} from 'lucide-react';
import { hexColor } from 'modules/budget/budget-categories';
import type { Category } from 'modules/budget/budget-models';
import type { JSX } from 'react';

/**
 * @constant SYMBOL_ICONS
 * @description The icon standing in for each SF Symbol the app draws a category with.
 */
const SYMBOL_ICONS: Readonly<Record<string, LucideIcon>> = {
    'cart': ShoppingCart,
    'fork.knife': UtensilsCrossed,
    'wineglass': Wine,
    'cup.and.saucer': Coffee,
    'tram': TramFront,
    'bag': ShoppingBag,
    'film': Film,
    'cross.case': BriefcaseMedical,
    'graduationcap': GraduationCap,
    'doc.text': FileText,
    'wifi': Wifi,
    'circle.dashed': CircleDashed,
    'house': House
};

/**
 * @interface CategoryIconComponentProps
 * @description Category icon properties
 */
interface CategoryIconComponentProps {
    category: Category; /*!< The category */
    size?: number; /*!< The tile's side, in pixels */
}

/**
 * @function CategoryIconComponent
 * @description A category's tile, in its colour.
 *
 * @param {CategoryIconComponentProps} props The properties of the component
 */
function CategoryIconComponent(props: CategoryIconComponentProps): JSX.Element {
    return (
        <IconTileComponent icon={SYMBOL_ICONS[props.category.symbol] ?? Tag} color={hexColor(props.category.colorHex)} size={props.size} />
    );
}

export default CategoryIconComponent;
