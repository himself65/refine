import { join, dirname } from 'node:path'
import type { StorybookConfig } from '@storybook/react-vite'

function getAbsolutePath (value: string) {
  return dirname(require.resolve(join(value, 'package.json')))
}

const config: StorybookConfig = {
  stories: ['../src/stories/**/*.mdx', '../src/stories/**/*.stories.tsx'],
  addons: [
    getAbsolutePath('@storybook/addon-links'),
    getAbsolutePath('@storybook/addon-essentials'),
    getAbsolutePath('@storybook/addon-interactions'),
    getAbsolutePath('@storybook/addon-coverage')
  ],
  framework: {
    name: getAbsolutePath('@storybook/react-vite') as '@storybook/react-vite',
    options: {
      builder: {
        viteConfigPath: './vite.config.ts'
      }
    }
  },
  docs: {
    autodocs: 'tag'
  }
}
export default config
