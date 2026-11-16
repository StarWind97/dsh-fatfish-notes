/** Local presentation only. Never serialize this into a note or repository. */
export declare const layouts: {
    readonly outline: "秩序工作台";
    readonly soft: "柔和分区";
    readonly ribbon: "横向导航";
    readonly dock: "侧轨资料台";
    readonly ink: "墨线书房";
    readonly tree: "目录树工作室";
    readonly island: "浮岛桌面";
    readonly archive: "边签档案";
};
export declare const palettes: {
    readonly native: "DSH 原生";
    readonly lilac: "柔紫";
    readonly mint: "青绿";
    readonly blue: "雾蓝";
    readonly amber: "暖砂";
    readonly rose: "莓红";
    readonly graphite: "石墨";
    readonly clearblue: "澄蓝";
    readonly pine: "松青";
    readonly inkwhite: "墨白";
};
export declare const cjkFonts: {
    readonly host: "跟随 DSH";
    readonly yahei: "微软雅黑";
    readonly deng: "等线";
    readonly song: "宋体";
    readonly kai: "楷体";
};
export declare const latinFonts: {
    readonly host: "跟随 DSH";
    readonly segoe: "Segoe UI";
    readonly arial: "Arial";
    readonly georgia: "Georgia";
    readonly times: "Times New Roman";
};
export interface Appearance {
    version: 1;
    layout: keyof typeof layouts;
    palette: keyof typeof palettes;
    contrast: 'standard' | 'soft' | 'strong';
    mode: 'host' | 'light' | 'dark';
    fontCjk: keyof typeof cjkFonts;
    fontLatin: keyof typeof latinFonts;
    reading: 'modern' | 'book' | 'mixed';
    size: 16 | 17 | 18 | 20;
    leading: 1.65 | 1.8 | 2;
    codeWeight: 300 | 400 | 500;
    codeSize: 12 | 14 | 16;
    codeWrap: boolean;
    codeLines: boolean;
    materials: 'bottom' | 'right';
    rightStyle: 'tabs' | 'stack';
    materialStyle: 'compact' | 'cards';
    pinned: boolean;
    tabs: boolean;
    density: 'compact' | 'balanced' | 'spacious';
}
export declare const defaultAppearance: Appearance;
export declare function appearanceValue(raw: unknown): Appearance;
export declare function parseAppearance(raw: string | null): Appearance;
export declare const appearanceKey = "dsh-fatfish-notes.private.paper.appearance.v1";
