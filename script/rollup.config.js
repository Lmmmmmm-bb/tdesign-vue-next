// @ts-check
import { tmpdir } from 'os';
import url from '@rollup/plugin-url';
import json from '@rollup/plugin-json';
import alias from '@rollup/plugin-alias';
import babel from '@rollup/plugin-babel';
import vuePlugin from 'rollup-plugin-vue';
import postcss from 'rollup-plugin-postcss';
import replace from '@rollup/plugin-replace';
import analyzer from 'rollup-plugin-analyzer';
import { terser } from 'rollup-plugin-terser';
import commonjs from '@rollup/plugin-commonjs';
import { DEFAULT_EXTENSIONS } from '@babel/core';
import typescript from 'rollup-plugin-typescript2';
import multiInput from 'rollup-plugin-multi-input';
import nodeResolve from '@rollup/plugin-node-resolve';

import pkg from '../package.json';

const name = 'tdesign';
const externalDeps = Object.keys(pkg.dependencies || {});
const externalPeerDeps = Object.keys(pkg.peerDependencies || {});
const banner = `/**
 * ${name} v${pkg.version}
 * (c) ${new Date().getFullYear()} ${pkg.author}
 * @license ${pkg.license}
 */
`;
const input = 'src/dist.ts';
const inputList = [
  'src/**/**.ts',
  'src/**/**.tsx',
  '!src/{addon,menu,calendar,locale,table,upload,dropdown,transfer,time-picker,utils}/**',
  '!src/dist.ts',
  '!src/**/*.d.ts',
  '!src/**/demos',
  '!src/**/__tests__',
];

const getPlugins = ({
  env,
  isProd = false,
} = {}) => {
  const extensions = ['.js', '.ts'];
  const compilerOptions = isProd
    // 只生成一次
    ? {
      declaration: true,
      declarationMap: true,
      declarationDir: './typings',
    }
    : {};

  const plugins = [
    alias({
      entries: [
        { find: '@TdTypes', replacement: '@tencent/tdesign-types' },
      ],
      customResolver: nodeResolve({ extensions }),
    }),
    nodeResolve({ extensions }),
    vuePlugin(),
    commonjs(),
    typescript({
      cacheRoot: `${tmpdir()}/.rpt2_cache`,
      tsconfigOverride: { compilerOptions },
      useTsconfigDeclarationDir: true,
    }),
    babel({
      babelHelpers: 'bundled',
      extensions: [...DEFAULT_EXTENSIONS, '.vue', '.ts', '.tsx'],
    }),
    postcss({
      extract: `${isProd ? `${name}.min` : name}.css`,
      minimize: isProd,
      sourceMap: true,
      extensions: ['.sass', '.scss', '.css', '.less'],
    }),
    json(),
    url(),
    replace({
      preventAssignment: true,
      values: {
        __VERSION__: JSON.stringify(pkg.version),
      },
    }),
  ];

  if (env) {
    plugins.push(replace({
      preventAssignment: true,
      values: {
        'process.env.NODE_ENV': JSON.stringify(env),
      },
    }));
  }

  if (isProd) {
    plugins.push(terser({
      output: {
        /* eslint-disable */
        ascii_only: true,
        /* eslint-enable */
      },
    }));
  }

  return plugins;
};

/** @type {import('rollup').RollupOptions} */
const esmConfig = {
  input: inputList,
  external: externalDeps.concat(externalPeerDeps),
  plugins: [multiInput()].concat(getPlugins()),
  output: {
    banner,
    dir: 'es/',
    format: 'esm',
    sourcemap: true,
    chunkFileNames: '_chunks/dep-[hash].js',
  },
};

/** @type {import('rollup').RollupOptions} */
const cjsConfig = {
  input: inputList,
  external: externalDeps.concat(externalPeerDeps),
  plugins: [multiInput()].concat(getPlugins()),
  output: {
    banner,
    dir: 'lib/',
    format: 'cjs',
    sourcemap: true,
    exports: 'named',
    chunkFileNames: '_chunks/dep-[hash].js',
  },
};

/** @type {import('rollup').RollupOptions} */
const umdConfig = {
  input,
  external: externalPeerDeps,
  plugins: getPlugins({ env: 'development' })
    .concat(analyzer({
      limit: 5,
      summaryOnly: true,
    })),
  output: {
    name: 'TDesign',
    banner,
    format: 'umd',
    exports: 'named',
    globals: { vue: 'Vue', lodash: '_' },
    sourcemap: true,
    file: `dist/${name}.js`,
  },
};

/** @type {import('rollup').RollupOptions} */
const umdMinConfig = {
  input,
  external: externalPeerDeps,
  plugins: getPlugins({
    isProd: true,
    env: 'production',
  }),
  output: {
    name: 'TDesign',
    banner,
    format: 'umd',
    exports: 'named',
    globals: { vue: 'Vue', lodash: '_' },
    sourcemap: true,
    file: `dist/${name}.min.js`,
  },
};

export default [esmConfig, cjsConfig, umdConfig, umdMinConfig];
