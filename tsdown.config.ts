import { defineConfig } from 'tsdown'
import obfuscator from 'rollup-plugin-obfuscator'

export default defineConfig({
  entry: ['./src/index.ts'],
  outDir: './dist',
  dts: true,
  minify: true,
  plugins: [
    obfuscator({
        global: false,
        options: {
            compact: true,
            controlFlowFlattening: true,
            deadCodeInjection: true,
            debugProtection: true,
            debugProtectionInterval: 4000,
            disableConsoleOutput: true,
            sourceMap: true,
        },
        exclude: ['node_modules/**', '**/*.d.ts']
    })
  ]
})