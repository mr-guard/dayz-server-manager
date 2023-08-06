import { IconName } from "@fortawesome/fontawesome-svg-core";

export interface Breadcrumb {
    text: string;
    link?: string;
    active?: boolean;
}

export interface SBRouteData {
    title?: string;
    activeTopNav?: string;
    breadcrumbs: Breadcrumb[];
}

export interface SideNavItems {
    // eslint-disable-next-line no-use-before-define
    [index: string]: SideNavItem;
}

export interface SideNavItem {
    icon?: IconName;
    text: string;
    link?: string;
    submenu?: SideNavItem[];
}

export interface SideNavSection {
    text?: string;
    items: string[];
}
