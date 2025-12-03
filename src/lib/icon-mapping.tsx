import { IconType } from 'react-icons';
import { 
    SiJavascript, SiReact, SiTypescript, SiHtml5, SiCss3, SiSass, SiLess, SiJson, 
    SiXml, SiYaml, SiPython, SiC, SiCplusplus, SiSharp, SiGo, SiRust, 
    SiPhp, SiRuby, SiPerl, SiGnubash, SiSwift, SiKotlin, 
    SiGit, SiDart, SiVuedotjs, SiSvelte, SiAstro, 
    SiSolidity, SiLua, SiPrisma, SiGradle, SiOpengl, SiMarkdown, SiDocker, SiGithub,
    SiElixir, SiErlang, SiHaskell, SiScala, SiClojure, SiOcaml,
    SiZig, SiNim, SiCrystal, SiJulia, SiR, SiLatex, SiFortran,
    SiAngular, SiTailwindcss, SiPostcss, SiGraphql,
    SiWebassembly, SiCoffeescript, SiPug, SiHandlebarsdotjs, SiEjs,
    SiTerraform, SiAnsible, SiKubernetes, SiHelm,
    SiJenkins, SiCircleci, SiPostgresql, SiMysql
} from 'react-icons/si';
import { FaJava, FaWindows, FaDatabase, FaCode } from 'react-icons/fa';
import { 
    MdFolder, MdFolderOpen, MdInsertDriveFile, MdSettings, MdCheck, MdCheckBox, 
    MdCheckBoxOutlineBlank, MdSearch, MdClose, MdAdd, MdDelete, MdContentCopy, 
    MdChevronRight, MdViewList, MdAccountTree, MdArrowUpward, MdArrowDownward, 
    MdTune, MdCode, MdExpandMore, MdMenu, MdWarning, MdMinimize, MdNetworkCheck, 
    MdDownload, MdTimer, MdSpeed, MdUpload, MdCheckCircle, MdLock, MdDescription, 
    MdGridOn, MdImage, MdTerminal
} from 'react-icons/md';
import { VscRegex } from 'react-icons/vsc';
import { TbFileTypeSql } from 'react-icons/tb';
import { BiLogoFlutter } from 'react-icons/bi';

