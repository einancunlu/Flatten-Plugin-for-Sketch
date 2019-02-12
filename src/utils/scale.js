import { UI } from 'sketch'
import { maxFlatteningScale, minFlatteningScale } from './constants'

export function checkScale(scale) {
  if (scale > maxFlatteningScale)
    UI.message(
      `⚠️ 'Flattening scale can't be bigger than ${maxFlatteningScale}. It's been converted to ${maxFlatteningScale}.`
    )
  if (scale < minFlatteningScale)
    UI.message(
      `⚠️ 'Flattening scale can't be smaller than ${minFlatteningScale} It's been converted to ${minFlatteningScale}.`
    )
  scale = Math.min(scale, maxFlatteningScale)
  scale = Math.max(scale, minFlatteningScale)
  return scale
}
