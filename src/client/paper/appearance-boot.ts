/// <reference path="./appearance-assets.d.ts" />
import worker from 'fatfish:highlight-worker'
import font from '../../../assets/fonts/CascadiaCode-Latin-VF.woff2'
import {configureAppearanceAssets} from './appearance-assets.js'
configureAppearanceAssets(worker,font)