export const EXTENSION_ICON_MAP: Record<string, IconType> = {
    // JavaScript / TypeScript ecosystem
    js: SiJavascript,
    mjs: SiJavascript,
    cjs: SiJavascript,
    jsx: SiReact,
    ts: SiTypescript,
    mts: SiTypescript,
    cts: SiTypescript,
    tsx: SiReact,
    
    // Web fundamentals
    html: SiHtml5,
    htm: SiHtml5,
    xhtml: SiHtml5,
    css: SiCss3,
    scss: SiSass,
    sass: SiSass,
    less: SiLess,
    styl: SiCss3,
    stylus: SiCss3,
    pcss: SiPostcss,
    postcss: SiPostcss,
    tailwind: SiTailwindcss,
    
    // Data formats
    json: SiJson,
    jsonc: SiJson,
    json5: SiJson,
    xml: SiXml,
    xsl: SiXml,
    xslt: SiXml,
    yaml: SiYaml,
    yml: SiYaml,
    toml: MdSettings,
    csv: MdGridOn,
    tsv: MdGridOn,
    
    // Python
    py: SiPython,
    pyw: SiPython,
    pyx: SiPython,
    pxd: SiPython,
    pyi: SiPython,
    ipynb: SiPython,
    
    // Java / JVM
    java: FaJava,
    kt: SiKotlin,
    kts: SiKotlin,
    scala: SiScala,
    sc: SiScala,
    groovy: SiGradle,
    gradle: SiGradle,
    clj: SiClojure,
    cljs: SiClojure,
    cljc: SiClojure,
    edn: SiClojure,
    
    // C family
    c: SiC,
    h: SiC,
    cpp: SiCplusplus,
    cc: SiCplusplus,
    cxx: SiCplusplus,
    hpp: SiCplusplus,
    hh: SiCplusplus,
    hxx: SiCplusplus,
    cs: SiSharp,
    csx: SiSharp,
    
    // Systems programming
    go: SiGo,
    mod: SiGo,
    sum: SiGo,
    rs: SiRust,
    zig: SiZig,
    nim: SiNim,
    cr: SiCrystal,
    
    // Functional languages
    hs: SiHaskell,
    lhs: SiHaskell,
    ml: SiOcaml,
    mli: SiOcaml,
    fs: SiSharp,
    fsx: SiSharp,
    fsi: SiSharp,
    ex: SiElixir,
    exs: SiElixir,
    eex: SiElixir,
    heex: SiElixir,
    erl: SiErlang,
    hrl: SiErlang,
    
    // Scientific / Data Science
    r: SiR,
    rmd: SiR,
    jl: SiJulia,
    m: FaCode,
    mat: FaCode,
    f: SiFortran,
    f90: SiFortran,
    f95: SiFortran,
    for: SiFortran,
    
    // Web scripting
    php: SiPhp,
    phtml: SiPhp,
    php3: SiPhp,
    php4: SiPhp,
    php5: SiPhp,
    php7: SiPhp,
    phps: SiPhp,
    rb: SiRuby,
    erb: SiRuby,
    rake: SiRuby,
    gemspec: SiRuby,
    pl: SiPerl,
    pm: SiPerl,
    pod: SiPerl,
    t: SiPerl,
    lua: SiLua,
    
    // Shell / Scripts
    sh: SiGnubash,
    bash: SiGnubash,
    zsh: SiGnubash,
    fish: SiGnubash,
    ksh: SiGnubash,
    csh: SiGnubash,
    tcsh: SiGnubash,
    bat: FaWindows,
    cmd: FaWindows,
    ps1: FaWindows,
    psm1: FaWindows,
    psd1: FaWindows,
    
    // Mobile
    swift: SiSwift,
    dart: SiDart,
    arb: SiDart,
    flutter: BiLogoFlutter,
    
    // Frontend frameworks
    vue: SiVuedotjs,
    svelte: SiSvelte,
    astro: SiAstro,
    angular: SiAngular,
    
    // Template engines
    pug: SiPug,
    jade: SiPug,
    hbs: SiHandlebarsdotjs,
    handlebars: SiHandlebarsdotjs,
    mustache: SiHandlebarsdotjs,
    ejs: SiEjs,
    njk: MdCode,
    nunjucks: MdCode,
    twig: MdCode,
    liquid: MdCode,
    
    // Transpiled languages
    coffee: SiCoffeescript,
    litcoffee: SiCoffeescript,
    
    // WebAssembly
    wasm: SiWebassembly,
    wat: SiWebassembly,
    wast: SiWebassembly,
    
    // Blockchain
    sol: SiSolidity,
    vy: SiPython,
    
    // Database / Query
    sql: TbFileTypeSql,
    mysql: SiMysql,
    pgsql: SiPostgresql,
    plsql: FaDatabase,
    prisma: SiPrisma,
    graphql: SiGraphql,
    gql: SiGraphql,
    
    // Config files
    config: MdSettings,
    cfg: MdSettings,
    ini: MdSettings,
    env: MdSettings,
    properties: MdSettings,
    prop: MdSettings,
    conf: MdSettings,
    htaccess: MdSettings,
    editorconfig: MdSettings,
    
    // Git
    gitignore: SiGit,
    gitattributes: SiGit,
    gitmodules: SiGit,
    gitkeep: SiGit,
    
    // DevOps / Infrastructure
    dockerfile: SiDocker,
    docker: SiDocker,
    tf: SiTerraform,
    tfvars: SiTerraform,
    hcl: SiTerraform,
    ansible: SiAnsible,
    helm: SiHelm,
    k8s: SiKubernetes,
    
    // CI/CD
    jenkinsfile: SiJenkins,
    circleci: SiCircleci,
    
    // Documentation
    md: SiMarkdown,
    mdx: SiMarkdown,
    markdown: SiMarkdown,
    rst: MdDescription,
    adoc: MdDescription,
    asciidoc: MdDescription,
    txt: MdDescription,
    log: MdDescription,
    license: MdDescription,
    
    // LaTeX
    tex: SiLatex,
    latex: SiLatex,
    bib: SiLatex,
    
    // Graphics / Shaders
    glsl: SiOpengl,
    vert: SiOpengl,
    frag: SiOpengl,
    hlsl: SiOpengl,
    shader: SiOpengl,
    
    // Assembly
    asm: FaCode,
    s: FaCode,
    nasm: FaCode,
    
    // Misc
    lock: MdLock,
    regex: VscRegex,
    
    // Makefile and build
    makefile: MdTerminal,
    mk: MdTerminal,
    cmake: MdTerminal,
    meson: MdTerminal,
    ninja: MdTerminal,
};

export const UI_ICONS_MAP = {
    folder: MdFolder,
    folder_open: MdFolderOpen,
    default_file: MdInsertDriveFile,
    settings: MdSettings,
    check: MdCheck,
    check_box: MdCheckBox,
    check_box_outline_blank: MdCheckBoxOutlineBlank,
    search: MdSearch,
    close: MdClose,
    add: MdAdd,
    delete: MdDelete,
    copy: MdContentCopy,
    chevron_right: MdChevronRight,
    view_list: MdViewList,
    view_tree: MdAccountTree,
    arrow_up: MdArrowUpward,
    arrow_down: MdArrowDownward,
    tune: MdTune,
    code: MdCode,
    expand_more: MdExpandMore,
    menu: MdMenu,
    warning: MdWarning,
    minimize: MdMinimize,
    network: MdNetworkCheck,
    download: MdDownload,
    timer: MdTimer,
    speed: MdSpeed,
    upload: MdUpload,
    check_circle: MdCheckCircle,
    image: MdImage,
    terminal: MdTerminal,
    git: SiGit,
    github: SiGithub,
    readme: SiMarkdown,
    lock: MdLock,
};

export const getIconForExtension = (ext: string): IconType => {
    return EXTENSION_ICON_MAP[ext.toLowerCase()] || MdInsertDriveFile;
};
