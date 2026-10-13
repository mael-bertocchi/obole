import { t } from 'modules/language/language-service';
import type { JSX } from 'react';

/**
 * @interface SpinnerComponentProps
 * @description Spinner properties
 */
interface SpinnerComponentProps {
    size?: number; /*!< Its diameter, in pixels */
}

/**
 * @function SpinnerComponent
 * @description A small activity indicator.
 *
 * @param {SpinnerComponentProps} props The properties of the component
 */
function SpinnerComponent(props: SpinnerComponentProps): JSX.Element {
    const size = props.size ?? 22;

    return (
        <span role='status' aria-label={t('common.loading')} className='inline-block animate-spin rounded-full border-[2.5px] border-fill-strong border-t-ink-tertiary' style={{ width: size, height: size }} />
    );
}

export default SpinnerComponent;
