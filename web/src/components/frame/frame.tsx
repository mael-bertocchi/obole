import AlertComponent from 'components/alert/alert';
import AppIconComponent from 'components/app-icon/app-icon';
import LogoComponent from 'components/logo/logo';
import MenuComponent from 'components/menu/menu';
import { Grip, LogOut, Settings, type LucideIcon } from 'lucide-react';
import type { PortalApp } from 'modules/apps/apps-models';
import { APPS, appPath } from 'modules/apps/apps-registry';
import { useIdentityContext } from 'modules/identity/identity-hooks';
import type { IdentityContextProps } from 'modules/identity/identity-models';
import type { MessageKey } from 'modules/language/language-en';
import { t } from 'modules/language/language-service';
import { useEffect, useState, type JSX, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';

/**
 * @interface FrameTab
 * @description One of an app's tabs.
 */
export interface FrameTab {
    to: string; /*!< Its path */
    label: MessageKey; /*!< Its name */
    icon: LucideIcon; /*!< Its icon on a phone's tab bar */
    end?: boolean; /*!< Whether it is only current on its exact path, for the tab at the app's root */
}

/**
 * @interface FrameComponentProps
 * @description What the portal's frame holds.
 */
interface FrameComponentProps {
    app?: PortalApp; /*!< The app shown, none on the portal's own pages */
    tabs?: readonly FrameTab[]; /*!< The app's tabs */
    action?: ReactNode; /*!< The app's main action, beside the menus */
    children: ReactNode; /*!< The page */
}

/**
 * @function LauncherMenuComponent
 * @description The app switcher: the home page and every app, as a grid of icons.
 */
function LauncherMenuComponent(): JSX.Element {
    const tile = 'flex flex-col items-center gap-1.5 rounded-2xl px-1 py-3 text-[12px] font-medium text-ink transition hover:bg-fill';

    return (
        <MenuComponent
            label={t('frame.apps')}
            trigger={<Grip size={18} strokeWidth={2.2} />}
            triggerClassName='flex h-9 w-9 items-center justify-center rounded-full text-ink-secondary transition hover:bg-fill-strong/70 hover:text-ink aria-expanded:bg-fill-strong/70 aria-expanded:text-ink'
            panelClassName='w-72'
        >
            {(close) => (
                <nav className='grid grid-cols-3 gap-1' aria-label={t('frame.apps')}>
                    <Link
                        to='/'
                        onClick={close}
                        className={tile}
                        role='menuitem'
                    >
                        <LogoComponent size={44} />
                        {t('frame.home')}
                    </Link>
                    {APPS.map((app) => (
                        <Link
                            key={app.id}
                            to={appPath(app)}
                            onClick={close}
                            className={tile}
                            role='menuitem'
                        >
                            <AppIconComponent app={app} size={44} />
                            {t(app.name)}
                        </Link>
                    ))}
                </nav>
            )}
        </MenuComponent>
    );
}

/**
 * @function AccountMenuComponent
 * @description The owner's initial in a circle, opening the account settings and signing out.
 */
function AccountMenuComponent(): JSX.Element {
    const { account, signOut }: IdentityContextProps = useIdentityContext();
    const [isConfirming, setIsConfirming] = useState(false);
    const initial = account?.name.trim().charAt(0).toLocaleUpperCase() ?? '';
    const item = 'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] transition hover:bg-fill';

    return (
        <>
            <MenuComponent
                label={t('frame.account')}
                trigger={initial}
                triggerClassName='flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-b from-[#A1A1A8] to-[#7C7C84] text-[15px] font-semibold text-white shadow-control transition hover:brightness-105'
            >
                {(close) => (
                    <>
                        {account !== null && (
                            <div className='border-b border-hairline px-3 pb-3 pt-2'>
                                <p className='text-[15px] font-semibold'>{account.name}</p>
                                <p className='text-[13px] text-ink-secondary'>Obole</p>
                            </div>
                        )}
                        <div className='pt-1.5'>
                            <Link
                                to='/account'
                                onClick={close}
                                className={item}
                                role='menuitem'
                            >
                                <Settings size={18} className='text-ink-secondary' />
                                {t('frame.accountSettings')}
                            </Link>
                            <button
                                type='button'
                                role='menuitem'
                                onClick={() => {
                                    close();
                                    setIsConfirming(true);
                                }}
                                className={`${item} text-negative-text`}
                            >
                                <LogOut size={18} />
                                {t('frame.signOut')}
                            </button>
                        </div>
                    </>
                )}
            </MenuComponent>
            <AlertComponent
                open={isConfirming}
                title={t('account.confirmSignOut')}
                message={t('account.signOutMessage')}
                action={t('account.signOut')}
                onConfirm={() => {
                    setIsConfirming(false);
                    void signOut();
                }}
                onCancel={() => setIsConfirming(false)}
            />
        </>
    );
}

/**
 * @function FrameComponent
 * @description The portal's frame around every page: a bar the colour of the page with the app's name on the left, its
 * tabs as a segmented control in the middle, and its action, the app switcher and the account menu on the right. It only
 * draws its bottom rule once the page scrolls under it, like an iOS navigation bar. On a phone the tabs move to a tab bar
 * along the bottom edge.
 *
 * @param {FrameComponentProps} props The properties of the component
 */
function FrameComponent(props: FrameComponentProps): JSX.Element {
    const tabs = props.tabs ?? [];

    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        /**
         * @function update
         * @description Notes whether the page is scrolled under the bar
         */
        const update = (): void => setIsScrolled(window.scrollY > 0);

        update();
        window.addEventListener('scroll', update, { passive: true });

        return () => window.removeEventListener('scroll', update);
    }, []);

    return (
        <>
            <header
                className={`sticky top-0 z-30 border-b bg-canvas/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl backdrop-saturate-150 transition-colors duration-200 ${isScrolled ? 'border-hairline' : 'border-transparent'}`}
            >
                <div className='mx-auto grid h-14 max-w-5xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 sm:px-8'>
                    <Link
                        to={props.app === undefined ? '/' : appPath(props.app)}
                        className='flex items-center gap-2.5 justify-self-start rounded-lg'
                    >
                        {props.app === undefined ? (
                            <LogoComponent size={28} />
                        ) : <AppIconComponent app={props.app} size={28} />}
                        <span className='text-[17px] font-semibold tracking-tight'>
                            {props.app === undefined ? 'Obole' : t(props.app.name)}
                        </span>
                    </Link>

                    {tabs.length > 0 && (
                        <nav
                            className='hidden rounded-full bg-fill-strong/80 p-1 sm:flex'
                            aria-label={t('frame.sections')}
                        >
                            {tabs.map(({ to, label, end }) => (
                                <NavLink
                                    key={to}
                                    to={to}
                                    end={end}
                                    className={({ isActive }) => `rounded-full px-4 py-1.5 text-[14px] font-medium transition ${isActive ? 'bg-white text-ink shadow-control' : 'text-ink-secondary hover:text-ink'}`}
                                >
                                    {t(label)}
                                </NavLink>
                            ))}
                        </nav>
                    )}

                    <div className='col-start-3 flex items-center gap-1.5 justify-self-end sm:gap-2'>
                        {props.action}
                        <LauncherMenuComponent />
                        <AccountMenuComponent />
                    </div>
                </div>
            </header>

            <main
                className={`mx-auto max-w-5xl px-5 pt-8 sm:px-8 sm:pb-16 sm:pt-10 ${tabs.length > 0 ? 'pb-28' : 'pb-12'}`}
            >
                {props.children}
            </main>

            {tabs.length > 0 && (
                <nav
                    className='fixed inset-x-0 bottom-0 z-30 grid border-t border-hairline bg-canvas/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl backdrop-saturate-150 sm:hidden'
                    style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
                    aria-label={t('frame.sections')}
                >
                    {tabs.map(({ to, label, icon: Icon, end }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={end}
                            className={({ isActive }) => `flex flex-col items-center gap-0.5 pb-1.5 pt-2 text-[11px] font-medium ${isActive ? 'text-accent' : 'text-ink-tertiary'}`}
                        >
                            <Icon size={23} strokeWidth={2} />
                            {t(label)}
                        </NavLink>
                    ))}
                </nav>
            )}
        </>
    );
}

export default FrameComponent;
