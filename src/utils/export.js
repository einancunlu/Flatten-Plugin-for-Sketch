/* globals MSExportRequest */

import * as sketch from 'sketch'
import * as fs from '@skpm/fs'
import { kDefaultFlattenScaleKey, scaleTagPrefix } from './constants'
import { getImageLayer } from './index'
import { checkScale } from './scale'

const regexString = `${scaleTagPrefix}(\\d{1}[\\,\\.]?\\d{0,2})`
const regex = new RegExp(regexString, 'g')
function getScaleFromName(name) {
  const match = regex.exec(name)
  if (match && match.length === 2) {
    return parseFloat(match[1].replace(',', '.'))
  }
  return undefined
}

export default function exportLayerToPath(layer, folderPath) {
  let scale = sketch.Settings.settingForKey(kDefaultFlattenScaleKey) || 1

  // Check if there is a custom scale tag
  let nameToCheck = ''
  if (layer.type === 'Artboard') {
    const imageLayer = getImageLayer(layer)
    if (imageLayer) {
      nameToCheck = imageLayer.name
    }
  } else {
    nameToCheck = layer.name
  }

  const potentialScale = getScaleFromName(nameToCheck)
  if (potentialScale) {
    scale = checkScale(potentialScale)
  }

  // Export layer
  if (layer.type === 'Artboard') {
    const originalLayerName = layer.name
    layer.name = 'temp'
    sketch.export(layer, {
      trimmed: false,
      output: folderPath,
      scales: scale,
      formats: 'png',
    })
    layer.name = originalLayerName
  } else {
    // TODO: pretty sure we don't need MSExportRequest here
    const { parent } = layer
    const slice = sketch.Slice({
      frame: parent.frame,
      exportFormats: [
        {
          fileFormat: 'png',
          size: scale,
        },
      ],
    })
    parent.sketchObject.insertLayer_atIndex(slice.sketchObject, layer.index + 1)
    slice.sketchObject.exportOptions().setLayerOptions(2)
    const exportRequests = MSExportRequest.exportRequestsFromExportableLayer(
      slice
    )
    const path = `${folderPath}/${layer.id}.png`
    sketch
      .getSelectedDocument()
      .sketchObject.saveExportRequest_toFile(exportRequests[0], path)
    slice.removeFromParent()
  }

  // Return the exported file path
  const imageFileName = fs.readdirSync(folderPath)[0]
  return `${folderPath}/${imageFileName}`
}
