import { QuartzTransformerPlugin } from '@quartz-community/types';
export { QuartzTransformerPlugin } from '@quartz-community/types';

interface OxHugoOptions {
    /** Replace {{ relref }} with quartz wikilinks []() */
    wikilinks: boolean;
    /** Remove pre-defined anchor (see https://ox-hugo.scripter.co/doc/anchors/) */
    removePredefinedAnchor: boolean;
    /** Remove hugo shortcode syntax */
    removeHugoShortcode: boolean;
    /** Replace <figure/> with ![]() */
    replaceFigureWithMdImg: boolean;
    /** Replace org latex fragments with $ and $$ */
    replaceOrgLatex: boolean;
}
/**
 * ox-hugo is an org exporter backend that exports org files to hugo-compatible
 * markdown in an opinionated way. This plugin adds some tweaks to the generated
 * markdown to make it compatible with quartz but the list of changes applied it
 * is not exhaustive.
 * */
declare const OxHugoFlavouredMarkdown: QuartzTransformerPlugin<Partial<OxHugoOptions>>;

export { OxHugoFlavouredMarkdown, type OxHugoOptions };
